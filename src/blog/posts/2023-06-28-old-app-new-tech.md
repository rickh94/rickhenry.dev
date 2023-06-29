---
# @formatter:off
title: Building an Old-Style Web App with New Technologies
snippet: A CRUD app with Actix Web, Sqlite, and HTMX
description: The old way of building web applications was simpler and a better developer experience, so how can we avoid the dreaded full-page reload?
pinned: false
date: 2023-06-28 19:46:00Z
# @formatter:on
---

# Silly Goals

The final site is [Silly Goals](https://sillygoals.com). It's basically a goal
tracker/kanban application but more whimsical. Check it out, see how it feels. 
There are no fancy deployments here. It's running in a docker container along
with a few other applications on a free server in some Oracle Datacenter.
(OCI gives you two free VPSs, who knew?)
You can also look at the [finished code](https://github.com/rickh94/silly-goals).

This is what I used to build a modern-feeling web application, but sticking to
my goals of simplicity and writing **as little JavaScript as possible**.

## Just a CRUD App with forms, but in Rust

I really like Rust. I still spend a fair amount of time fighting with the
compiler, but as soon as I switch to another language like JavaScript of Python,
I miss the compiler immediately. Python and JavaScript are so incredibly happy
to run your incorrect code. This leads beginners to think of these languages
as "easy" or "simple." Rust is "harder," but my program is so much more likely
to be correct by the time it compiles, I really think I end up spending less
time tracking down bugs.

### Actix Web

[Actix Web](https://actix.rs) is quite a nice, though minimal, web framework.
The documentation could arguably be more… detailed, but it's flexible, has
a very nice dependency model, and helps you ensure type safety throughout
your application. It's a lot like using the [Flask](https://flask.palletsprojects.com/)
framework, but faster, type-safe, and asynchronous. The official extensions are
great, or just build your own stuff as needed. It does all your usual routing
in a nice way. I built the application at first in just a normal
Get-Post-Redirect style, handling all the routes and forms and session data
using actix for all the boring web management stuff, gradually adding features
as I needed them.

### SQLx

To ORM or not to ORM…anyway [SQLx](https://lib.rs/sqlx) is a great library for
writing SQL queries, and then _checking them at compile-time_. It's incredible.
You can ensure that you get exactly what you want from the database, and know
that your queries will work against the database, and that the return data
matches the types of whatever structure you're storing the data in all from
your editor. Making sure the queries get the right data is still on you though.

One downside is that you do have to write your own migrations in SQL, but it
does mean that there's less magic and that you're more in touch with what the
underlying technology is doing.

### Templates

I used [Askama](https://djc.github.io/askama/) for templating because I like
[Jinja2](https://jinja.palletsprojects.com/) templates, and these are very
similar. It's even better since you get some rusty goodness like compile-time
type checking and pattern matching. To start I went super-simple: base templates
for the external and internal pages, then just one template per page. The 
ability to extend and include other templates is going to come in handy later.

### Alpine

For that little bit of interactivity, but without having to write my own 
JavaScript, I used [Alpine.js](https://alpinejs.dev/). To be honest, writing
a little bit of vanilla JavaScript isn't too bad, but Alpine is even better.
This handles some basic stuff like notifications and the nav menu. 


### Drag-and-Drop

Did you know that browsers have 
[native drag-and-drop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) 
support now? It's kind of sick. (Drag and drop isn't required, you can just use
the form, but it's so cool). Once I wrapped my head around the api, it was
a tiny amount of javascript. The important point is the `dataTransfer` property
of the drag event, which you can use to pass information to wherever the element
is dropped to handle moving or updating or whatever. 


## SQLite and YAGNI

I always dismissed SQLite as a dev tool for use on my machine only and that
I needed to grow up into Postgres for production. Turns out SQLite is incredibly
stable, performant, and easy to manage. Especially for small applications that
can be run on a single server (and actix can handle a lot of requests), it works
amazingly well and saves you a lot of complexity. Remember, 
[complexity very, very bad](https://grugbrain.dev). 
[YAGNI](https://en.wikipedia.org/wiki/You_aren%27t_gonna_need_it) is the best
dumb acronym in software programming. Best of all, the database is just sitting
there right next to your application, so the latency on queries is tiny. The 
benefits of using a high-performance language like Rust are really lost if your
application is always sitting there waiting for a database server on the other
side of the datacenter (or worse) to return the data you need to render the 
page.

Compared to extremely complex, fully managed database solutions, SQLite on the
webserver has one major disadvantage: durability. But we can fix that with the
excellent [Litestream](https://litestream.io/). It runs in the background to 
intercept database writes and copy them to any cloud object storage you want.
You can then restore from that storage if something goes wrong. Like if you 
accidentally `rm -rf` the database, just restore from litestream and it's like
nothing ever happened! The cost of a few megabytes of cloud storage these
days is basically zero, so it's literally the definition of cheap insurance.


To be fair, SQLite is missing a few features compared to postgres, but after
quickly ~~having ChatGPT rewrite my Postgres queries in SQLite~~ rewriting my 
queries slightly, I really didn't miss much. I did miss native UUID and Enum
support, but it was a small price to pay compared to the large price (in either
money or latency) of using a managed Postgres service.


## Killing the Reload with HTMX

With just these things, we have a great web application that mops the floor with
anything from 2010 and even out-performs a lot of bloated React apps (bloated React 
is technically redundant). Buttttt, all those reloads. Today's users of the web
do not expect a white screen in between every action. They expect a cookie message, 
autoplay video ad, and newsletter pop-ups…I mean they expect reload-free operation
that feels like using an app on their phone, which means AJAX! Yay javascript :|

But there is an alternative. Popularized through sheer force of meme (and incredible
technology), [HTMX](https://htmx.org/) allows you to dynamically swap parts of
your html page by making special requests (that it builds for you from html 
attributes) and then sending html partials back to the client in response. So
it's simple: refactor the parts of the application that you might want to 
dynamically update, check whether a request is from htmx or a full page load,
then render either the entire page with the updated element or just the
partial that should be updated and send it back to the client.

But it's not that simple! Got you, it's totally that simple. I wrote an 
extractor that checks the headers to determine whether a request is from htmx
or a full page load, then the view function renders the appropriate response.
Sometimes I can even save a database query or two. Another huge benefit of this
approach, especially if you build a classic application first, is that all
app state is contained within the URL, so if a user reloads, they won't lose 
any application state, modals will still be open, etc. You might need to use
the `hx-push-url` attribute to ensure this, but if you're strict with your urls,
it creates such a nice experience, both for developers and users. I can't say 
enough good things about htmx.

By always wrapping the main content of the page in a `<div id="main-content"></div>`
I can even achieve reload-free navigation by dynamically swapping the main area
of the page. 


## That's it

That is really all the interesting bits of building applications with this stack:
Rust + Actix + SQLite + Alpine + HTMX. Oh and I used Tailwind for styling but
who doesn't these days. 

I also implemented fully passwordless authentication with passkeys and email
one time codes, but that's another show!

