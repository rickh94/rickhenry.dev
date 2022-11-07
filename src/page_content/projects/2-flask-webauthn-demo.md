---

# @formatter:off
title: Flask WebAuthn Demo
tags: project
hidden: false
featured: true
img: https://f000.backblazeb2.com/file/rickhenrydev-files/img/projects/2-flask-webauthn-demo.png
url: https://flask-webauthn.rickhenry.dev
snippet: A demonstration of device-based passwordless authentication using python.
index: 2
# @formatter:on
---

With Apple making a big push toward passwordless authentication, I thought it would be time to figure out how to get it
working on a website using the technologies that I like. I've tested it with TouchID on my Mac, FaceID on my iPhone, and
Windows Hello on my PC. I'd love for you to [try it out](https://flask-webauthn.rickhenry.dev). You can register as a
user with a username and email address, then you go immediately to setting up passwordless authentication with your
device. Next time you come back (or if you just click "Logout" then "Login"), it will remember you, and you can log in
using your device again. You can also get a magic login link as a fallback, or to register on a different device.

It was quite difficult to figure out at first, but, within about a week, I had a working demo using Python's Flask
framework and a few of my other favorite technologies. I wrote
a [series of blog posts](/blog/posts/2022-06-19-flask-webauthn-demo-1) about building it. They're fairly
technical and really only useful if you're already well-versed in Python and Flask and some Javascript. And if you're
*really* a nerd like me, you can [check out the source code](https://github.com/rickh94/flask-webauthn-demo).
