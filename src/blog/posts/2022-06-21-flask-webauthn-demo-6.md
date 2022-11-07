---
# @formatter:off
title: Fully Passwordless Authentication with Flask and Webauthn (Part 6)
snippet: Email-Based Login
description:  WebAuthn provides a new way for user to authenticate without passwords. Here's how I made it work with the popular Flask Framework
pinned: false
date: 2022-06-21 10:26:00Z
# @formatter:on
---

*This picks up from [Part 5](/blog/posts/2022-06-20-flask-webauthn-demo-5). You'll be lost without it.
[This](https://github.com/rickh94/flask-webauthn-demo/tree/part-5-flask-login) is where we left off with the
codebase.*

## Email Based Login
Our users need some way to log in on devices other than the one they originally registered on, so we'll use email based
passwordless authentication for that. It's basically the same as a password reset flow. We'll send the user a link
that will log them in automatically. Then they can set up a WebAuthn Credential to use in the future (or not, if they 
choose). 

As convenient as it would be to send a link like `https://example.com/login?user=user123&auth=pretty-please-log-me-in`,
that doesn't seem that secure. In that case, we'll need a secret of some kind that we store. You could probably just
stick this secret in Redis and be fine, I'd rather hash it for extra paranoia. We'll need use 
[Argon2](https://pypi.org/project/argon2-cffi/) since that seems to be the favorite at the moment. Install 
`argon2-cffi` to the project.

We also need to be able to send email, and I struggled to find a library I liked. The standard seems to be
[Flask-Mail](https://pypi.org/project/Flask-Mail), but that appears to be unmaintained for many years. 
[Flask-Mailman](https://pypi.org/project/flask-mailman/) looks promising, but our needs are so simple, I've settled
on just using `smtplib` from the python standard library. I'm going to just use [Mailtrap](https://mailtrap.io), which
is specifically designed for use in development. I'd switch to something like [Mailgun](https://www.mailgun.com/) for
production, so we can actually send real email.

We now have real credentials accessing external resources so these should *definitely not* just be in the 
`docker-compose.yml`. I'll put then in a `.env` file and include it in the docker environment.

##### .env.example
```shell
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_SERVER=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_FROM="Flask WebAuthn <flask.webauthn@rickhenry.dev>"
```

##### docker-compose.yml
```yaml
version: '3'
services:
  app:
    build:
      context: app
    env_file:
      - .env
# ... snip ...
```
Put the username and password from Mailtrap in the `.env` file.

Let's also use Flask's app configuration api to make these values available globally.


##### app/app.py
```python
# ... snip ...
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
app.config["MAIL_SERVER"] = os.getenv("MAIL_SERVER")
app.config["MAIL_PORT"] = int(os.getenv("MAIL_PORT"))
app.config["MAIL_FROM"] = os.getenv("MAIL_FROM")
# ... snip ...
```

Now we'll create a `send_email` convenience function in `auth/util.py`. We will need Flask's `current_app` object to
get the configuration values we set, as well as `smtplib`, `ssl`, and a couple classes from the `email` module from the 
standard library.

##### app/auth/util.py
```python
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import make_response, request, current_app
# ... snip ...

def send_email(to, subject, body_text, body_html=None):
    """Utility function for sending email with smtplib"""
    mail_from = current_app.config["MAIL_FROM"]
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = mail_from
    message["To"] = to
    part1 = MIMEText(body_text, "plain")
    message.attach(part1)
    if body_html:
        part2 = MIMEText(body_html, "html")
        message.attach(part2)
    context = ssl.create_default_context()
    with smtplib.SMTP(
        current_app.config["MAIL_SERVER"], current_app.config["MAIL_PORT"]
    ) as server:
        server.starttls(context=context)
        server.login(
            current_app.config["MAIL_USERNAME"], current_app.config["MAIL_PASSWORD"]
        )
        server.sendmail(mail_from, to, message.as_string())

```

This was actually quite annoying to get working. Email is kinda picky about line breaks and spaces, so we're much better
off using python's `email` package to build it rather than trying to just build the string as recommended on Mailtrap's
page. This snippet is adapted from 
[an article on Real Python](https://realpython.com/python-send-email/#sending-fancy-emails). As always, it's an 
incredible resource.


### Generating a Unique Login URL
We'll need to generate a secret and store the hash, so it's time for another redis db! For a urlsafe secret, python has
the very helpful `secrets.token_urlsafe()`. Isn't python great? We're also going to need `PasswordHasher` from the 
`argon2` library we installed. We'll use Flask's `url_for` to generate the actual link.

##### app/auth/security.py
```python
import secrets

# ... snip ...

from argon2 import PasswordHasher
from flask import request, url_for

# ... snip ...
EMAIL_AUTH_SECRETS = Redis(
    host=REDIS_HOST, port=REDIS_PORT, db=2, password=REDIS_PASSWORD
)

# ... snip ...
ph = PasswordHasher() 


def generate_magic_link(user_uid):
    """Generate a special secret link to log in a user and save a hash of the secret."""
    url_secret = secrets.token_urlsafe()
    secret_hash = ph.hash(url_secret)
    EMAIL_AUTH_SECRETS.set(user_uid, secret_hash)
    EMAIL_AUTH_SECRETS.expire(user_uid, datetime.timedelta(minutes=10))
    return url_for("auth.magic_link", secret=url_secret, _external=True, _scheme="https")

```

Here we just generate a secret, hash and save it, then use Flask's url_for to generate the link. We're using 
`_external=True` to generate a full URL instead of a relative one, and `_scheme="https"` to use a secure connection.

### Views for Login by Email
First we need a route to request logging in by email. This will generate the link and send the email, then give the
user a message to remind them to check their email and come back. Then we need to deal with the magic link, validate it,
and log in the user.

##### app/auth/views.py

```python
@auth.route("/email-login")
def email_login():
    """Request login by emailed link."""
    user_uid = session.get("login_user_uid")
    user = User.query.filter_by(uid=user_uid).first()

    # This is probably impossible, but seems like useful protection
    if not user:
        res = make_response(
            render_template(
                "auth/_partials/username_form.html", error="No matching user found."
            )
        )
        session.pop("login_user_uid", None)
        return res
    login_url = security.generate_magic_link(user.uid)
    util.send_email(
        user.email,
        "Flask WebAuthn Login",
        "Click or copy this link to log in. You must use the same browser that "
        f"you were using when you requested to log in. {login_url}",
    )
    res = make_response(render_template("auth/_partials/email_login_message.html"))
    res.set_cookie(
        "magic_link_user_uid",
        user.uid,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=datetime.timedelta(minutes=15),
    )
    return res
```

We're getting the `user_uid` from the session, generating a URL with the security function we wrote,
then sending an email with the email function we wrote. Then we send back a message to check their email
and set a cookie with the `user_uid` so we can identify them when they come back with the login link. You could
just put this in the link itself, but this is more restrictive, so I like it. We need the `email_login_message`
template and a way to actually invoke this function.

##### app/auth/templates/auth/_partials/email_login_message.html
{% raw %}
```html
<h1 class="font-bold text-2xl">Check Your Email!</h1>
<p class=" mt-4text-xl">You should have an email with a link you can click to login
  automatically. Make sure that the link will open in this browser on this device, or
  copy the link in. It will not work anywhere else. Once you're logged in, you can
  enable biometric login to make future visits as fast and secure as possible.
</p>
```
{% endraw %}

We'll add a button to the `select_login` screen to select email login. It will `hx-get` the endpoint we just created,
we'll set `hx-target` to `#page-content` to swap out the main content and leave the nav bar, and we'll set `hx-swap`
to `innerHTML` so it just replaces inside the `main` element (this is in `base.html`).

##### app/auth/templates/auth/_partials/select_login.html
{% raw %}
```html
<!-- snip -->
<div class="flex space-x-2">
  <a
      hx-get="{{ url_for('auth.email_login') }}"
      hx-target="#page-content"
      hx-swap="innerHTML"
      class="text-white uppercase font-bold bg-orange-600 cursor-pointer px-4 py-2 rounded"
  >
    Email Login
  </a>
  <button
      class="text-white uppercase font-bold bg-green-600 px-4 py-2 rounded"
      id="start-login"
  >
    Device Login
  </button>
<!-- snip -->
```
{% endraw %}

Now we need to handle logging in a user when they click the link we sent. This means we'll also need a security function
to validate the link against the hash we saved.


##### app/auth/security.py
```python
# ... snip ...

def verify_magic_link(user_uid, secret):
    """Verify the secret from a magic login link against the saved hash for that 
    user."""
    secret_hash = EMAIL_AUTH_SECRETS.get(user_uid)
    if ph.verify(secret_hash, secret):
        EMAIL_AUTH_SECRETS.expire(user_uid, datetime.timedelta(seconds=1))
        return True
    return False
```

Now the view function to handle the request.

##### app/auth/views.py
```python
# ... snip ...
@auth.route("/magic-link")
def magic_link():
    """Handle incoming magic link authentications."""
    url_secret = request.args.get("secret")
    user_uid = request.cookies.get("magic_link_user_uid")
    user = User.query.filter_by(uid=user_uid).first()
    
    if not user:
        return redirect(url_for("auth.login"))
    
    if security.verify_magic_link(user_uid, url_secret):
        login_user(user)
        return redirect(url_for("auth.user_profile"))
    
    return redirect(url_for("auth.login"))

```

We get the user_uid cookie, find the user, then try to validate the secret from the link. If it works, the user is 
logged in and sent to their profile, if not, they're sent back to the login page. We don't delete the cookie here
so that if they copied the link wrong or used an old link, they can try again. The cookie and link will expire within
a few minutes anyway. This should now all be functioning. If you, like me, used mailtrap, you'll need to go to their 
website where it will catch all outgoing email.

<figure>
    <video width="636" height="720" controls>
        <source src="/assets/img/blog/2022/06/flask-webauthn-demo-login-with-email-1.mp4" type="video/mp4">
        Your browser does not support the video tag
    </video>
    <figcaption>Hey look we're logged in</figcaption>
</figure>


## Adding a new credential

If the user has used email-based login, there's a good chance they don't have a WebAuthn credential registered for 
the device they are using. Let's offer to register a new credential on the profile page any time a user logs in by 
email.


### Remembering the login type
We can track whether a user logged in with WebAuthn on the session object. We'll go update anywhere we called 
`login_user` and set whether it was a WebAuthn login on `session["used_webauthn"]`. We'll also change this value after
a user registers a credential. We need to update four view functions.

##### app/auth/views.py
```python
# ... snip ...

@auth.route("/create-user", methods=["POST"])
def create_user():
    # ... snip ...
    login_user(user)
    session['used_webauthn'] = False
    
# ... snip ...
@auth.route("/add-credential", methods=["POST"])
@login_required
def add_credential():
    """Receive a newly registered credentials to validate and save."""
    registration_credential = RegistrationCredential.parse_raw(request.get_data())
    try:
        security.verify_and_save_credential(current_user, registration_credential)
        session['used_webauthn'] = True

# ... snip ...
@auth.route("/verify-login-credential", methods=["POST"])
def verify_login_credential():
    # ... snip ...
    try:
        security.verify_authentication_credential(user, authentication_credential)
        login_user(user)
        session['used_webauthn'] = True
# ... snip ...

@auth.route("/magic-link")
def magic_link():
    # ... snip ...
    if security.verify_magic_link(user_uid, url_secret):
        login_user(user)
        session['used_webauthn'] = False

# ... snip ...
```

Now that we have that information stored, we can access it in the user_profile template and conditionally show a link
to a credential setup page that we will create.

##### app/auth/templates/auth/user_profile.html
{% raw %}
```html
<!-- snip -->

<div>
  <strong class="font-bold">Registered
    Credentials:</strong> {{ current_user.credentials | length }}
</div>
{% if not session.get("used_webauthn") %}
<div class="flex flex-col" id="webauthn_registration_section">
  <p class="italic">It doesn't look like you have passwordless login set up on
    this device. If you plan on logging in from here in the future, you can set
    one up now. Only do this if you are using your own personal device.</p>
  <div class="mt-4">
    <a
        hx-get="{{ url_for('auth.create_credential') }}"
        hx-target="#webauthn_registration_section"
        hx-swap="innerHTML"
        class="text-white uppercase font-bold bg-blue-600 px-4 py-2 rounded cursor-pointer hover:bg-blue-700 shadow hover:shadow-lg"
    >Start Setup</a>
  </div>
</div>
{% endif %}
</div>
{% endblock content %}
```
{% endraw %}


We will use htmx to swap in the same `register-credential` partial we used before. Obviously this route should be 
protected.

##### app/auth/views.py
```python 
# ... snip ... 

@auth.route('/create-credential')
@login_required
def create_credential():
    """Start creation of new credentials by existing users."""
    pcco_json = security.prepare_credential_creation(current_user)
    return make_response(
        render_template(
            "auth/_partials/register_credential.html",
            public_credential_creation_options=pcco_json,
        )
    )
```

This will trigger a full page reload when it's complete (which we could fix in javascript). All the code from before 
is reusable, largely thanks to htmx, so this is all quite simple to implement.

<figure>
    <video width="636" height="720" controls>
        <source src="/assets/img/blog/2022/06/flask-webauthn-demo-email-login-with-credential-creation.mp4" type="video/mp4">
        Your browser does not support the video tag
    </video>
    <figcaption>See the Registered Credentials go up?</figcaption>
</figure>


As far as functionality, this is everything I want. Slick biometric authentication with a backup option for new devices
and no passwords ever. A *little* more work on the developer side, but so worth it to not have to worry about password 
management. And it's so cool.

[Here's where we are with the codebase](https://github.com/rickh94/flask-webauthn-demo/tree/part-6-email-login)

Honestly the only problem is that we really don't give much feedback to the user, and it's not *that* pretty. (I mean
also I'm using fake email, but just change the smtp settings and that's fixed). I'll clean it up in 
[the final part](/blog/posts/2022-06-21-flask-webauthn-demo-7), and it's the least necessary yet.
