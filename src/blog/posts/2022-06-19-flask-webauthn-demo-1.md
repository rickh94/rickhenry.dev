---
# @formatter:off
title: Fully Passwordless Authentication with Flask and Webauthn (Part 1)
snippet: Setting up the environment
description:  WebAuthn provides a new way for user to authenticate without passwords. Here's how I made it work with the popular Flask Framework
pinned: false
date: 2022-06-19 18:18:00Z
# @formatter:on
---

*In this series of posts, I'm going to build WebAuthn biometric authentication into a Flask app. 
[You can try it out here](https://flask-webauthn.rickhenry.dev). The source code is also available 
[on my github](https://github.com/rickh94/flask-webauthn-demo/tree/part-7-notifications).


## Motivations

I've always been fascinated but authentication and security, but, like many, I've always hated
passwords. I encountered fingerprint authentication on my Mac on eBay and thought it was the coolest
thing ever. When Apple talked about Passkeys this year at WWDC, I figured that it was going mainstream,
and it was time to figure out how it works. Here's what I figured out

## Tools

I went with [Flask](https://flask.palletsprojects.com/en/2.1.x/) because it's
popular and straightforward, and I could keep the project small and focus on what I was trying to do. The rest of the
core tools are [PostgreSQL](https://www.postgresql.org) and [Redis](https://redis.io) for persistent and temporary
storage. I tied it all together on my laptop with [Docker](https://www.docker.com) and Docker Compose. Other than those,
I sprinkled in a few of my favorites for improving the UX and UI: [tailwindcss](https://tailwindcss.com)
and [htmx](https://htmx.org/). Tailwind is a css framework that makes building beautiful websites very fast. What I've
made isn't amazing, but I'd rather not create a total eyesore. HTMX is a super cool way to manipulate the UI from the
server with minimal javascript and avoiding the dreaded full page reload. Both are worth checking out.

For the WebAuthn side, I'm using the Python [WebAuthn](https://pypi.org/project/webauthn/) package
and [SimpleWebAuthn](https://simplewebauthn.dev/) on the javascript side. Don't roll your own crypto kids.

I managed the python dependencies with [poetry](https://python-poetry.org), so there's a `pyproject.toml` and the
Dockerfile with assume that poetry was used.

Last we are going to use [ngrok](https://ngrok.com/) to get a real url with SSL (required for WebAuthn) for testing.
I find this much easier than configuring self-signed certificates. One site at a time is free.

## Getting Started

First we need a Flask app. I'm going to stick all the source code inside
an `app` directory so the `docker-compose.yml` isn't next to it. I'm not going into
setting up python and a flask app here. Install flask and create:

##### app/app.py

```python
from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    return "Hello, World"

```

You should probably `flask run` to make sure everything is working.

## User and Credential Storage

WebAuthn requires a mix of persistent and ephemeral storage.

#### Persistent

Obviously user accounts need to be persisted to the database or this is all pointless. We will also need to store some
credentials in the database to validate the WebAuthn logins from certain users. We will be using
PostgreSQL as the database and [SQLAlchemy](https://www.sqlalchemy.org/) to access it. This is pretty standard
for Flask apps.

#### Ephemeral

We will also need to store some secrets temporarily. WebAuthn issues a challenge with each use, to prevent
replay attacks. We will need to store the issued challenge, so it can be validated later. I'm also throwing in
some email-based passwordless authentication, and we'll need to store some hashed secrets for that. You could
probably just store these in a dictionary, but I think Redis provides a cleaner solution.

### Packages

Install the [Flask-SQLAlchemy](https://pypi.org/project/Flask-SQLAlchemy/),
[psycopg2-binary](https://pypi.org/project/psycopg2-binary/) and [redis](https://pypi.org/project/redis/)
so that we will be able to connect with our storage from Python. Also install
[Flask-Migrate](https://pypi.org/project/Flask-Migrate/) to help with database migrations.

## Infrastructure

Let's set up the docker infrastructure now and ensure it is working, then we can get into the good stuff. We'll use
[waitress](https://pypi.org/project/waitress/) to serve the Flask app since that's the current recommendation, but
I doubt that it matters much which wsgi server you use. We're also going to install the
[wait-for-it](https://github.com/vishnubob/wait-for-it) debian package to keep the app from starting before the
database is up.

##### app/Dockerfile

```dockerfile
FROM python:3.10

RUN apt-get update
RUN apt-get install -y wait-for-it
RUN pip install poetry
RUN pip install waitress
ADD . /app
WORKDIR /app
RUN poetry export -o requirements.txt
RUN pip install -r requirements.txt

CMD sh ./entrypoint.sh
```

In the entrypoint file, we'll wait for the database, run the latest migrations, then start the server.

##### app/entrypoint.sh

```bash
#!/usr/bin/env bash
wait-for-it -t 10 db:5432 && \
flask db upgrade && \
waitress-serve --host 0.0.0.0 --port 5000 app:app
```

Make sure to change the permissions of the entrypoint file so that it is executable (`chmod +x app/entrypoint.sh` on
unix-like systems).

Finally, the docker-compose file to tie it all together. This file goes in the top level, not in the `app` directory.
You should *probably* have a `.env` file with your database credentials and redis password, but I'm going to punt on
that and be lazy and put them in the compose file. You **definitely** should keep the secret key out of it. It's just a
demo. We'll make the app source directory a volume, so
you don't have to rebuild on every change.

##### docker-compose.yml

```yaml
version: '3'
services:
  app:
    build:
      context: app
    environment:
      DATABASE_URL: 'postgresql://databaseuser:supersecretdbpassword@db:5432/app'
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: 'supersecretredispassword'
      SECRET_KEY: 'supersecretrandomkeythatsreallysecure'
    volumes:
      - ./app:/app
    ports:
      - "5000:5000"
    depends_on:
      - db
      - redis

  db:
    image: postgres:latest
    environment:
      POSTGRES_USER: 'databaseuser'
      POSTGRES_PASSWORD: 'supersecretdbpassword'
      POSTGRES_DB: 'app'

  redis:
    image: redis:latest
    command: redis-server --requirepass 'supersecretredispassword'
```

## SQLAlchemy Setup

We'll quickly do some setup for SQLAlchemy to make Flask-Migrate work, then we can finally `docker compose up` and
get into the real work. We'll create a new `models.py` file in the `app` directory to eventually house our models.

##### app/models.py

```python
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()

```

Now update the `app.py` file to set up the database and migrations. Add imports for `os` and `Migrate` as well as
importing the `db` object we created in `models.py`. We will initialize it with configuration pulled from the
environment (as set in `docker-compose.yml`) and tell Flask-Migrate where the migrations will be. While we're here,
let's add the secret key so that we can use the Flask session object in the future.

##### app/app.py

```python 
import os

from flask import Flask
from flask_migrate import Migrate

from models import db

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')


db.init_app(app)
Migrate(app, db)


@app.route("/")
def index():
    return "Hello, world!"

```

### Setup Migrations

Now from within your project environment you can run `flask db init` to create the migrations folder (make sure this
gets committed to version control.)

## Initial Setup Complete

Finally, you can run `docker compose up -d` to build the app and get it online. Then you can go to
[http://localhost:5000](http://localhost:5000) and should see our hello world page.

![Hello, world!](/assets/img/blog/2022/06/flask-webauthn-hello-world.png "It works!")

Now, in another window run `ngrok http 5000` and navigate to the url it shows, being sure to use https. Make sure to
leave this window open or run it in the background with tmux or screen. Now you have a secure version of your website
that won't make the browsers complain.

## Now things get interesting

This was an annoying amount of setup, but this is a fairly complex process that requires some infrastructure. I promise
at the end, when you get a browser to simply ask for your fingerprint to sign in, it will all be worth it.

Once these steps are complete, the project
should [look like this](https://github.com/rickh94/flask-webauthn-demo/tree/part-1-setup).

The good stuff is coming now, but this is really long. Head over to
[Part 2](/blog/posts/2022-06-19-flask-webauthn-demo-2) to start building a website!
