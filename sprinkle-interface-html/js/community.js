/*
 * Community discussions.
 * Draws the real comment threads of the current extension (GET
 * /comments/extension/:id) and lets a signed-in account start a discussion
 * (POST /comments/extension/:id) or reply to one (POST /comments/:id/replies).
 */
(function () {
  "use strict";

  var S = window.SPRINKLE;

  var ICON_BUBBLE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167' +
    'l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092' +
    'a10 10 0 1 0-4.777-4.719"/></svg>';

  var ICON_CHEVRON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  var ICON_TRASH =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    'width="14" height="14" aria-hidden="true">' +
    '<path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />' +
    '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />' +
    '<path d="M10 11v6" /><path d="M14 11v6" /></svg>';

  var AVATAR_COLORS = [
    "#0a7cff",
    "#22b558",
    "#8a3ffc",
    "#f43f6b",
    "#ffa400",
    "#00b2f0",
    "#0284c7",
  ];

  var MAX_LENGTH = 2000;

  var extension = null;
  var list = null;
  var composer = null;
  var input = null;
  var state = { loading: false, posting: false, deleting: false, threads: [], error: "" };

  document.addEventListener("DOMContentLoaded", bindPanel);

  function bindPanel() {
    list = document.getElementById("disc-list");
    composer = document.getElementById("disc-composer");
    input = document.getElementById("disc-input");

    var opener = document.getElementById("disc-new");
    if (opener) opener.addEventListener("click", openComposer);

    var cancel = document.getElementById("disc-cancel");
    if (cancel) cancel.addEventListener("click", closeComposer);

    if (composer) composer.addEventListener("submit", onDiscussionSubmit);

    if (list) {
      list.addEventListener("click", onListClick);
      list.addEventListener("submit", onReplySubmit);
    }
  }

  function openComposer() {
    if (!composer) return;

    if (!requireSession("Sign in to start a discussion.")) return;

    composer.hidden = false;
    if (input) {
      input.focus();
      input.select();
    }
  }

  function closeComposer() {
    if (!composer) return;
    composer.hidden = true;
    if (input) input.value = "";
  }

  function requireSession(message) {
    if (S.auth && S.auth.isLoggedIn()) return true;
    if (S.showToast) S.showToast(message, "info");
    if (S.auth) S.auth.open("login");
    return false;
  }

  function loadThreads() {
    if (!extension || !extension.id) return;

    state.loading = true;
    state.error = "";
    paint();

    S.api
      .listComments(extension.id)
      .then(function (res) {
        state.loading = false;
        if (!res.ok) {
          state.error = res.message || "Could not load the discussions.";
          state.threads = [];
        } else {
          state.threads = res.data || [];
        }
        syncCount();
        paint();
      })
      .catch(function () {
        state.loading = false;
        state.error = "The gateway is unreachable — try again shortly.";
        paint();
      });
  }

  function syncCount() {
    var total = 0;
    state.threads.forEach(function (thread) {
      total += 1 + (thread.replies ? thread.replies.length : 0);
    });

    var badge = document.getElementById("community-count");
    if (badge) badge.textContent = String(total);
  }

  function paint() {
    if (!list) return;

    if (state.loading) {
      list.innerHTML = note("Loading discussions…");
      return;
    }
    if (state.error) {
      list.innerHTML = note(state.error, true);
      return;
    }
    if (!state.threads.length) {
      list.innerHTML = note("No discussions yet — start the first one.");
      return;
    }

    list.innerHTML = state.threads.map(threadHtml).join("");
  }

  function note(text, isError) {
    return (
      '<p class="disc-note' +
      (isError ? " is-error" : "") +
      '">' +
      S.escapeHtml(text) +
      "</p>"
    );
  }

  function threadHtml(thread) {
    var replies = thread.replies || [];
    var parts = splitContent(thread.content);

    return (
      '<div class="disc-thread open" data-thread="' +
      S.escapeHtml(thread.id) +
      '">' +
      '<div class="discussion-item">' +
      avatarHtml(thread.authorUsername) +
      '<div class="discussion-body">' +
      '<div class="discussion-title">' +
      S.escapeHtml(parts.title) +
      "</div>" +
      metaHtml(thread.authorUsername, "opened", thread.createdAt) +
      (parts.body
        ? '<p class="disc-reply-text">' + S.escapeHtml(parts.body) + "</p>"
        : "") +
      deleteButtonHtml("thread", thread.id, thread.authorId) +
      "</div>" +
      '<span class="discussion-replies">' +
      ICON_BUBBLE +
      replies.length +
      "</span>" +
      toggleHtml(true) +
      "</div>" +
      '<div class="disc-replies"><div class="disc-replies-inner">' +
      (replies.length
        ? replies.map(replyHtml).join("")
        : note("No replies yet.")) +
      replyRowHtml() +
      "</div></div>" +
      "</div>"
    );
  }

  function replyHtml(reply) {
    return (
      '<div class="disc-reply" data-reply="' +
      S.escapeHtml(reply.id) +
      '">' +
      avatarHtml(reply.authorUsername) +
      '<div class="disc-reply-main">' +
      metaHtml(reply.authorUsername, "replied", reply.createdAt) +
      '<p class="disc-reply-text">' +
      S.escapeHtml(reply.content) +
      "</p>" +
      deleteButtonHtml("reply", reply.id, reply.authorId) +
      "</div>" +
      "</div>"
    );
  }

  function canDelete(authorId) {
    var session = S.auth && S.auth.session ? S.auth.session() : null;
    return !!(session && authorId && session.id === authorId);
  }

  function deleteButtonHtml(kind, id, authorId) {
    if (!canDelete(authorId)) return "";
    return (
      '<button type="button" class="disc-ghost disc-delete" ' +
      'data-delete-kind="' +
      kind +
      '" data-delete-id="' +
      S.escapeHtml(id) +
      '">' +
      ICON_TRASH +
      "<span>Delete</span></button>"
    );
  }

  function metaHtml(author, verb, date) {
    return (
      '<div class="discussion-meta"><span class="mono">' +
      S.escapeHtml(author) +
      "</span> · " +
      verb +
      " " +
      S.timeAgo(date) +
      "</div>"
    );
  }

  function avatarHtml(author) {
    return (
      '<span class="discussion-avatar" aria-hidden="true" style="background:' +
      colorFor(author) +
      '">' +
      S.escapeHtml(initials(author)) +
      "</span>"
    );
  }

  function toggleHtml(open) {
    return (
      '<button type="button" class="disc-toggle" aria-expanded="' +
      String(!!open) +
      '" aria-label="' +
      (open ? "Hide replies" : "Show replies") +
      '">' +
      ICON_CHEVRON +
      "</button>"
    );
  }

  function replyRowHtml() {
    return (
      '<div class="disc-reply-row">' +
      '<button type="button" class="disc-ghost disc-reply-btn">Reply</button>' +
      '<form class="disc-reply-form" hidden>' +
      '<textarea class="disc-input" rows="2" maxlength="' +
      MAX_LENGTH +
      '" placeholder="Add your reply…"></textarea>' +
      '<div class="disc-composer-actions">' +
      '<button type="button" class="disc-ghost disc-reply-cancel">' +
      "Cancel</button>" +
      '<button type="submit" class="primary-btn">Post reply</button>' +
      "</div>" +
      "</form>" +
      "</div>"
    );
  }

  function initials(author) {
    var clean = String(author || "?").replace(/[^A-Za-z0-9]/g, " ").trim();
    if (!clean) return "?";
    var words = clean.split(/\s+/);
    if (words.length > 1) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }

  function colorFor(author) {
    var value = String(author || "");
    var sum = 0;
    for (var i = 0; i < value.length; i += 1) sum += value.charCodeAt(i);
    return AVATAR_COLORS[sum % AVATAR_COLORS.length];
  }

  function splitContent(content) {
    var text = String(content || "").replace(/\r\n/g, "\n").trim();
    var cut = text.indexOf("\n");

    if (cut < 0 && text.length <= 90) return { title: text, body: "" };

    var head = cut < 0 ? text : text.slice(0, cut);
    var rest = cut < 0 ? "" : text.slice(cut + 1).trim();

    if (head.length > 90) {
      var trimmed = head.slice(0, 90);
      var lastSpace = trimmed.lastIndexOf(" ");
      var cutAt = lastSpace > 40 ? trimmed.slice(0, lastSpace) : trimmed;
      return { title: cutAt + "…", body: text };
    }

    return { title: head, body: rest };
  }

  function onListClick(event) {
    var toggle = event.target.closest(".disc-toggle");
    if (toggle) {
      var thread = toggle.closest(".disc-thread");
      var open = thread.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Hide replies" : "Show replies");
      return;
    }

    var replyBtn = event.target.closest(".disc-reply-btn");
    if (replyBtn) {
      if (!requireSession("Sign in to join the discussion.")) return;
      var form = replyBtn.parentNode.querySelector(".disc-reply-form");
      replyBtn.hidden = true;
      if (form) {
        form.hidden = false;
        form.querySelector("textarea").focus();
      }
      return;
    }

    var cancel = event.target.closest(".disc-reply-cancel");
    if (cancel) {
      var openForm = cancel.closest(".disc-reply-form");
      var row = openForm.parentNode.querySelector(".disc-reply-btn");
      openForm.hidden = true;
      openForm.querySelector("textarea").value = "";
      if (row) row.hidden = false;
      return;
    }

    var del = event.target.closest(".disc-delete");
    if (del) {
      handleDelete(
        del.getAttribute("data-delete-kind"),
        del.getAttribute("data-delete-id"),
        del,
      );
    }
  }

  function handleDelete(kind, id, button) {
    if (state.deleting || !id) return;
    if (!requireSession("Sign in to delete your messages.")) return;
    if (!window.confirm("Delete this message? This cannot be undone.")) return;

    state.deleting = true;
    if (button) button.disabled = true;

    var call =
      kind === "reply" ? S.api.deleteReply(id) : S.api.deleteComment(id);

    call
      .then(function (res) {
        state.deleting = false;
        if (button) button.disabled = false;
        if (!res.ok) {
          if (S.showToast) {
            S.showToast(
              res.message || "The gateway refused that deletion.",
              "error",
            );
          }
          return;
        }
        if (S.showToast) S.showToast("Message deleted.", "success");
        loadThreads();
      })
      .catch(function (err) {
        state.deleting = false;
        if (button) button.disabled = false;
        if (S.showToast) {
          S.showToast((err && err.message) || "Network error.", "error");
        }
      });
  }

  function onDiscussionSubmit(event) {
    event.preventDefault();
    if (state.posting) return;

    var content = input ? input.value.trim() : "";
    if (content.length < 2) {
      if (S.showToast) S.showToast("Write a little more first.", "info");
      return;
    }
    if (!requireSession("Sign in to start a discussion.")) return;

    setPosting(true);
    S.api
      .addComment(extension.id, content)
      .then(afterPost("Discussion posted."))
      .catch(showFailure);
  }

  function onReplySubmit(event) {
    event.preventDefault();

    var form = event.target.closest(".disc-reply-form");
    var holder = event.target.closest(".disc-thread");
    if (!form || !holder || state.posting) return;

    if (!requireSession("Sign in to join the discussion.")) return;

    var textarea = form.querySelector("textarea");
    var content = textarea ? textarea.value.trim() : "";
    if (content.length < 2) {
      if (S.showToast) S.showToast("Write a little more first.", "info");
      return;
    }

    setPosting(true);
    S.api
      .addReply(holder.getAttribute("data-thread"), content)
      .then(afterPost("Reply posted."))
      .catch(showFailure);
  }

  function afterPost(message) {
    return function (res) {
      setPosting(false);
      if (!res.ok) {
        if (S.showToast) {
          S.showToast(res.message || "The gateway refused that post.", "error");
        }
        return;
      }
      closeComposer();
      if (S.showToast) S.showToast(message, "success");
      loadThreads();
    };
  }

  function showFailure(err) {
    setPosting(false);
    if (S.showToast) {
      S.showToast((err && err.message) || "Network error.", "error");
    }
  }

  function setPosting(on) {
    state.posting = on;
    var submit = document.getElementById("disc-submit");
    if (submit) submit.disabled = on;
  }

  S.community = {
    init: function (loaded) {
      extension = loaded;

      var placeholder =
        "Ask the community about " + (loaded.name || "this extension") + "…";
      if (input) input.setAttribute("placeholder", placeholder);

      loadThreads();
    },
    reload: loadThreads,
  };
})();
