/* ==========================================================================
 * interactions.js — Micro-interaction layer shared by both pages:
 * toast notifications, persisted like/save state (localStorage), card
 * click/keyboard delegation, and press ripples on action buttons.
 * Extends window.SPRINKLE; must load after sprinkle-data.js.
 * ========================================================================== */

(function () {
  "use strict";

  var S = window.SPRINKLE;

  /* ─── Persisted state (likes + saves) ─────────────────────────────────── */

  function readState(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeState(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* private mode / quota — keep the UI working in-memory */
    }
  }

  var likes = readState("sprinkle:likes");
  var saves = readState("sprinkle:saves");

  function toggleIn(map, key) {
    var next;
    if (map[key]) {
      delete map[key];
      next = false;
    } else {
      map[key] = true;
      next = true;
    }
    return next;
  }

  S.isLiked = function (id) {
    return !!likes[id];
  };
  S.isSaved = function (id) {
    return !!saves[id];
  };

  /* ─── Toast ────────────────────────────────────────────────────────────── */

  var ICONS = {
    like: S.icons.thumbsUp,
    save: function (cls) {
      return S.icons.lucide("bookmark", cls);
    },
    unsave: function (cls) {
      return S.icons.lucide("bookmark", cls);
    },
    copy: function (cls) {
      return (
        '<svg class="' +
        cls +
        '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
        'aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
      );
    },
    info: function (cls) {
      return (
        '<svg class="' +
        cls +
        '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
        'aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
      );
    },
  };

  S.showToast = function (message, kind) {
    var wrap = document.getElementById("toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toast-wrap";
      wrap.className = "toast-wrap";
      wrap.setAttribute("role", "status");
      wrap.setAttribute("aria-live", "polite");
      document.body.appendChild(wrap);
    }

    var toast = document.createElement("div");
    toast.className = "toast" + (kind === "unsave" ? " toast-muted" : "");
    var iconFn = ICONS[kind] || ICONS.info;
    toast.innerHTML =
      '<span class="toast-icon">' +
      iconFn("icon-14") +
      "</span>" +
      "<span>" +
      message +
      "</span>";
    wrap.appendChild(toast);

    /* entrance animation, then auto-dismiss */
    requestAnimationFrame(function () {
      toast.classList.add("show");
    });
    setTimeout(function () {
      toast.classList.remove("show");
      toast.addEventListener("transitionend", function () {
        toast.remove();
      });
      setTimeout(function () {
        if (toast.parentNode) toast.remove();
      }, 400);
    }, 2200);
  };

  /* ─── Card interactions (like / save) ─────────────────────────────────── */

  function cardName(el) {
    var user = el.querySelector(".card-title .user");
    var repo = el.querySelector(".card-title .repo");
    if (user && repo) return user.textContent + "/" + repo.textContent;
    return el.getAttribute("data-card-id") || "Item";
  }

  function syncLike(el) {
    var btn = el.querySelector('[data-action="like"]');
    var count = btn && btn.querySelector(".clap-count");
    if (!btn || !count) return;
    var liked = S.isLiked(el.getAttribute("data-card-id"));
    btn.classList.toggle("liked", liked);
    btn.setAttribute("aria-pressed", String(liked));
    count.textContent = S.formatClaps(
      Number(el.getAttribute("data-claps")) + (liked ? 1 : 0),
    );
  }

  function syncSave(el) {
    var btn = el.querySelector('[data-action="save"]');
    if (!btn) return;
    var saved = S.isSaved(el.getAttribute("data-card-id"));
    btn.classList.toggle("saved", saved);
    btn.setAttribute("aria-pressed", String(saved));
    btn.setAttribute("aria-label", saved ? "Remove from saved" : "Save");
  }

  function handleCardAction(target) {
    var card = target.closest(".app-card");
    if (!card) return;
    var id = card.getAttribute("data-card-id");
    if (!id) return;
    var action = target.getAttribute("data-action");

    if (action === "like") {
      var liked = toggleIn(likes, id);
      writeState("sprinkle:likes", likes);
      target.classList.add("pop");
      target.addEventListener(
        "animationend",
        function () {
          target.classList.remove("pop");
        },
        { once: true },
      );
      syncLike(card);
      S.showToast(
        liked
          ? "Liked " + cardName(card)
          : "Removed like from " + cardName(card),
        liked ? "like" : "unsave",
      );
    } else if (action === "save") {
      var saved = toggleIn(saves, id);
      writeState("sprinkle:saves", saves);
      target.classList.add("pop");
      target.addEventListener(
        "animationend",
        function () {
          target.classList.remove("pop");
        },
        { once: true },
      );
      syncSave(card);
      S.showToast(
        saved ? "Saved " + cardName(card) : "Unsaved " + cardName(card),
        saved ? "save" : "unsave",
      );
    }
  }

  document.addEventListener(
    "click",
    function (event) {
      var actionEl = event.target.closest(".app-card [data-action]");
      if (!actionEl) return;
      /* keep the card's <a> from navigating to the detail page */
      event.preventDefault();
      event.stopPropagation();
      handleCardAction(actionEl);
    },
    true,
  );

  /* Enter/Space activate role=button spans inside cards */
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var actionEl = event.target.closest(".app-card [data-action]");
    if (!actionEl) return;
    event.preventDefault();
    event.stopPropagation();
    handleCardAction(actionEl);
  });

  /* Apply persisted liked/saved classes right after a grid render */
  S.applyCardStates = function (root) {
    (root || document)
      .querySelectorAll(".app-card[data-card-id]")
      .forEach(function (card) {
        syncLike(card);
        syncSave(card);
      });
  };

  /* ─── Press ripple ────────────────────────────────────────────────────── */

  var RIPPLE_SELECTOR =
    ".premium-btn, .download-btn, .pill-btn, .action-btn, .filter-btn, .tab-btn, .square-btn, .copy-btn, .license-chip";

  document.addEventListener("pointerdown", function (event) {
    var btn = event.target.closest(RIPPLE_SELECTOR);
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 2;
    var ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = event.clientX - rect.left - size / 2 + "px";
    ripple.style.top = event.clientY - rect.top - size / 2 + "px";
    btn.appendChild(ripple);
    ripple.addEventListener(
      "animationend",
      function () {
        ripple.remove();
      },
      { once: true },
    );
  });

  /* ─── Header buttons: click-outside to close profile menu ─────────────── */
  /* (profile menu already handled in sprinkle-data initHeader) */

  /* Premium button feedback */
  document.addEventListener("click", function (event) {
    var premium = event.target.closest("#premium-btn");
    if (premium) S.showToast("Sprinkle Premium — coming soon", "info");
  });

  /* ─── Page transition: restrained opacity-only fade, nothing flashier ─── */

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function exitThenGo(url) {
    /* restart the brand sweep so buffering carries through the hand-off —
       the outgoing page keeps sweeping until unload, the incoming page
       picks up its own bar */
    if (S.startLoadBar) S.startLoadBar();
    if (reducedMotion) {
      location.href = url;
      return;
    }
    document.documentElement.classList.add("exiting");
    setTimeout(function () {
      location.href = url;
    }, 140);
  }

  /* Internal link clicks fade out briefly, then navigate. The already-active
     tab (same URL) does nothing at all — no pointless reload. */
  document.addEventListener("click", function (event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    var link = event.target.closest ? event.target.closest("a[href]") : null;
    if (!link) return;
    var raw = link.getAttribute("href");
    if (!raw || raw.charAt(0) === "#" || /^javascript:/i.test(raw)) return;
    if (link.host && link.host !== location.host) return; /* external */
    if (
      link.pathname === location.pathname &&
      link.search === location.search
    ) {
      event.preventDefault(); /* active tab clicked */
      return;
    }
    event.preventDefault();
    exitThenGo(link.href);
  });

  /* bfcache restores a snapshot taken while `.exiting` was applied —
     clear it whenever a page is shown again. */
  window.addEventListener("pageshow", function () {
    document.documentElement.classList.remove("exiting");
  });

  /* ─── "More actions" dropdown on the ⋮ (square-btn) buttons ───────────── */

  var MORE_ITEMS = [
    {
      icon: "git-pull-request",
      label: "View Pull Request",
      toast: "Opening pull requests (demo)",
    },
    {
      icon: "book-open",
      label: "How to Use",
      toast: "Opening usage guide (demo)",
    },
    {
      icon: "flag",
      label: "Report Extension",
      toast: "Report submitted — thank you!",
      danger: true,
    },
  ];

  function initMoreMenus() {
    document.querySelectorAll(".square-btn").forEach(function (btn) {
      if (btn.closest(".dropdown")) return; /* already wired */

      var wrap = document.createElement("div");
      wrap.className = "dropdown ext-more-dropdown";
      btn.parentNode.insertBefore(wrap, btn);
      wrap.appendChild(btn);

      var menu = document.createElement("div");
      menu.className = "dropdown-menu ext-more-menu";
      menu.innerHTML = MORE_ITEMS.map(function (item) {
        return (
          '<button type="button" class="dropdown-item' +
          (item.danger ? " danger" : "") +
          '" data-toast="' +
          item.toast +
          '">' +
          S.icons.lucide(item.icon, "icon-sm") +
          "<span>" +
          item.label +
          "</span></button>"
        );
      }).join("");
      wrap.appendChild(menu);

      btn.setAttribute("aria-haspopup", "true");
      btn.setAttribute("aria-expanded", "false");

      btn.addEventListener("click", function (event) {
        event.stopPropagation();
        var open = menu.classList.toggle("open");
        btn.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", String(open));
      });

      menu.addEventListener("click", function (event) {
        var item = event.target.closest(".dropdown-item");
        if (!item) return;
        menu.classList.remove("open");
        btn.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        S.showToast(item.getAttribute("data-toast"), "info");
      });
    });

    /* one shared outside-click closer for every menu */
    document.addEventListener("click", function () {
      document
        .querySelectorAll(".ext-more-dropdown .dropdown-menu.open")
        .forEach(function (menu) {
          menu.classList.remove("open");
          var trigger = menu.parentNode.querySelector(".square-btn");
          if (trigger) {
            trigger.classList.remove("open");
            trigger.setAttribute("aria-expanded", "false");
          }
        });
    });
  }

  /* ─── Generic demo-toast hooks (buttons marked in HTML) ───────────────── */

  document.addEventListener("click", function (event) {
    var el = event.target.closest("[data-demo-toast]");
    if (el) S.showToast(el.getAttribute("data-demo-toast"), "info");
  });

  /* ─── License chip / line — click opens a details popover ─────────────── */

  var GROUP_ICONS = {
    allowed: "circle-check",
    warn: "triangle-alert",
    denied: "ban",
  };

  function buildLicensePop(lic) {
    var pop = document.createElement("div");
    pop.className = "license-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", lic.name + " details");

    /* groups rendered as a 3-column table — one column per kind, rows
       aligned across groups, empty cells dashed */
    var maxRows = 0;
    lic.groups.forEach(function (g) {
      if (g.items.length > maxRows) maxRows = g.items.length;
    });
    var headHtml = lic.groups
      .map(function (g) {
        return (
          '<th class="col-' +
          g.kind +
          '">' +
          S.icons.lucide(GROUP_ICONS[g.kind], "icon-sm") +
          "<span>" +
          g.label +
          "</span></th>"
        );
      })
      .join("");
    var bodyHtml = "";
    for (var r = 0; r < maxRows; r++) {
      bodyHtml += "<tr>";
      lic.groups.forEach(function (g) {
        bodyHtml += g.items[r]
          ? '<td class="col-' + g.kind + '">' + g.items[r] + "</td>"
          : '<td class="col-' + g.kind + ' empty">—</td>';
      });
      bodyHtml += "</tr>";
    }

    pop.innerHTML =
      '<div class="lic-pop-head">' +
      '<span class="lic-pop-icon">' +
      S.icons.lucide("scale", "icon-14") +
      "</span>" +
      '<div class="lic-pop-names">' +
      '<div class="lic-pop-title">' +
      lic.name +
      "</div>" +
      '<div class="lic-pop-sub">' +
      lic.tagline +
      "</div>" +
      "</div>" +
      '<button type="button" class="lic-pop-close" aria-label="Close license details">' +
      S.icons.lucide("x", "icon-sm") +
      "</button>" +
      "</div>" +
      '<p class="lic-pop-summary">' +
      lic.summary +
      "</p>" +
      '<table class="lic-table"><thead><tr>' +
      headHtml +
      "</tr></thead><tbody>" +
      bodyHtml +
      "</tbody></table>" +
      '<div class="lic-pop-foot">' +
      '<button type="button" class="lic-btn lic-read">' +
      S.icons.lucide("external-link", "icon-sm") +
      "<span>Read full text</span></button>" +
      '<button type="button" class="lic-btn lic-copy">' +
      S.icons.lucide("copy", "icon-sm") +
      "<span>Copy " +
      lic.spdx +
      "</span></button>" +
      "</div>";
    return pop;
  }

  function attachLicensePop(anchor, lic) {
    /* wrap the anchor so the popover can be positioned beneath it */
    var wrap = document.createElement("span");
    wrap.className = "lic-wrap";
    anchor.parentNode.insertBefore(wrap, anchor);
    wrap.appendChild(anchor);

    var pop = buildLicensePop(lic);
    wrap.appendChild(pop);

    anchor.setAttribute("aria-haspopup", "dialog");
    anchor.setAttribute("aria-expanded", "false");

    function setOpen(open) {
      pop.classList.toggle("open", open);
      anchor.classList.toggle("open", open);
      anchor.setAttribute("aria-expanded", String(open));
    }

    anchor.addEventListener("click", function (event) {
      event.stopPropagation();
      setOpen(!pop.classList.contains("open"));
    });

    pop.addEventListener("click", function (event) {
      event.stopPropagation(); /* clicks inside keep it open */
      if (event.target.closest(".lic-pop-close")) setOpen(false);
    });

    pop.querySelector(".lic-read").addEventListener("click", function () {
      S.showToast("Opening the " + lic.name + " full text (demo)", "info");
    });
    pop.querySelector(".lic-copy").addEventListener("click", function () {
      function done() {
        S.showToast("Copied SPDX identifier: " + lic.spdx, "copy");
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lic.spdx).then(done, done);
      } else {
        done(); /* file:// without clipboard API — still confirm to the user */
      }
    });

    return pop;
  }

  function initLicenseAnchors() {
    var closers = [];

    document.querySelectorAll(".license-chip").forEach(function (chip) {
      var lic = (S.LICENSES || {})[chip.getAttribute("data-license")];
      if (!lic) return;
      closers.push(attachLicensePop(chip, lic));
    });

    /* model-card license line gets a small "License details" trigger */
    document.querySelectorAll(".license-line").forEach(function (line) {
      var lic = (S.LICENSES || {})["apache-2.0"];
      if (!lic) return;
      var trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "lic-details";
      trigger.setAttribute("data-license", "apache-2.0");
      trigger.innerHTML =
        "<span>License details</span>" +
        S.icons.lucide("chevron-down", "icon-sm chevron");
      line.appendChild(trigger);
      closers.push(attachLicensePop(trigger, lic));
    });

    /* shared dismiss: click anywhere else, or Escape */
    function closeAll() {
      closers.forEach(function (pop) {
        if (!pop.classList.contains("open")) return;
        pop.classList.remove("open");
        var anchor = pop.previousElementSibling;
        if (anchor) {
          anchor.classList.remove("open");
          anchor.setAttribute("aria-expanded", "false");
        }
      });
    }
    document.addEventListener("click", closeAll);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeAll();
    });
  }

  document.addEventListener("DOMContentLoaded", initMoreMenus);
  document.addEventListener("DOMContentLoaded", initLicenseAnchors);
})();
