---
# @formatter:off
title: Silly Goals
tags: project
hidden: false
featured: true
img: ./src/page_content/projects/6-silly-goals.png
url: https://sillygoals.com
video: 
    - url: /assets/vid/projects/silly-goals/sillygoals.vp9.webm
      type: video/webm; codecs=vp9,vorbis
    - url: /assets/vid/projects/silly-goals/sillygoals.vp8.webm
      type: video/webm; codecs=vp8,vorbis
    - url: /assets/vid/projects/silly-goals/sillygoals.h264.mp4
      type: video/mp4
snippet: An application for tracking your goals without pressure
index: 1
# @formatter:on
---

There are lots of project-management and tracking applications available online, 
but they tend to be work-oriented and put a lot of pressure on you to get things
done. I wanted something a little calmer, with fun colors and a sense of humor!

It's super fast, written in rust using actix-web and htmx to provide the 
responsiveness of a single-page app but without all the javascript bloat.

It also has a completely password-free authentication system using passkeys and
email-based code authentication. Passkeys allow users to authenticate using
the biometrics built into their device (FaceID, TouchID, Windows Hello, etc.)
for the most convenient experience without sacrificing security.
