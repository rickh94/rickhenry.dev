---

# @formatter:off
title: Table Tennis Scoreboard
tags: project
hidden: false
featured: false
img: https://f000.backblazeb2.com/file/rickhenrydev-files/img/projects/5-table-tennis-scoreboard.png
url: https://tabletennisscoreboard.com
snippet: A single page app for keeping score in a game of table tennis. Built with Eleventy.
index: 5
# @formatter:on
---

My Dad and I always forget the score when we're playing Ping-Pong games in the backyard. Actual scoreboards are quite
expensive, so I threw this together in a weekend. As usual, it's super lightweight with as little code as possible to
get the job done. This makes the load time very fast even on weaker connections. The largest asset to download is
actually the font.

It's a single page app that keeps score, tracks games and matches. It allows you to bind players to certain keys so that
you can use a presentation clicker to keep score from far away from your device. There's no server, so it can't keep
track of lifetime games or matches, but it does save all configurations to the browser so that you can just pick up with
the same player names and keybindings. I also ended up building a correction mode for when I inevitably click the wrong
button after a point. 
