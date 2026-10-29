

(function () {
  "use strict";

  var S = window.SPRINKLE;

  document.addEventListener("DOMContentLoaded", function () {
    S.injectHeader(function () {
      S.initHeader();
      if (S.hydrateIcons) S.hydrateIcons(document.body);
      initProfile();
    });
  });

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  function initialsOf(user) {
    return (
      user
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .split(" ")
        .slice(0, 2)
        .map(function (w) {
          return w.charAt(0).toUpperCase();
        })
        .join("") || user.slice(0, 2).toUpperCase()
    );
  }


  var SOCIAL_ICONS = {
    x: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    github:
      '<svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
    linkedin:
      '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  };

  function initProfile() {
    var params = new URLSearchParams(location.search);
    var owner = params.get("user") || "sprinkle-labs";
    var CURRENT_USER = "sprinkle-labs";
    var isMe = params.get("me") === "1" || owner === CURRENT_USER;


    document.title = isMe ? "Your profile — Sprinkle" : owner + " — Sprinkle";
    var nameEl = document.getElementById("profile-name");
    var userEl = document.getElementById("profile-username");
    var avatarEl = document.getElementById("profile-avatar");
    if (nameEl) nameEl.textContent = owner;
    if (userEl) userEl.textContent = "@" + owner.replace(/[^\w]+/g, "_").toLowerCase();
    if (avatarEl) avatarEl.textContent = initialsOf(owner);


    if (isMe) {
      var badge = document.getElementById("you-badge");
      if (badge) badge.hidden = false;
    }


    var socialEl = document.getElementById("profile-social");
    if (socialEl) {
      var links = [
        {
          key: "x",
          href: "https://x.com/" + encodeURIComponent(owner),
        },
        {
          key: "github",
          href: "https://github.com/" + encodeURIComponent(owner),
        },
        {
          key: "linkedin",
          href: "https://www.linkedin.com/in/" + encodeURIComponent(owner),
        },
      ];
      socialEl.innerHTML = links
        .map(function (l) {
          return (
            '<a class="social-link" href="' +
            escapeText(l.href) +
            '" target="_blank" rel="noopener noreferrer">' +
            SOCIAL_ICONS[l.key] +
            "<span>" +
            escapeText(owner) +
            "</span></a>"
          );
        })
        .join("");
    }


    var items = [];


    function renderChips() {
      var chipsEl = document.getElementById("profile-chips");
      if (!chipsEl) return;

      var freq = {};
      items.forEach(function (card) {
        (card.categories || [])
          .concat(card.hashtags || [])
          .forEach(function (tag) {
            if (!tag) return;
            freq[tag] = (freq[tag] || 0) + 1;
          });
      });
      var chips = Object.keys(freq)
        .sort(function (a, b) {
          return freq[b] - freq[a] || a.localeCompare(b);
        })
        .slice(0, 12);
      if (chips.length) {
        chipsEl.innerHTML = chips
          .map(function (tag) {
            return '<span class="fchip">#' + escapeText(tag) + "</span>";
          })
          .join("");
      }
    }


    var grid = document.getElementById("profile-results");
    var search = document.getElementById("profile-search");
    var countEl = document.getElementById("profile-count");

    function render(query) {
      var matched = items.filter(function (card) {
        return S.cardMatches(card, query);
      });

      if (grid) {
        grid.innerHTML = matched
          .map(function (card) {
            return S.cardHtml(card, false);
          })
          .join("");

        if (!matched.length) {
          grid.innerHTML =
            '<div class="grid-empty">' +
            (items.length
              ? "No projects match <strong>" +
                escapeText(query) +
                "</strong>."
              : escapeText(owner) + " has no published projects yet.") +
            "</div>";
        }

        if (S.applyCardStates) S.applyCardStates(grid);
      }
      if (countEl) countEl.textContent = String(matched.length);
    }

    render("");

    S.api
      .listExtensions({ developer: owner, limit: 60 })
      .then(function (res) {
        items = res.ok && res.data ? S.cardsFrom(res.data.items || []) : [];
        renderChips();
        render("");
      });

    if (search) {
      search.addEventListener("input", function () {
        render(search.value.trim().toLowerCase());
      });
    }


    var searchToggle = document.getElementById("profile-search-toggle");
    var searchBox = document.getElementById("profile-search-box");
    function closeSearch() {
      if (search && search.value) {
        search.value = "";
        render("");
      }
      if (searchBox) searchBox.classList.remove("open");
      if (searchToggle) {
        searchToggle.classList.remove("open");
        searchToggle.setAttribute("aria-expanded", "false");
      }
    }
    if (searchToggle && searchBox) {
      searchToggle.addEventListener("click", function () {
        var isOpen = searchToggle.getAttribute("aria-expanded") === "true";
        if (isOpen) {
          closeSearch();
        } else {
          searchBox.classList.add("open");
          searchToggle.classList.add("open");
          searchToggle.setAttribute("aria-expanded", "true");

          if (search) window.setTimeout(function () { search.focus(); }, 140);
        }
      });
    }
    if (search) {
      search.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          closeSearch();
          search.blur();
        }
      });
    }


    function toast(msg) {
      if (S.showToast) S.showToast(msg, "save");
    }
    function on(id, fn) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    }


    var ghLink = document.getElementById("profile-github-link");
    if (ghLink) ghLink.href = "https://github.com/" + encodeURIComponent(owner);


    var followBtn = document.getElementById("profile-follow-btn");
    if (followBtn) {
      followBtn.addEventListener("click", function () {
        var isOn = followBtn.getAttribute("aria-pressed") !== "true";
        followBtn.classList.toggle("active", isOn);
        followBtn.setAttribute("aria-pressed", String(isOn));
        var label = followBtn.querySelector(".btn-label");
        if (label) label.textContent = isOn ? "Following" : "Follow";
        toast(isOn ? "Now following " + owner : "Unfollowed " + owner);
      });
    }


    if (isMe) {
      if (followBtn) followBtn.hidden = true;
      if (ghLink) ghLink.hidden = true;
      on("profile-edit-btn", function () {
        toast("Edit profile — coming soon");
      });
      on("profile-settings-btn", function () {
        toast("Settings — coming soon");
      });
      var editBtn = document.getElementById("profile-edit-btn");
      var settingsBtn = document.getElementById("profile-settings-btn");
      if (editBtn) editBtn.hidden = false;
      if (settingsBtn) settingsBtn.hidden = false;
    }
  }
})();
