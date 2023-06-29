---
# @formatter:off
title: Development without Docker
snippet: Making nice development environments without wrecking battery life
description: I mostly love docker, but my laptop certainly didn't. What can I do instead
pinned: false
date: 2023-06-28 19:46:00Z
# @formatter:on
---


# Mac Pleb

As much as I absolutely love Linux, and NixOS in particular, the reality is that
I do most of my work on my Apple Silicon MacBook Pro. For a while there, Apple's
laptops were basically unusably bad, but the M1 pushed Apple into the lead on
performance and battery life. Its environment is UNIX-y and it has actually
decent standby behavior (I'm looking at you, literally ever other laptop). But 
there's just one problem: it's not UNIX-y enough to run docker containers 
natively. This means it has to run a linux Virtual Machine, and, in the case
of Docker Desktop, a bunch of non-native code. In my experience,
this had a negative effect on the battery life of a laptop that I had purchased
because of its superior battery life. No bueno.



# Colima

[Colima](https://github.com/abiosoft/colima) is a nice alternative to the 
official Docker Desktop that does away with all that pointless GUI stuff.
I might be a Mac pleb, but I'll almost always choose a CLI tool over a GUI one.
I hate anything that forces you to use the GUI tool, though sometimes it's nice
to have, I admit. A CLI video editor might not be great. Seems like better 
battery life maybe? But at this point I was committed to stripping docker out
entirely wherever possible.


# If not containers then what?

The thing that I love most about containerized development environments is that
you get isolation and reproducibility. I hate having things installed globally
on my system and random cruft accumulating. Ideally, I wouldn't have to give 
these things up in exchange for a docker-free environment. So we investigate.


## Direnv

[Direnv](https://direnv.net/) is not a strictly necessary part of all this, but
it kept cropping up in what people were using for all of this, and it's so 
convenient (mostly) to initialize your environments when you enter a directory.
I've tried solutions like this in the past and have found them to seriously 
hurt shell performance when changing directories, but direnv seems to be fast
enough that this isn't an issue. It's sometimes annoying when you just want to
peek at something and it starts setting up your environment. Generally,
you can just `Ctrl-C` and it stops, but after the next command it will try to
set it up again. Honestly it's a small price to pay.

## ASDF

At the time, my main concern was running per-project postgres instances. Now I
tend to stick with SQLite even for deployment, but this was the start. The
actual application code ran well on my host system, and I could run redis
globally (not ideal, but it's memory only, so it matters way less). I came
across [this post])(https://ylan.segal-family.com/blog/2021/07/23/per-project-postgres-with-asdf-and-direnv/)
about doing exactly that, so I installed `asdf` and gave it a try. It actually
worked pretty well, and `asdf` is pretty simple to use. Ultimately though, as
I was getting more into the nix package manager, NixOs and nix-darwin, `asdf`
became just one more thing to have on my system.


## Nix v1

I modified the `asdf` setup to use nix for dependency management as well, and 
it worked quite well. I also installed [nix-direnv](https://github.com/nix-community/nix-direnv)
to clean up some of the behavior of nix and direnv. For simple things, I could 
just install the relevant packages with `use nix -p` in the `.envrc` file, and
for more complicated setups I could use a `shell.nix` file.

### MailHog

For some projects, I could install and use [MailHog](https://github.com/mailhog/MailHog)
for local email testing, which could be installed by nix and set up. This does
require slightly different configuration between production and development,
which is a bit annoying and won't always work.

### TLS with Mkcert and Caddy

As I started implementing Passkey/WebAuthn/FIDO2 authentication, the browsers
would get angry at me as I tried to test this feature on sites that did not
support TLS (because they were running locally). Ideally I didn't want to turn
the TLS protections off, and I definitely didn't want to manually setup my own
certificate authority and manage the certificates manually. I've used
[ngrok](https://ngrok.io/) as a reverse proxy, which works, but is limited in
the free tier, and very annoying if the application needs to be aware of its
endpoint because it changes any time you start a new tunnel.

I eventually discovered the excellent [mkcert](https://github.com/FiloSottile/mkcert)
tool that does all of this automatically. It was nix installable as well.
Combined with [Caddy](https://caddyserver.com/) which could proxy the locally
running application using the certificates managed by `mkcert`, I could get TLS
on a development application without modifying my source, running a third-party
reverse proxy, or managing certificates manually. Once I had this working
manually, I wrote a [direnv layout](https://github.com/rickh94/dots/blob/main/programs/direnv/lib/layout_mkcert.sh)
to automatically generate the certificates based on the supplied domain name. It
then generates a `Caddyfile` based on the supplied port, and proxies to that
port using the certificates. It also sets an environment variable `$CADDYFILE`
so you can just `caddy run $CADDYFILE` and it's ready to proxy your app. It does
generate a lot of log spam if the proxied application is not running, but that's
to be expected. 

This doesn't even require editing the hosts file or messing with DNS because
MacOS automatically routes all `.localhost` top level addresses to `127.0.0.1`.

#### Notes

It is important that you only have one project active on the system at a time,
or `caddy` with complain that the https port is already in use. This makes
sense, and argues for some kind of global proxy handling everything, but that
goes against what I'm trying to accomplish. It's manageable.

If you change the configuration, remember to `rm -rf` the certs directory so
that everything gets regenerated (env variable is `$CERTS`).

Incidentally, I spent a *lot* of time fighting with the HEREDOC syntax to make
the file generation work properly. Highly recommend copy-pasting an existing
one, or just make sure your `EOF` is right at the start of a line.

### Redis

Since I had this all working, I figured I might as well encompass Redis into it
as well. I just installed redis using nix, set a semi-arbitrary port, and set
the `REDIS_PORT` and `REDIS_URL` environment variables.


### Just do it

One the one hand, I could now run basically everything I needed to support my
application directly on my machine, but I was missing the just-run-everything
nature of `docker-compose`. There's a better solution later, but what did first
is use [Just](https://github.com/casey/just). Big Fan. I just wrote a little
shell script in the `Justfile` to run the each task in a background process,
then saved the process id to a file in a `.pids` directory when i run `just up`. 
Then for `just down` it simply loops over the files in `.pids`, kills the
process, and removes the file. It *mostly* works, but occasionally I'll get
vampire processes, or pids pointing to dead processes when things get out of
sync.

```bash
start:
	#!/usr/bin/env bash
	if [ ! -d '.pids' ]; then
		mkdir '.pids'
	fi
	caddy run --config $CADDYFILE &
	echo $! > .pids/caddy
	redis-server --port $REDIS_PORT &
	echo $! > .pids/redis

stop:
	#!/usr/bin/env bash
	if [ -d '.pids' ]; then
		for f in `ls .pids`; do
			kill $(cat .pids/$f)
			rm .pids/$f
		done
	fi

```


## A better, Nix-ier, way

A little later I was starting to learn about Laravel and needed a `php`
environment on my machine. Laravel has instructions for setting up with docker,
but we were trying to avoid that. XAMPP is also popular, but that has the exact
kind of global installation garbage that I hate. For Mac, Laravel has 
[valet](https://laravel.com/docs/10.x/valet), which is super convenient and
seemed promising, but as I used it I discovered it did a bunch of monkeying
around with global system stuff, and then its `dnsmasq` and `nginx` usage
conflict with my `caddy` setup for other projects, but run as global services
rather than running locally to the project. It seemed annoying to manage, and I
didn't want to deal with it. Plus, Nix users are a small but crazy bunch, and
PHP is super popular, I couldn't possibly be the first person who wanted to
manage a PHP development environment with Nix!

[And I wasn't.](https://shyim.me/blog/devenv-compose-developer-environment-for-php-with-nix/)
Obviously this wasn't exactly what I needed, their example uses symphony rather
than laravel, but once I started to understand `php-fpm` and how caddy routes
that, it was pretty easy to adapt it to my setup. In addition,
[devenv](https://devenv.sh) elegantly handles certificate creation (using
mkcert!) and can configure `caddy` as a service. It also does redis and mysql
and a host of other services all using Nix! It even sets up `direnv` to
automatically enter your environment when you `cd` into the project directory.

So I set it up to run a php fpm pool, issue a certificate for
`laragigs.localhost` and configured caddy to handle everything, all in one file.
It can even create custom scripts and processes for you. It literally handles
everything I listed above, all in one. 

```nix
{ pkgs, config, ... }:

{
  packages = [ pkgs.git pkgs.nodejs pkgs.nodePackages.pnpm pkgs.php82 ];

  languages = {
    javascript = {
      enable = true;
      package = pkgs.nodejs;
    };
    php = {
      enable = true;
      fpm.pools.web = {
        settings = {
          "clear_env" = "no";
          "pm" = "dynamic";
          "pm.max_children" = 10;
          "pm.start_servers" = 2;
          "pm.min_spare_servers" = 1;
          "pm.max_spare_servers" = 10;
        };
      };
    };
  };

  certificates = [
    "laragigs.localhost"
  ];

  services.caddy = {
    enable = true;
    virtualHosts."laragigs.localhost" = {
      extraConfig = ''
        root * public
        php_fastcgi unix/${config.languages.php.fpm.pools.web.socket}
        file_server
      '';
    };
  };

}
```

I figured this could be easily adapted to my other projects, so I started with 
[Silly Goals](https://github.com/rickh94/silly-goals). The services were
extremely straightforward, but getting rust to compile correctly in a nix
environment on MacOS is a little tricky. Nix Darwin has all the appropriate
system libraries, but it's just a matter of figuring out which ones the linker
needs and using them. I did get it working pretty quickly with this config:

```nix
{ pkgs, config, ... }:

{
  # https://devenv.sh/basics/
  env.GREET = "devenv";

  # https://devenv.sh/packages/
  packages = [
    pkgs.openssl
    pkgs.pkg-config
    pkgs.libiconv
    pkgs.sccache
    pkgs.darwin.apple_sdk.frameworks.SystemConfiguration
    pkgs.darwin.apple_sdk.frameworks.CoreFoundation
    pkgs.darwin.apple_sdk.frameworks.Security
    pkgs.mailhog
    pkgs.just
    pkgs.gcc
  ];

  # https://devenv.sh/languages/
  # languages.nix.enable = true;
  languages = {
    rust.enable = true;
  };

  certificates = [
    "silly.localhost"
  ];

  services.caddy = {
    enable = true;
    virtualHosts."silly.localhost" = {
      extraConfig = ''
        reverse_proxy :8000
      '';
    };
  };

  services.redis = {
    enable = true;
    port = 6388;
  };

}
```

Ultimately, I'd like to do some system conditional checking to only install the
darwin system frameworks on darwin systems, I suspect this would produce errors
if run on a linux system. 


# Orb Stack

I should mention [OrbStack](https://orbstack.dev) which promises to be a faster
and lighter-weight docker environment for Mac (and linux?). Big if true. I'm
loving the docker-free development (still using for deployment though), and it's
set to become a paid product once it leaves beta. If they do a single-fee
license structure, I would certainly consider it, however at this point I always
expect a subscription model, which… ugh. Something to watch for sure.


# That's it

I went on a bit of a journey getting to this point, but the battery life win is
noticeable from not running containers on a vm, and it's a super nice setup to
use. It might change in a year, but my experience so far is that Nix-based tools
are always worth the small tradeoffs and it's incredibly hard to go back once
you start doing things the nix way.
