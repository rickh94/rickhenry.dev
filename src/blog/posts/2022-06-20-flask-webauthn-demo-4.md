---
# @formatter:off
title: Fully Passwordless Authentication with Flask and Webauthn (Part 4)
snippet: Logging in with a WebAuthn Credential
description:  WebAuthn provides a new way for user to authenticate without passwords. Here's how I made it work with the popular Flask Framework
pinned: false
date: 2022-06-20 17:23:00Z
# @formatter:on
---

*This picks up from [Part 3](/blog/posts/2022-06-20-flask-webauthn-demo-3). You'll be lost without it.
[This](https://github.com/rickh94/flask-webauthn-demo/tree/part-3-credential-registration) is where we left off with the
codebase.*

## Login

Now that we've successfully registered a user's credential, we should let them use it to log in to our site. We'll need
a new view, template, and some javascript to make this work.

The login view will have two stages: first we will have a user type their username or email, then we will generate a 
login page that allows them to log in with their biometric credential (or later email authentication). If no user is
found, we'll send back the first form with an error. We'll also look for the `user_uid` cookie, so we can try to skip
the first stage for remembered users. For the second stage, as with the registration, the server will need to generate 
some options before the client can attempt registration. This includes a list of allowed credential_ids so the browser
knows whether it has a valid credential for this site. This is why we are collecting the username first, so we can 
filter to only that user's credentials. 

##### app/auth/views.py
```python
# ... snip ...
@auth.route("/login", methods=["GET"])
def login():
    """Prepare to log in the user with biometric authentication"""
    user_uid = request.cookies.get("user_uid")
    user = User.query.filter_by(uid=user_uid).first()

    # If the user is not remembered from a previous session, we'll need to get
    # their username.
    if not user:
        return render_template("auth/login.html", username=None, auth_options=None)

    # If they are remembered, we can skip directly to biometrics.
    auth_options = security.prepare_login_with_credential(user)
    session["login_user_uid"] = user.uid
    return render_template(
        "auth/login.html", username=user.username, auth_options=auth_options
    )

```

In addition to the functionality stated above, we're going to save the user_uid on the session to make it easy to 
retrieve later when we are authenticating.

### Option creation

We have some missing pieces to fill in here. As usual, we will separate the security functions into the `security.py`
file, and we need to create the login template that can handle showing either form we need. We'll also need to add
routes to handling processing each of these forms. Let's do the security first, then the templates.

##### app/auth/security.py
```python
# ... other imports ...
from webauthn.helpers.structs import PublicKeyCredentialDescriptor
# ... snip ...
REGISTRATION_CHALLENGES = Redis(
    host=REDIS_HOST, port=REDIS_PORT, db=0, password=REDIS_PASSWORD
)
AUTHENTICATION_CHALLENGES = Redis(
    host=REDIS_HOST, port=REDIS_PORT, db=1, password=REDIS_PASSWORD
)

# ... snip ...

def prepare_login_with_credential(user):
    """
    Prepare the authentication options for a user trying to log in.
    """
    allowed_credentials = [
        PublicKeyCredentialDescriptor(id=credential.credential_id)
        for credential in user.credentials
    ]

    authentication_options = webauthn.generate_authentication_options(
        rp_id=_hostname(),
        allow_credentials=allowed_credentials,
    )

    AUTHENTICATION_CHALLENGES.set(user.uid, authentication_options.challenge)
    AUTHENTICATION_CHALLENGES.expire(user.uid, datetime.timedelta(minutes=10))

    return json.loads(webauthn.options_to_json(authentication_options))

```

We need the `PublicKeyCredentialDescriptor` struct from `webauthn`, which just helps us get the credential information 
into a format the browser will understand. Also, because of the relationship we set up in the models, we can just 
loop over `user.credentials` in a normal python list comprehension.

The authentication options will come with a challenge, just like in registration, and we need to store it. You could 
keep both types of challenges in one redis store, since it's unlikely that a user would be logging in on one device 
while registering another, but I'm going to make a separate one for better organization. Make sure you increment the
db number in the redis initialization, or you'll end up with some very confusing bugs.

The return like is just a little hack to convert the binary values to base64 encoded strings that we can inject into
the client. 

### Templates

Since we know we might be swapping out the login form with htmx to show errors or move to the next stage, let's 
create three templates: a partial for the username form, a partial for selecting the login type, and the full page 
login form that conditionally renders one of these templates, based on whether we generated authentication options

##### app/auth/templates/auth/_partials/username_form.html
{% raw %}
```html
<form hx-post="{{ url_for('auth.prepare_login') }}" hx-swap="outerHTML" class="max-w-sm mx-auto space-y-2">
  <h1 class="text-xl font-bold mb-2">Login</h1>
  <p class="italic">Enter your username or email address to start logging in.</p>
  {% if error %}
    <p class="text-red-700 font-bold">{{ error }}</p>
  {% endif %}
  <div class="flex-col flex">
    <label for="username" class="mb-1 font-bold">Username or Email</label>
    <input
      type="text"
      id="username_email"
      name="username_email"
      required
      class="border border-black rounded shadow p-1"
    >
  </div>
  <div>
    <button
      class="bg-green-600 font-bold py-2 px-4 uppercase shadow text-white rounded hover:bg-green-700 hover:shadow-lg"
      type="submit"
    >Start Login
    </button>
  </div>
</form>

```
{% endraw %}

Here we have a form with a username or email field, a space for error messages, and a submit button. We're using hx-post
again. We'll create the `prepare_login` view in a moment.

##### app/auth/templates/_partials/select_login.html
{% raw %}
```html
<h1 class="font-bold text-xl">Hello, {{ username }}</h1>
<p class="my-2">
  If you have logged in on this device before, you may be able to use a
  biometric method (Fingerprint Reader or Facial Recognition) or a security key.
</p>
<p class="my-2">
  If you haven't logged in on this device before (or your device doesn't support
  biometrics, choose email login. Then you can set up biometric authentication to
  use in the future.
</p>
<div class="flex space-x-2">
  <button
    class="text-white uppercase font-bold bg-green-600 px-4 py-2 rounded"
    id="start-login"
  >
    Device Login
  </button>
  <a
    href="{{ url_for('auth.login_switch_user') }}"
    class="text-white uppercase font-bold bg-black px-4 py-2 rounded"
  >
    Switch User
  </a>
</div>

<script>
    document.getElementById('start-login').addEventListener('click', async () => {
        // The auth_options dictionary is also a valid javascript object, so it can be injected here.
        const options = {{ auth_options | safe }};

        let asseResp;
        try {
            asseResp = await startAuthentication(options);
        } catch (error) {
            alert("Something went wrong");
            console.error(error)
        }

        const verificationResp = await fetch('{{ url_for("auth.verify_login_credential") }}', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(asseResp),
        })

        const verificationJSON = await verificationResp.json();

        if (verificationJSON && verificationJSON.verified) {
            alert("Login succeeded.")
        } else {
            alert("login failed")
            console.error(verificationJSON)
        }
    })
</script>
```
{% endraw %}

As in the registration form, we are injecting the `auth_options` directly into the javascript. There are routes missing
here as well, we'll do all of them momentarily. The javascript here is very similar to what we have seen before in the 
registration portion. Again we give the browser the options, but this time instead of creating a credential, it checks
for one that matches one of the IDs that we sent, then offers to log in the user with this credential. We also have a
Switch User button in case someone else wants to log in other than the user we remembered.


##### app/auth/templates/auth/login.html
{% raw %}
```html
{% extends "base.html" %}

{% block content %}
  {% if auth_options %}
    {% include "auth/_partials/select_login.html" %}
  {% else %}
    {% include "auth/_partials/username_form.html" %}
  {% endif %}
{% endblock %}
```
{% endraw %}

As it turns out, there's no actual html in this template. All it does is select which form to render based on whether 
the view function provides `auth_options`.


### Respond to the Username Form

For users that we don't remember, we need to accept their username or email address from the form and advance them
or return an error. We are going to need SQLAlchemy's `or_` and `func` objects for our query.

##### app/auth/views.py
```python
# ... other imports ...
from sqlalchemy import or_, func

# ...snip...

@auth.route("/prepare-login", methods=["POST"])
def prepare_login():
    """Prepare login options for a user based on their username or email"""
    username_or_email = request.form.get("username_email", "").lower()
    # The lower function just does case insensitivity for our.
    user = User.query.filter(
        or_(
            func.lower(User.username) == username_or_email,
            func.lower(User.email) == username_or_email,
        )
    ).first()

    # if no user matches, send back the form with an error message
    if not user:
        return render_template(
            "auth/_partials/username_form.html", error="No matching user found"
        )

    auth_options = security.prepare_login_with_credential(user)

    res = make_response(
        render_template(
            "auth/_partials/select_login.html",
            auth_options=auth_options,
            username=user.username,
        )
    )

    # set the user uid on the session to get when we are authenticating later.
    session["login_user_uid"] = user.uid
    res.set_cookie(
        "user_uid",
        user.uid,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=datetime.timedelta(days=30),
    )
    return res

```

I described the functionality of this above, but to recap, we are sending back either the username form with an error
or the select login form with the auth options generated and saving the uid on the session.


### Switch User

Before we get to the fun stuff, let's just quickly implement the Switch User functionality. You could be fancy with 
htmx, but I'm just going to do it quick and dirty: remove the `user_uid` cookie, remove `login_user_uid` from the 
session, and redirect back to the login page. We will need Flask's `url_for` and `redirect` functions.

##### app/auth/views.py
```python
import datetime 

from flask import (
    Blueprint, render_template, request, make_response, session, abort,
    url_for, redirect,
)

# ... snip ...
@auth.route("/login-switch-user")
def login_switch_user():
    """Remove a remembered user and show the username form again."""
    session["login_user_uid"] = None
    res = make_response(redirect(url_for('auth.login')))
    res.delete_cookie('user_uid')
    return res

```

### Authenticating the User

As before, now that we've done all the setup, the actual authentication is fairly simple. Get the user uid from the 
session, check the credential for a matching stored credential, verify its authenticity with the challenge, then 
report success. The actual security functionality will of course be in the `security.py` file. Like in the registration
process, the `webauthn` package has a struct to help us pull the credential out of the response from the browser and
throws an `InvalidAuthenticationResponse` when...well I bet you can figure it out. WebAuthn certainly 
favors...um...descriptive class names.

##### app/auth/views.py
```python
# ... other imports ...
from webauthn.helpers.structs import RegistrationCredential, AuthenticationCredential

# ... snip ...
@auth.route("/verify-login-credential", methods=["POST"])
def verify_login_credential():
    """Remove a remembered user and show the username form again."""
    user_uid = session.get("login_user_uid")
    user = User.query.filter_by(uid=user_uid).first()
    if not user:
        abort(make_response('{"verified": false}', 400))

    authentication_credential = AuthenticationCredential.parse_raw(request.get_data())
    try:
        security.verify_authentication_credential(user, authentication_credential)
        return make_response('{"verified": true}')
    except InvalidAuthenticationResponse:
        abort(make_response('{"verified": false}', 400))

```

And the `verify_authentication_credential` function. It should look somewhat familiar. The only difference is instead
of storing a credential, we're reading one from the database and comparing it to the one submitted by the client using
the magic of asymmetric key cryptography (well a library is doing that for us).

##### app/auth/security.py
```python
def verify_authentication_credential(user, authentication_credential):
    """
    Verify a submitted credential against a credential in the database and the
    challenge stored in redis.
    """
    expected_challenge = AUTHENTICATION_CHALLENGES.get(user.uid)
    stored_credential = (
        WebAuthnCredential.query.with_parent(user)
        .filter_by(
            credential_id=webauthn.base64url_to_bytes(authentication_credential.id)
        )
        .first()
    )
    
    # This will raise if the credential does not authenticate
    # It seems that safari doesn't track credential sign count correctly, so we just
    # have to leave it on zero so that it will authenticate
    webauthn.verify_authentication_response(
        credential=authentication_credential,
        expected_challenge=expected_challenge,
        expected_origin=f"https://{_hostname()}",
        expected_rp_id=_hostname(),
        credential_public_key=stored_credential.credential_public_key,
        credential_current_sign_count=0
    )
    
    # After a successful authentication, expire the challenge so it can't be used again.
    AUTHENTICATION_CHALLENGES.expire(user.uid, datetime.timedelta(seconds=1))

    
    # Update the credential sign count after using, then save it back to the database.
    # This is mainly for reference since we can't use it because of Safari's weirdness.
    stored_credential.current_sign_count += 1
    db.session.add(stored_credential)
    db.session.commit()

```

This is again quite similar to the registration process, except for the order of the database access is reversed. The ID
in our `authentication_credential` will be a base64 encoded string, so we need to convert it back to match the binary in
our database. As usual, the `webauthn` package has a convenient helper function for us. Top-notch package.


With all of this done, we *should* be able to sign in with the username and credential that we registered earlier. (If 
you have `docker compose down`ed since then, you'll need to create a new user. I chose not to persist the database,
so I could easily start over if I broke something.)

*If you get 405 method not allowed, make sure that you set `methods=["POST"]` on the `verify_login_credential` route. 
One more random note for no reason. I would never make such a mistake.*

<figure>
    <video width="1300" height="1364" controls>
        <source src="/assets/img/blog/2022/06/flask-webauthn-demo-login-1.mov" type="video/mp4">
        Your browser does not support the video tag
    </video>
    <figcaption>That's pretty cool right?</figcaption>
</figure>

Go ahead and try out the switch user functionality, login from your phone, try to break it.
*If you do break it, go ahead and [email me](mailto:rickhenry@rickhenry.dev), so I can fix it.*

So you could pretty much stop here and build the rest however is best for you. This was all the special WebAuthn 
biometric stuff. However, I can't leave it like this. In [Part 5](/blog/posts/2022-06-20-flask-webauthn-demo-5) we'll 
actually log users in and out and add some protected routes.

[Here's the codebase](https://github.com/rickh94/flask-webauthn-demo/tree/part-4-logging-in) after this section


