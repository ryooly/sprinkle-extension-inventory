/*
 * Sprinkle client auth.
 * Drives the header account menu and the log in / sign up dialog on top of
 * POST /user/login and POST /user/register (src/modules/auth).
 */
(function () {
  "use strict";

  var S = window.SPRINKLE;

  var STORAGE_KEY = "sprinkle:auth";
  var USERNAME_MIN = 3;
  var USERNAME_MAX = 50;
  var PASSWORD_MIN = 8;
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var FIELDS = [
    {
      key: "username",
      label: "Username",
      type: "text",
      placeholder: "octocat",
      help: "3-50 characters, used as your handle.",
      registerOnly: true,
    },
    {
      key: "email",
      label: "Email",
      type: "email",
      placeholder: "you@example.com",
      help: "",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      placeholder: "at least 8 characters",
      help: "At least 8 characters.",
    },
  ];

  var COPY = {
    login: {
      title: "Log in to Sprinkle",
      lede: "Use your email and password to restore your session.",
      submit: "Log in",
      autocomplete: "current-password",
      switchText: "No account yet?",
      switchLabel: "Sign up",
    },
    register: {
      title: "Create your account",
      lede: "Pick a username and email — the demo skips verification.",
      submit: "Sign up",
      autocomplete: "new-password",
      switchText: "Already registered?",
      switchLabel: "Log in",
    },
  };

  var overlay = null;
  var closeTimer = 0;
  var lastFocus = null;
  var pending = false;
  var mode = "login";
  var session = readSession();

  function readSession() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!raw || typeof raw !== "object" || typeof raw.id !== "string") {
        return null;
      }
      return raw;
    } catch (e) {
      return null;
    }
  }

  function storeSession(next) {
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function toSession(account) {
    return {
      id: account.id,
      username: account.username || "",
      email: account.email || "",
      role: account.role || "users",
      updatedAt: new Date().toISOString(),
    };
  }

  function initials(name) {
    var clean = String(name || "").trim();
    if (!clean) return "?";

    var words = clean.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }

    var packed = clean.replace(/[^a-zA-Z0-9]/g, "");
    return (packed || clean).slice(0, 2).toUpperCase();
  }

  function fieldOf(key) {
    return overlay ? overlay.querySelector('[data-field="' + key + '"]') : null;
  }

  function inputValue(key) {
    var field = fieldOf(key);
    var input = field ? field.querySelector("input") : null;
    return input ? input.value : "";
  }

  function build() {
    if (overlay) return overlay;

    var fields = FIELDS.map(function (spec) {
      return (
        '<label class="auth-field" data-field="' +
        spec.key +
        '">' +
        '<span class="auth-field-label">' +
        spec.label +
        "</span>" +
        '<input class="auth-input" type="' +
        spec.type +
        '" name="auth-' +
        spec.key +
        '" placeholder="' +
        spec.placeholder +
        '" autocomplete="off" spellcheck="false" />' +
        (spec.help
          ? '<span class="auth-field-help">' + spec.help + "</span>"
          : "") +
        '<span class="auth-field-error" hidden></span>' +
        "</label>"
      );
    }).join("");

    overlay = document.createElement("div");
    overlay.className = "auth-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">' +
      '<button type="button" class="icon-btn auth-close" aria-label="Close">' +
      S.icons.lucide("x", "icon-sm") +
      "</button>" +
      '<h2 class="auth-title" id="auth-title"></h2>' +
      '<p class="auth-lede"></p>' +
      '<div class="auth-tabs" role="tablist">' +
      '<button type="button" class="auth-tab" role="tab" data-auth-mode="login">Log in</button>' +
      '<button type="button" class="auth-tab" role="tab" data-auth-mode="register">Sign up</button>' +
      "</div>" +
      '<form class="auth-form" novalidate>' +
      fields +
      '<p class="auth-note" role="alert" hidden></p>' +
      '<button type="submit" class="auth-submit"></button>' +
      "</form>" +
      '<p class="auth-switch">' +
      '<span class="auth-switch-text"></span>' +
      '<button type="button" class="auth-switch-btn" data-auth-mode-switch></button>' +
      "</p>" +
      "</div>";

    overlay.querySelector(".auth-close").addEventListener("click", function () {
      close();
    });
    overlay.addEventListener("mousedown", function (event) {
      if (event.target === overlay) close();
    });
    overlay.addEventListener("click", function (event) {
      var tab = event.target.closest("[data-auth-mode]");
      if (tab) {
        apply(tab.getAttribute("data-auth-mode"));
        return;
      }
      var swap = event.target.closest("[data-auth-mode-switch]");
      if (swap) apply(mode === "login" ? "register" : "login");
    });
    overlay.querySelector("form").addEventListener("submit", submit);
    overlay.querySelector("form").addEventListener("input", function (event) {
      var input = event.target;
      var field = input.closest ? input.closest(".auth-field") : null;
      if (field) {
        var error = field.querySelector(".auth-field-error");
        if (error && !error.hidden) {
          error.hidden = true;
          error.textContent = "";
          input.classList.remove("invalid");
        }
      }
      showNote("");
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function render() {
    var copy = COPY[mode];
    overlay.querySelector(".auth-title").textContent = copy.title;
    overlay.querySelector(".auth-lede").textContent = copy.lede;
    overlay.querySelector(".auth-submit").textContent = copy.submit;
    overlay.querySelector(".auth-switch-text").textContent = copy.switchText;
    overlay.querySelector("[data-auth-mode-switch]").textContent =
      copy.switchLabel;

    overlay.querySelectorAll("[data-auth-mode]").forEach(function (tab) {
      var active = tab.getAttribute("data-auth-mode") === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    FIELDS.forEach(function (spec) {
      var field = fieldOf(spec.key);
      if (!field) return;
      field.hidden = !!(spec.registerOnly && mode === "login");
      var input = field.querySelector("input");
      input.autocomplete =
        spec.key === "password"
          ? copy.autocomplete
          : spec.key === "email"
            ? "email"
            : "username";
      if (spec.key === "password") {
        input.placeholder = mode === "register" ? "at least 8 characters" : "";
      }
    });

    paintErrors({});
    showNote("");
  }

  function apply(nextMode) {
    mode = nextMode === "register" ? "register" : "login";
    render();
    var focusKey = mode === "register" ? "username" : "email";
    var input = fieldOf(focusKey).querySelector("input");
    if (input) input.focus();
  }

  function showNote(message) {
    var note = overlay.querySelector(".auth-note");
    if (!message) {
      note.hidden = true;
      note.textContent = "";
      return;
    }
    note.hidden = false;
    note.innerHTML = S.escapeHtml(message);
  }

  function paintErrors(errors) {
    FIELDS.forEach(function (spec) {
      var field = fieldOf(spec.key);
      var error = field.querySelector(".auth-field-error");
      var input = field.querySelector("input");
      var message = errors[spec.key];
      error.hidden = !message;
      error.textContent = message || "";
      input.classList.toggle("invalid", !!message);
    });
  }

  function validate() {
    var username = inputValue("username").trim();
    var email = inputValue("email").trim();
    var password = inputValue("password");
    var errors = {};

    if (mode === "register") {
      if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
        errors.username =
          "Use between " +
          USERNAME_MIN +
          " and " +
          USERNAME_MAX +
          " characters.";
      }
    }
    if (!EMAIL_PATTERN.test(email)) {
      errors.email = "Enter a valid email address.";
    }
    if (password.length < PASSWORD_MIN) {
      errors.password = "Use at least " + PASSWORD_MIN + " characters.";
    }

    return {
      errors: errors,
      username: username,
      email: email,
      password: password,
    };
  }

  function setPending(next) {
    pending = next;
    var submitBtn = overlay.querySelector(".auth-submit");
    submitBtn.disabled = next;
    submitBtn.classList.toggle("busy", next);
    submitBtn.textContent = next
      ? mode === "register"
        ? "Creating account..."
        : "Signing in..."
      : COPY[mode].submit;
  }

  function submit(event) {
    event.preventDefault();
    if (pending || !S.api) return;

    var check = validate();
    paintErrors(check.errors);
    if (Object.keys(check.errors).length) return;

    setPending(true);

    var request =
      mode === "register"
        ? S.api.register({
            username: check.username,
            email: check.email,
            password: check.password,
          })
        : S.api.login({ email: check.email, password: check.password });

    request
      .then(function (res) {
        setPending(false);

        var account = res.data;
        if (!res.ok || !account || !account.id) {
          showNote(
            res.message ||
              (mode === "register"
                ? "Could not create the account."
                : "Could not log you in."),
          );
          return;
        }

        session = toSession(account);
        storeSession(session);
        sync();
        close();
        S.showToast(
          (mode === "register"
            ? "Account created — welcome, "
            : "Welcome back, ") + session.username,
          "info",
        );
      })
      .catch(function () {
        setPending(false);
        showNote("The gateway is unreachable. Is `bun run dev` listening?");
      });
  }

  function open(nextMode, trigger) {
    build();
    lastFocus = trigger || document.activeElement;
    mode = nextMode === "register" ? "register" : "login";
    render();

    window.clearTimeout(closeTimer);
    overlay.hidden = false;
    document.documentElement.classList.add("auth-open");
    document.addEventListener("keydown", onKeydown);

    requestAnimationFrame(function () {
      overlay.classList.add("open");
      var input = fieldOf(mode === "register" ? "username" : "email");
      if (input) input.querySelector("input").focus();
    });
  }

  function close() {
    if (!overlay || overlay.hidden) return;

    overlay.classList.remove("open");
    document.documentElement.classList.remove("auth-open");
    document.removeEventListener("keydown", onKeydown);

    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(function () {
      overlay.hidden = true;
    }, 180);

    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key !== "Tab") return;

    var focusables = visibleInputs();
    if (!focusables.length) return;

    var first = focusables[0];
    var last = focusables[focusables.length - 1];

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  }

  function visibleInputs() {
    return Array.prototype.slice
      .call(overlay.querySelectorAll("button, input, [href]"))
      .filter(function (node) {
        if (node.disabled) return false;
        if (node.type === "hidden") return false;
        var field = node.closest(".auth-field");
        if (field && field.hidden) return false;
        return node.offsetParent !== null;
      });
  }

  function sync() {
    var btn = document.getElementById("profile-btn");
    var menu = document.getElementById("profile-menu");
    if (!btn || !menu) return;

    var signedIn = !!session;
    var guest = menu.querySelector("[data-auth-guest]");
    var user = menu.querySelector("[data-auth-user]");

    if (guest) guest.hidden = signedIn;
    if (user) user.hidden = !signedIn;

    btn.classList.toggle("signed-in", signedIn);
    btn.setAttribute(
      "aria-label",
      signedIn ? "Open account menu" : "Log in or sign up",
    );

    var icon = btn.querySelector(".avatar-icon");
    var mark = btn.querySelector(".avatar-initials");
    if (icon) icon.hidden = signedIn;
    if (mark) {
      mark.hidden = !signedIn;
      mark.textContent = signedIn ? initials(session.username) : "";
    }

    if (!signedIn) return;

    var link = menu.querySelector("[data-auth-profile-link]");
    if (link) {
      link.href =
        "profile.html?user=" + encodeURIComponent(session.username) + "&me=1";
    }
    var avatar = menu.querySelector(".dropdown-avatar");
    if (avatar) avatar.textContent = initials(session.username);
    var name = menu.querySelector("[data-auth-name]");
    if (name) name.textContent = session.username;
    var handle = menu.querySelector("[data-auth-handle]");
    if (handle) handle.textContent = "@" + session.username;
    var email = menu.querySelector("[data-auth-email]");
    if (email) {
      email.textContent = session.email;
      email.hidden = !session.email;
    }
    var role = menu.querySelector("[data-auth-role]");
    if (role) {
      role.hidden = session.role !== "builder";
      role.textContent = "builder";
    }
  }

  function logout() {
    session = null;
    storeSession(null);
    sync();
    S.showToast("Signed out — session cookies expire on their own.", "info");
  }

  function refresh() {
    if (!session || !S.api || !S.api.getUserByUsername) return;

    S.api
      .getUserByUsername(session.username)
      .then(function (res) {
        if (!res.ok) {
          if (res.status === 404 || res.status === 401) {
            session = null;
            storeSession(null);
            sync();
          }
          return;
        }
        var account = res.data;
        if (!account || !account.id) return;
        session = toSession(account);
        storeSession(session);
        sync();
      })
      .catch(function () {});
  }

  document.addEventListener("click", function (event) {
    if (!event.target.closest) return;

    var opener = event.target.closest("[data-auth-open]");
    if (opener) {
      open(opener.getAttribute("data-auth-open"), opener);
      return;
    }
    if (event.target.closest("[data-auth-logout]")) logout();
  });

  S.auth = {
    session: function () {
      return session;
    },
    isLoggedIn: function () {
      return !!session;
    },
    open: open,
    close: close,
    logout: logout,
    sync: sync,
    mount: function () {
      sync();
      refresh();
    },
  };
  S.openAuth = open;
})();
