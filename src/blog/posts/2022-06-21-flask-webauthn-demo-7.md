---
# @formatter:off
title: Fully Passwordless Authentication with Flask and Webauthn (Part 7)
snippet: Showing Notifications
description:  WebAuthn provides a new way for user to authenticate without passwords. Here's how I made it work with the popular Flask Framework
pinned: false
date: 2022-06-21 23:00:00Z
# @formatter:on
---

*This picks up from [Part 6](/blog/posts/2022-06-21-flask-webauthn-demo-6). The previous parts are much more important.
[This](https://github.com/rickh94/flask-webauthn-demo/tree/part-6-email-login) is where we left off with the
codebase.*

## Notifications

Flask provides a really neat notification system with the `flash` function. I've often seen this implemented like this:

{% raw %}
```html
{% with messages = get_flashed_messages() %}
  <ul style="color:red;">
  {%- for message in messages %}
    <li>{{ message }}</li>
  {% endfor %}
  </ul>
{% endwith %}
```
{% endraw %}

Perhaps I'm being a little unfair, but seeing things like that put a bad taste in my mouth about the `flash` function.
But I've realized that it's great, we just need a little better CSS (and a *tiny*) bit of Javascript.


### Better CSS

By better css, I mean adapting a toast element from [Flowbite](https://flowbite.com), which is a fairly nice open-source
component library base on Tailwind.

I'm going to put it in a partial so that we can include it in the base page *and* send it along with any htmx swapping
that we're doing. Since they're positioned absolutely on the page, it's fine to stick it anywhere (unless you're a 
stickler for uber-clean markup.)

Since this isn't authentication specific, I'm going to stick it in a `_partials` directory under the main template 
folder, rather than in the `auth` blueprint. I'm also going to create a custom context processor to make some random 
ids for me. All the dynamic swapping created some weird bugs where multiple elements would have the same id. We'll use 
randomness to avoid that.

##### app/app.py
```python
import uuid 
# ... snip ...
@app.context_processor
def utility_processor():
    def random_id():
        return uuid.uuid4().hex

    return dict(random_id=random_id)
```

##### app/templates/_partials/toasts.html

{% raw %}
```html
{% with messages = get_flashed_messages(with_categories=true) %}
{% if messages %}
<div class="absolute top-5 right-5 flex flex-col">
  {% for category, message in messages %}
  {% set message_id %}message-{{ random_id() }}{% endset %}
  <div
    class="flashed-message flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow"
    id="{{ message_id }}"
    role="alert"
  >
    <!-- icon selected by category -->
    {% if category == "success" %}
      <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg ">
        <svg
          class="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          ></path>
        </svg>
      </div>
    {% elif category == "warning" %}
      <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-orange-500 bg-orange-100 rounded-lg">
        <svg
          class="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          ></path>
        </svg>
      </div>
    {% elif category == "failure" %}
      <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-red-500 bg-red-100 rounded-lg">
        <svg
          class="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path>
        </svg>
      </div>
    {% endif %}
    <!-- message text -->
    <div class="ml-3 text-sm font-normal">{{ message }}</div>
    <!-- close button -->
    <button
      type="button"
      class="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8"
      aria-label="Close"
      onclick="document.getElementById('{{ message_id }}').remove()"
    >
      <span class="sr-only">Close</span>
      <svg
        class="w-5 h-5"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clip-rule="evenodd"
        ></path>
      </svg>
    </button>
  </div>
  {% endfor %}
</div>
{% endif %}
{% endwith %}
```
{% endraw %}

Flask allows you to set a category with your flashed message, so we'll use that to get different colors and icons. 
One line of Javascript to remove the notification when the close button is clicked. We just include that, and now we
can flash messages on any page reload. If we want to flash a message without reloading, it will be a little more work.

I'll also add a quick function to remove the notifications after a few seconds.

##### app/templates/base.html
{% raw %}
```html
{% include "_partials/toasts.html" %}
<!-- snip -->
<script>
  function removeMessages() {

    <!--    Remove all flashed messages after 5 seconds -->
    const messages = document.querySelectorAll('.flashed-message')
    console.log(messages)
    setTimeout(function () {
      for (let message of messages) {
        console.log('removing message', message)
        message.remove();
      }
    }, 5000)
  }

  document.addEventListener("DOMContentLoaded", removeMessages)
  document.addEventListener("htmx:afterSettle", removeMessages)
</script>
```
{% endraw %}

Just stick it somewhere in the body. Doesn't matter where.

Let's flash some messages. We'll need to import `flash` first.

##### app/auth/views.py
```python
from flask import (
    Blueprint,
    render_template,
    request,
    make_response,
    session,
    abort,
    url_for,
    redirect,
    flash,
)

# ... snip ...
@auth.route("/add-credential", methods=["POST"])
@login_required
def add_credential():
    """Receive a newly registered credentials to validate and save."""
    registration_credential = RegistrationCredential.parse_raw(request.get_data())
    try:
        security.verify_and_save_credential(current_user, registration_credential)
        session["used_webauthn"] = True
        flash("Setup Complete!", "success")

    # ... snip ...


# ... snip ...
@auth.route("/magic-link")
def magic_link():
    """Handle incoming magic link authentications."""
    # ... snip ...
    if security.verify_magic_link(user_uid, url_secret):
        login_user(user)
        session["used_webauthn"] = False
        flash("Logged in", "success")
        return redirect(url_for("auth.user_profile"))
        
    return redirect(url_for("auth.login"))

        
@auth.route("/create-credential")
@login_required
def create_credential():
    """Start creation of new credentials by existing users."""
    pcco_json = security.prepare_credential_creation(current_user)
    flash("Click the button to start setup", "warning")
    return make_response(
        render_template(
            "auth/_partials/register_credential.html",
            public_credential_creation_options=pcco_json,
        )
    )

# ... snip ...
```

Flask helpfully holds on to flashed messages for us, even if they aren't displayed right on that request. So even 
though we are using Javascript to redirect after adding a credential, the flashed message is still shown on the next 
request. Neat!

So that's about it. [Here's how it turned out.](https://github.com/rickh94/flask-webauthn-demo/tree/part-7-notifications)
If you want to try a live demo (or just see what my CSS looks like when I'm actually trying),
[check it out here](https://flask-webauthn.rickhenry.dev).
