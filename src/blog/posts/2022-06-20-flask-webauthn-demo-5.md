---
# @formatter:off
title: Fully Passwordless Authentication with Flask and Webauthn (Part 5)
snippet: Actually logging in users 
description:  WebAuthn provides a new way for user to authenticate without passwords. Here's how I made it work with the popular Flask Framework
pinned: false
date: 2022-06-20 22:04:00Z
# @formatter:on
---

*This picks up from [Part 4](/blog/posts/2022-06-20-flask-webauthn-demo-4). You'll be lost without it.
[This](https://github.com/rickh94/flask-webauthn-demo/tree/part-4-logging-in) is where we left off with the
codebase.*

## Session Management

So now that we can use WebAuthn to log in users we should probably, well, actually log them in. It would be nice to have
some protected routes as well to show that this is all actually working.

### Flask-Login
As much as I like doing things myself, I much prefer having things done for me, so I'm using 
[Flask-Login](https://flask-login.readthedocs.io/en/latest/). This is the exact kind of thing that I love about Flask;
it has functionality available, but doesn't force an approach onto you. With a little configuration, Flask-Login will
drop perfectly into our project with just a few additions to the code.

So we'll install it to the project, `docker compose up -d --build` (have to rebuild on new package), and can get 
started  using it.

We need to make a few additions to app to enable and configure `Flask-Login`, as well as some additions to the User 
model. We'll need to import the `User` model from our models.

##### app/app.py
```python
# ... other imports ...
from flask_login import LoginManager
# ... snip ...

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

login_manager = LoginManager()
login_manager.init_app(app)

login_manager.login_view = "auth.login"

# ... snip ...

# It doesn't really matter where you put this, but I like to keep the configuration above the functions.
@login_manager.user_loader
def load_user(user_uid):
    return User.query.filter_by(uid=user_uid).first()

# ... snip ...
```

Here we're just importing the `LoginManager` class, initializing it on our app, and telling it where the login view is,
so it knows where to redirect if unauthenticated users try to access protected views. Finally, we give it a function 
that will turn user ids into user objects. Next we'll make some changes to the User model to match the specification in 
`Flask-Login`.

##### app/models.py
```python
# ... snip ... 
class User(db.Model):
    # ... snip ...
    @property
    def is_authenticated(self):
        """If we can access this user model from current user, they are authenticated,
        so this always returns True."""
        return True

    @property
    def is_anonymous(self):
        """An actual user is never anonymous. Always returns False."""
        return False

    @property
    def is_active(self):
        """Returns True for all users for simplicity. This would need to be a column
        in the database in order to deactivate users."""
        return True

    def get_id(self):
        """Returns the user id. We're using the generated uuid rather than the database
        primary key."""
        return self.uid

```

Because I've implemented `is_active` as a `@property` we don't need to do any migrations, but if it were a column 
instead, you'd need to run a migration and upgrade the database.

With those simple changes, we now have access to a bunch of useful functionality provide by `Flask-Login`, namely, 
it's user session management with `login_user` and `logout_user`, the `current_user` global object, both in code
and in templates, and the `@login_required` decorator, to create protected routes with one line of code. Let's get into 
it.

### Actually Logging in the user
Ok so now that we can log in users, we should probably do that once we've verified that the user authenticated 
successfully, so we'll update the `verify_login_credential` view. Newly registered users should also be immediately 
logged in, so we can update the `create_user` view as well. We'll need to import some things.


##### app/auth/views.py
```python
# ... other imports ...
from flask_login import login_user

# ... snip ...

@auth.route("/create-user", methods=["POST"])
def create_user():
    """Handle creation of new users from the user creation form."""
    # ... snip ...
    except IntegrityError:
        return render_template(
            "auth/_partials/user_creation_form.html",
            error="That username or email address is already in use. "
            "Please enter a different one.",
        )

    login_user(user)
    
    pcco_json = security.prepare_credential_creation(user)
    
# ... snip ...
    
@auth.route("/verify-login-credential", methods=["POST"])
def verify_login_credential():
    """Log in a user with a submitted credential"""
    # ... snip ...
    try:
        security.verify_authentication_credential(user, authentication_credential)
        login_user(user)
        return make_response('{"verified": true}')
    except InvalidAuthenticationResponse:
        abort(make_response('{"verified": false}', 400))
    
```

Be sure to place the login user call *after* the security functions that might raise exceptions.


### Protecting Credential Creation
I think it makes sense that only authenticated users should be able to register new credentials. Currently, the only
way to log in is WebAuthn, and we only register credentials right after user creation, but I'd like to expand on that
later. Further, it's always safer to err on the side of more restrictive security. It's just and import and one 
decorator.

##### app/auth/views.py
```python 
# ... other imports ...
from flask_login import login_user, login_required

# ... snip ...

@auth.route("/add-credential", methods=["POST"])
@login_required
def add_credential():
    """Receive a newly registered credentials to validate and save."""
    user_uid = session.get("registration_user_uid")

# ... snip ...
```

Although, now that we log in the user on creation, and are requiring authentication to add a credential, we can simplify
the `add_credential` view using the `current_user` global



##### app/auth/views.py
```python 
# ... other imports ...
from flask_login import login_user, login_required, current_user

# ... snip ...

@auth.route("/add-credential", methods=["POST"])
@login_required
def add_credential():
    """Receive a newly registered credentials to validate and save."""
    registration_credential = RegistrationCredential.parse_raw(request.get_data())
    try:
        security.verify_and_save_credential(current_user, registration_credential)
        session["registration_user_uid"] = None
        res = make_response('{"verified": true}', 201)
        res.set_cookie(
            "user_uid",
            current_user.uid,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=datetime.timedelta(days=30),
        )
        return res
    except InvalidRegistrationResponse:
        abort(make_response('{"verified": false}', 400))
```

We've removed the custom session information and looking up the user. `Flask-Login` is now doing all that for us. Then 
we just replace the `user` we were looking up with the `current_user` global and everything should still work as 
intended. Feel free to try it out though.

Of course, now that we aren't using the custom user id we set on the session, we don't have to set it anymore either,
so we can remove that from the `create_user` function.

### Logout User and User Info

So now that we are logging in users, we should probably make some way for them to log out. It might be nice to also see
some information about the user, if only to prove that they are really logged in. Let's create that now, `Flask-Login`
makes it super easy.

##### app/auth/views.py
```python
from flask_login import login_user, login_required, current_user, logout_user
# ... snip ...

@auth.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))
```

I really can't think of a way to make that any easier. Now for the user info.

##### app/auth/views.py
```python 
@auth.route('/profile')
@login_required
def user_profile():
    return render_template("auth/user_profile.html")
```

We'll need to create that template. We don't need to pass anything in since we can access `current_user` directly in 
the template.

##### app/auth/templates/auth/user_info.html
{% raw %}
```html
{% extends "base.html" %}
{% block content %}
  <div class="flex flex-col space-y-4">
    <h4 class="font-bold text-2xl">User Profile Information</h4>
    <div>
      <strong class="font-bold">Name:</strong> {{ current_user.name }}
    </div>
    <div>
      <strong class="font-bold">Username:</strong> {{ current_user.username }}
    </div>
    <div>
      <strong class="font-bold">Email:</strong> {{ current_user.email }}
    </div>
    <div>
      <strong class="font-bold">UID:</strong> {{ current_user.uid }}
    </div>
    <div>
      <strong class="font-bold">Registered
        Credentials:</strong> {{ current_user.credentials | length }}
    </div>
  </div>
{% endblock content %}
```
{% endraw %}

Ok so those views exist now great...but how do we access them? Also, why does the navbar still show 'Login' and 
'Register' to authenticated users. Let's update `base.html` to make a little more sense

##### app/templates/base.html
{% raw %}
```html
<!-- snip -->
<!-- navbar -->
<header class="w-full bg-gray-50 font-bold px-8 py-2 flex justify-between shadow items-center">
  <a href="{{ url_for('index') }}" class="font-bold text-2xl">WebAuthn Flask</a>
  <nav class="flex justify-end space-x-4 items-center">
    {% if current_user.is_authenticated %}
    <div>
      <a href="{{ url_for('auth.user_profile') }}" class="hover:underline font-bold text-xl">Profile</a>
    </div>
    <div>
      <a href="{{ url_for('auth.logout') }}" class="hover:underline font-bold text-xl">Logout</a>
    </div>
    {% else %}
    <div>
      <a href="{{ url_for('auth.login') }}" class="hover:underline font-bold text-xl">Login</a>
    </div>
    <div>
      <a href="{{ url_for('auth.register') }}" class="hover:underline font-bold text-xl">Register</a>
    </div>
    {% endif %}
  </nav>
</header>
<!-- snip -->

```
{% endraw %}

The navigation links are now wrapped in an `if-else` block. The old Login and register links are in `else`, but if
the user is authenticated, it will show links to the Profile page and a link to log out. In case you were worried, 
`current_user` is never `None`; when there is no authenticated user, it will be an anonymous user object that returns
`False` from the `is_authenticated` property.

Ok let's try out this new functionality.

<figure>
    <video width="1300" height="1364" controls>
        <source src="/assets/img/blog/2022/06/flask-webauthn-demo-login-2.mp4" type="video/mp4">
        Your browser does not support the video tag
    </video>
    <figcaption>Hey it works! Mostly...</figcaption>
</figure>

### Redirecting the User After Login
So although that mostly worked, I had to manually reload the page to get the navbar to change. This is because all the
authentication is happening with AJAX request and just showing an alert. We can't get the different navbar until
flask renders a new page for us. Also, there's no reason a user should stay on the login page after logging in, that's 
just silly. So after the login, we need to tell javascript to redirect the user to a new page. We'll do that with
`window.location.replace()`, but first we need to send back a location to redirect to.


#### Sending back JSON
Up to now, I just manually wrote the JSON we needed to send back to our authentication javascript, but this is ugly and
unsustainable, so let's make a quick utility function for JSON responses. We should also validate our 'next' locations,
so we'll stick that function in here too (copied from an old Flask example).

##### app/auth/util.py
```python
import json
from urllib.parse import urlparse, urljoin

from flask import make_response, request


def make_json_response(body, status=200):
    res = make_response(json.dumps(body), status)
    res.headers["Content-Type"] = "application/json"
    return res


def is_safe_url(target):
    ref_url = urlparse(request.host_url)
    test_url = urlparse(urljoin(request.host_url, target))
    return test_url.scheme in ("http", "https") and ref_url.netloc == test_url.netloc

```

Now let's update the `verify_login_credential` view to send back a next location along with confirmation that it 
verified the credential. We'll need to import that `util` file we just made. If a user was redirected in to the
login page by `Flask-Login`, we'll have a `next` argument on the request, otherwise we'll just send them to the profile.

##### app/auth/views.py
```python
# ... other imports ...
from auth import security, util

# ... snip ...
@auth.route("/verify-login-credential", methods=["POST"])
def verify_login_credential():
    # ... snip ...
    try:
        security.verify_authentication_credential(user, authentication_credential)
        login_user(user)
        
        next_ = request.args.get('next')
        if not next_ or not util.is_safe_url(next_):
            next_ = url_for("auth.user_profile")
            
        return util.make_json_response({"verified": True, "next": next_})
    except InvalidAuthenticationResponse:
        abort(make_response('{"verified": false}', 400))

```

Ok now we need to tell javascript to actually change the page to this new url.

##### app/auth/templates/auth/_partials/select_login.html
{% raw %}
```html
<h1 class="font-bold text-xl">Hello, {{ username }}</h1>
<!-- snip -->

<script>
    document.getElementById('start-login').addEventListener('click', async () => {
        // ... snip ...

        const verificationJSON = await verificationResp.json();

        if (verificationJSON && verificationJSON.verified) {
            window.location.replace(verificationJSON.next);
        } else {
            alert("login failed")
            console.error(verificationJSON)
        }
    })
</script>

```
{% endraw %}

We still have the same weird behavior after registering a new credential. Let's fix it in the same way.

##### app/auth/views.py
```python 
# ... snip ...
@auth.route("/add-credential", methods=["POST"])
@login_required
def add_credential():
    """Receive a newly registered credentials to validate and save."""
    registration_credential = RegistrationCredential.parse_raw(request.get_data())
    try:
        security.verify_and_save_credential(current_user, registration_credential)
        session["registration_user_uid"] = None
        res = util.make_json_response(
            {"verified": True, "next": url_for("auth.user_profile")}
        )
        res.set_cookie(
            "user_uid",
            current_user.uid,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=datetime.timedelta(days=30),
        )
        return res
    except InvalidRegistrationResponse:
        abort(make_response('{"verified": false}', 400))
# ... snip ...
```

##### app/auth/templates/auth/register_credential.html
{% raw %}
```html
<!-- snip -->
<script>
    const startRegistrationButton = document.getElementById('start-registration');

    startRegistrationButton.addEventListener('click', async () => {
        // ... snip ...
        const verificationJSON = await verificationResp.json();

        if (verificationJSON && verificationJSON.verified) {
            window.location.replace(verificationJSON.next)
        } else {
            alert("Failure");
        }
    })

</script>
```
{% endraw %}

Ok now this should make a bit more sense. Let's try it out again.

<figure>
    <video width="1300" height="1364" controls>
        <source src="/assets/img/blog/2022/06/flask-webauthn-demo-login-3.mp4" type="video/mp4">
        Your browser does not support the video tag
    </video>
    <figcaption>Ah, much better</figcaption>
</figure>

This is starting to feel more like a real website (other than the fact that it has no *actual* functionality). In 
[the next part](/blog/posts/2022-06-21-flask-webauthn-demo-6), we'll add functionality to authenticate users by email,
so they can log in on more than one device. 
[The codebase after this part](https://github.com/rickh94/flask-webauthn-demo/tree/part-5-flask-login)
