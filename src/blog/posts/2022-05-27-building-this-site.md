---
title: Building my website 
snippet: The more I worked on this site, the simpler and simpler it became, and it worked out great!
pinned: true
date: 2022-05-27 20:23:23Z
---

It's taken a long time to find the right set of technologies to build this site that are simple and fast, but also
provide all the functionality that I needed.

My first attempt to build this site was years ago, using Vue.js 2, but I never really got started. I had huge
ambitions for the frontend and backend. Maybe some of that will come to fruition with time, but it would have been
so complex.

## Nuxt, Ghost, Airtable

When I first started on it this time, I wanted to use Nuxt.js for server side rendering of Vue.js. I love Vue.js as a
tool to allow me to divide things into discrete components and provides really nice javascript functionality and
support for fancy transitions. I also really wanted to be able to blog, so I set up Ghost in headless mode.
This was pretty cool, but added a ton of complexity. I got it working, but it was a fight with the API. I also
wanted to keep my content separate from my templates, so I use Airtable to save the information about the projects
that I wanted to feature, and then pull the content in using Airtable's good (but limited) REST api. Again, got it
working, but more complexity. If there were an api change or something didn't pull in just right, my website would
break.

At this point I had switched from server side rendering to static rendering, which Nuxt does quite well. Less complexity
but it means that everything needs to pull in correctly at render time, api keys, etc. I was now relying on several
third-party services that I was using slightly out of spec.

![Ghost CMS](https://user-images.githubusercontent.com/353959/66987533-40eae100-f0c1-11e9-822e-cbaf38fb8e3f.png "Ghost
is a great Content Management System, just not right for my needs")

## Removing Ghost

In addition to the complexity added by Ghost, posts also didn't look nice, and it's something else to host that would
represent ongoing cost. So I decided to remove ghost and switch to blogging in files instead. I didn't really like
the idea of blogging directly in HTML, so I figured it would be fairly simple to add markdown rendering to my site.

Apparently not.

Nuxt is in a bit of a transition period at the moment as they switch to Nuxt 3 supporting Vue 3. Vue 3 has a ton of
great improvements, and they should definitely support it. But for now, library support for the different versions
is really hit-or-miss. So when I added the markdown rendering library, npm got **so** mad. I figured that I could
upgrade to the latest-and-greatest version of Nuxt; it was an opportunity! And that's when everything broke...

## Moving on from Nuxt

I was now totally fed up with Nuxt and the complexity that I had created. It wasn't the fault of the technologies. I
had simply created a huge amount of complexity for what would be a mostly static site. It just wasn't worth it.
I was ready to move on, looking for simplicity and maintainability.

### HTML, CSS, JavaScript

I was so tired of frameworks and interlocking services that I briefly considered just hand-coding all the HTML, CSS,
and JavaScript that I would need for the site. This does great on simplicity, and for something smaller, I would
certainly do that. These are the true technologies of the web, and many sites have been built with just these tools.

That said, they really don't do well on maintainability. There would end up being a lot of repetition and the content
and styling would all be together. Making changes and updates would involve a lot of digging through huge files,
find-and-replace, etc. I'm not a fan.

### Hugo

So I turned to the purpose-made static site generators. I considered going back to Nuxt, but that didn't feel right.
Hugo seems to be the most popular and recommended static site generator, and it is very nice. Easy to set up and
get going. I quickly discovered that it was too simple for my needs. If you want a static blog with a nice
pre-made theme but without the complexity and slowness of a full CMS, Hugo is awesome. But creating my own templates
would have been a pain, and I couldn't find anyone using it for a mixed-use site the way I wanted. So it was out.

### Eleventy to the rescue

So moving on from the established, most popular tool to the up-and-comer. Eleventy isn't as large and recommended as
Hugo, but it has some huge advantages, and seems to be the end of my journey for now.

Eleventy is so easy to set up. It's JavaScript-based, so I already had all the tooling I needed. It also makes it
relatively easy to include other javascript libraries, css libraries, etc. It also supports tons of JavaScript
template languages. I'm using Nunjucks because it's Mozilla, and it's as close as you can get in JS to my beloved
Jinja2, which is python-only. It also supports markdown out of the box, so I can put content in markdown files and
pages and templates in Nunjucks files. But I could just start using ejs or pug and Eleventy will just render it.
There's no lock-in. If I want to add a static-based cms like Forestry or Netlify CMS,

Needless to say, I had it up-and-running in no time and loved it.

## Eleventy, AlpineJS, TailwindCSS

So I had a static site generator that I loved, but I also didn't want to write a bunch of boilerplate css and
javascript, so including Alpine and Tailwind was a no-brainer. I found tutorials for how to integrate them with
Eleventy and had everything I needed. Tailwind's utility classes are a huge time save when building fast. I could
certainly build everything on this site directly in CSS, but it would take _much_ longer for no benefit. Tailwind
only exports the CSS you actually use, so it doesn't really bloat (it's currently 44KB). Alpine is similar in that
I could build all the functionality in Vanilla JavaScript, but it would take much longer, and Alpine is so small that
it's not really noticeable in load times.

I finally have balance: minimal complexity without repetition, content and templates are separate, and very little
boilerplate code to repeat. In the end, I have a static site of HTML, CSS, and JavaScript that's easy to host, easy
to build, and will load extremely fast.


