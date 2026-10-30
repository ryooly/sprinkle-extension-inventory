

(function () {
  "use strict";

  var S = window.SPRINKLE;



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

    }
  }

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

  S.isSaved = function (id) {
    return !!saves[id];
  };



  var ICONS = {
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



  function cardName(el) {
    var user = el.querySelector(".card-title .user");
    var repo = el.querySelector(".card-title .repo");
    if (user && repo) return user.textContent + "/" + repo.textContent;
    return el.getAttribute("data-card-id") || "Item";
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

    if (action === "save") {
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
      syncSavedExtension(card, id, saved);
    }
  }

  var UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function syncSavedExtension(card, id, saved) {
    if (!S.api) return;
    var extensionId = card.getAttribute("data-extension-id") || id;
    if (!UUID_RE.test(extensionId)) return;

    var call = saved
      ? S.api.saveExtension(extensionId)
      : S.api.unsaveExtension(extensionId);

    call.then(function (res) {
      if (res.ok) return;
      if (res.status === 401 || res.status === 403) return;
      toggleIn(saves, id);
      writeState("sprinkle:saves", saves);
      syncSave(card);
      S.showToast(
        res.message || "Unable to update saved extensions",
        "info",
      );
    });
  }

  document.addEventListener(
    "click",
    function (event) {
      var actionEl = event.target.closest(".app-card [data-action]");
      if (!actionEl) return;

      event.preventDefault();
      event.stopPropagation();
      handleCardAction(actionEl);
    },
    true,
  );


  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var actionEl = event.target.closest(".app-card [data-action]");
    if (!actionEl) return;
    event.preventDefault();
    event.stopPropagation();
    handleCardAction(actionEl);
  });


  S.applyCardStates = function (root) {
    (root || document)
      .querySelectorAll(".app-card[data-card-id]")
      .forEach(function (card) {
        syncSave(card);
      });
  };



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





  document.addEventListener("click", function (event) {
    var premium = event.target.closest("#premium-btn");
    if (!premium) return;
    event.preventDefault();
    if (S.openSubscription) {
      S.openSubscription(premium);
      return;
    }
    S.showToast("Sprinkle Premium — coming soon", "info");
  });



  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function exitThenGo(url) {

    try {
      sessionStorage.setItem("sprinkle:navAt", String(Date.now()));
    } catch (e) {}
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
    if (link.host && link.host !== location.host) return;
    if (
      link.pathname === location.pathname &&
      link.search === location.search
    ) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    exitThenGo(link.href);
  });


  window.addEventListener("pageshow", function (event) {
    document.documentElement.classList.remove("exiting");
    if (event.persisted && S.startLoadBar) S.startLoadBar(160);
  });

  (function initLoaderContinuity() {
    var navAt = 0;
    try {
      navAt = parseInt(sessionStorage.getItem("sprinkle:navAt"), 10) || 0;
      sessionStorage.removeItem("sprinkle:navAt");
    } catch (e) {}
    if (!navAt) return;
    var since = Date.now() - navAt;
    if (since < 0 || since > 15000) return;
    if (S.startLoadBar) S.startLoadBar(Math.max(0, 250 - since));
  })();



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
      if (btn.closest(".dropdown")) return;

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



  document.addEventListener("click", function (event) {
    var el = event.target.closest("[data-demo-toast]");
    if (el) S.showToast(el.getAttribute("data-demo-toast"), "info");
  });



  var GROUP_ICONS = {
    allowed: "circle-check",
    warn: "triangle-alert",
    denied: "ban",
  };

  var boundPops = [];

  function buildLicensePop(lic) {
    var pop = document.createElement("div");
    pop.className = "license-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", S.escapeHtml(lic.name) + " details");


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
          S.escapeHtml(g.label) +
          "</span></th>"
        );
      })
      .join("");
    var bodyHtml = "";
    for (var r = 0; r < maxRows; r++) {
      bodyHtml += "<tr>";
      lic.groups.forEach(function (g) {
        bodyHtml += g.items[r]
          ? '<td class="col-' + g.kind + '">' + S.escapeHtml(termLabel(g.items[r])) + "</td>"
          : '<td class="col-' + g.kind + ' empty">—</td>';
      });
      bodyHtml += "</tr>";
    }

    var tableHtml =
      maxRows > 0
        ? '<table class="lic-table"><thead><tr>' +
          headHtml +
          "</tr></thead><tbody>" +
          bodyHtml +
          "</tbody></table>"
        : "";

    pop.innerHTML =
      '<div class="lic-pop-head">' +
      '<span class="lic-pop-icon">' +
      S.icons.lucide("scale", "icon-14") +
      "</span>" +
      '<div class="lic-pop-names">' +
      '<div class="lic-pop-title">' +
      S.escapeHtml(lic.name) +
      "</div>" +
      '<div class="lic-pop-sub">' +
      S.escapeHtml(lic.tagline) +
      "</div>" +
      "</div>" +
      '<button type="button" class="lic-pop-close" aria-label="Close license details">' +
      S.icons.lucide("x", "icon-sm") +
      "</button>" +
      "</div>" +
      '<p class="lic-pop-summary">' +
      S.escapeHtml(lic.summary) +
      "</p>" +
      tableHtml +
      '<div class="lic-pop-foot">' +
      (lic.url
        ? '<a class="lic-btn lic-read" href="' +
          S.escapeHtml(lic.url) +
          '" target="_blank" rel="noopener noreferrer">' +
          S.icons.lucide("external-link", "icon-sm") +
          "<span>Read full text</span></a>"
        : '<button type="button" class="lic-btn lic-read" disabled>' +
          S.icons.lucide("external-link", "icon-sm") +
          "<span>No full text link</span></button>") +
      '<button type="button" class="lic-btn lic-copy">' +
      S.icons.lucide("copy", "icon-sm") +
      "<span>Copy " +
      S.escapeHtml(lic.spdx) +
      "</span></button>" +
      "</div>";
    return pop;
  }

  // Licence arrays arrive as SPDX-style slugs ("commercial-use"); print them
  // the way the old reference table did without inventing any extra terms.
  function termLabel(term) {
    return String(term)
      .replace(/[-_]+/g, " ")
      .replace(/^./, function (char) {
        return char.toUpperCase();
      });
  }

  function attachLicensePop(anchor, lic) {

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
      event.stopPropagation();
      if (event.target.closest(".lic-pop-close")) setOpen(false);
    });

    boundPops.push(pop);

    var copyBtn = pop.querySelector(".lic-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        function done() {
          S.showToast("Copied SPDX identifier: " + lic.spdx, "copy");
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(lic.spdx).then(done, done);
        } else {
          done();
        }
      });
    }

    return pop;
  }

  // The extension page owns the only licence payload that comes from the
  // database, so the popover is bound once the detail response has arrived.
  function bindExtensionLicense(extension) {
    if (!extension || !S.licenseOf) return;

    var line = document.querySelector(".license-line");
    if (!line || line.getAttribute("data-license-bound") === "true") return;
    if (!extension.licenseName && !extension.licenseKey) return;

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "lic-details";
    trigger.innerHTML =
      "<span>License details</span>" +
      S.icons.lucide("chevron-down", "icon-sm chevron");

    line.setAttribute("data-license-bound", "true");
    // The "View license" link already carries the .lic-details class, so the
    // new trigger goes in front of it rather than being mistaken for it.
    var link = document.getElementById("ext-license-link");
    if (link && link.parentNode === line) line.insertBefore(trigger, link);
    else line.appendChild(trigger);

    attachLicensePop(trigger, S.licenseOf(extension));
  }

  function closeAllLicensePops() {
    boundPops.forEach(function (pop) {
      if (!pop.classList.contains("open")) return;
      pop.classList.remove("open");
      var anchor = pop.previousElementSibling;
      if (anchor) {
        anchor.classList.remove("open");
        anchor.setAttribute("aria-expanded", "false");
      }
    });
  }

  function initLicenseAnchors() {
    document.addEventListener("click", closeAllLicensePops);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeAllLicensePops();
    });
  }

  S.bindExtensionLicense = bindExtensionLicense;

  document.addEventListener("DOMContentLoaded", initMoreMenus);
  document.addEventListener("DOMContentLoaded", initLicenseAnchors);
})();
