(function () {
  "use strict";

  var S = window.SPRINKLE;
  var current = { owner: "", name: "", id: "" };
  var SAVES_KEY = "sprinkle:saves";

  var SCALE_ICON =
    '<svg class="lic-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true">' +
    '<path d="M12 3v18"/><path d="m19 8 3 8a5 5 0 0 1-6 0zV7"/>' +
    '<path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1"/>' +
    '<path d="m5 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M7 21h10"/></svg>';

  var EXTERNAL_ICON =
    '<svg class="chip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11" aria-hidden="true">' +
    '<path d="M15 3h6v6"/><path d="M10 14 21 3"/>' +
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

  var ICON_DIR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';

  var ICON_FILE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>' +
    '<path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';

  var ICON_BACK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>';

  document.addEventListener("DOMContentLoaded", function () {
    var params = new URLSearchParams(location.search);
    var ctx = {
      id: params.get("id"),
      slug: params.get("slug"),
      user: params.get("user"),
    };

    S.injectHeader(function () {
      S.initHeader();
      if (S.hydrateIcons) S.hydrateIcons(document.body);
    });

    bindCopy();
    bindTabs(params);
    bindDemoToggles();
    renderSecScore(parseInt(textOf("sec-score", "data-score"), 10));

    loadExtension(ctx, function (extension) {
      current.id = extension.id;
      current.owner = extension.developer || "unknown";
      current.name = extension.name || "untitled";

      applyHeader(extension);
      renderNotes(extension);
      renderTags(extension);
      renderLicenseLine(extension);
      renderStats(extension);
      renderAuthor(extension);
      initSaveButton(extension);
      initDownload(extension);
      initFilesPage(extension);
      recordHistory(extension);

      if (S.applyCardStates) S.applyCardStates(document);
      S.api.incrementView(extension.id);
    });
  });

  var HISTORY_KEY = "sprinkle:history";
  var HISTORY_LIMIT = 20;

  function recordHistory(extension) {
    if (!extension || !extension.id) return;

    var rows = [];
    try {
      rows = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") || [];
    } catch (e) {
      rows = [];
    }

    rows = rows.filter(function (row) {
      return row && row.id !== extension.id;
    });
    rows.unshift({ id: extension.id, at: new Date().toISOString() });

    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(rows.slice(0, HISTORY_LIMIT)),
      );
    } catch (e) {}
  }

  function loadExtension(ctx, done) {
    if (ctx.id) {
      S.api.getExtension(ctx.id).then(function (res) {
        if (res.ok && res.data) done(res.data);
        else showLoadError(res.message || "Unable to load this extension.");
      });
      return;
    }

    if (ctx.slug) {
      S.api
        .listExtensions({
          name: ctx.slug,
          developer: ctx.user || undefined,
          limit: 1,
        })
        .then(function (res) {
          var item = res.ok && res.data && res.data.items && res.data.items[0];
          if (!item) {
            showLoadError("Extension not found.");
            return;
          }
          S.api.getExtension(item.id).then(function (detail) {
            if (detail.ok && detail.data) done(detail.data);
            else
              showLoadError(detail.message || "Unable to load this extension.");
          });
        });
      return;
    }

    showLoadError("Open an extension from the dashboard or search.");
  }

  var PLACEHOLDER_SELECTORS = [
    ".detail-header",
    ".ext-tabs",
    ".badge-strip",
    ".edit-link",
    ".stats-aside",
  ];

  function showLoadError(message) {
    var notes = document.getElementById("ext-notes");
    if (notes) {
      notes.innerHTML = '<p class="muted-fg">' + S.escapeHtml(message) + "</p>";
    }

    // The template ships with a sample extension baked in; hide it so an
    // unresolved id never displays another extension's data.
    PLACEHOLDER_SELECTORS.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        el.hidden = true;
      });
    });

    text("ext-heading", "Extension");
    document.title = "Extension — Sprinkle";

    if (S.showToast) S.showToast(message, "info");
  }

  function text(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function textOf(id, attribute) {
    var el = document.getElementById(id);
    return el ? el.getAttribute(attribute) || "" : "";
  }

  function applyHeader(extension) {
    var owner = current.owner;
    var name = current.name;
    var profileUrl = "profile.html?user=" + encodeURIComponent(owner);

    text("ext-owner", owner);
    text("ext-name", name);
    text("ext-heading", name);
    text("tree-owner", owner + "/" + name);
    text("badge-name", name.toUpperCase());
    text("badge-source", String(extension.source || "github").toUpperCase());
    text(
      "badge-status",
      extension.extensionStatus === "premium" ? "PREMIUM" : "BASIC",
    );
    text(
      "badge-license",
      extension.licenseKey || extension.licenseName || "NO LICENSE",
    );
    document.title = owner + "/" + name + " — Sprinkle";

    var ownerEl = document.getElementById("ext-owner");
    if (ownerEl && ownerEl.tagName === "A") ownerEl.href = profileUrl;

    if (extension.extensionLink) {
      var downloadBtn = document.querySelector(".download-btn");
      if (downloadBtn)
        downloadBtn.setAttribute("title", extension.extensionLink);
    }

    var aName = document.getElementById("author-name");
    var aHandle = document.getElementById("author-handle");
    var aAvatar = document.getElementById("author-avatar");
    var aGhLink = document.getElementById("author-github-link");
    if (aName) {
      aName.textContent = owner;
      aName.href = profileUrl;
    }
    if (aHandle) aHandle.textContent = "@" + owner;
    if (aAvatar) {
      aAvatar.textContent =
        owner
          .replace(/[^a-zA-Z0-9]+/g, " ")
          .trim()
          .split(" ")
          .slice(0, 2)
          .map(function (word) {
            return word.charAt(0).toUpperCase();
          })
          .join("") || owner.slice(0, 2).toUpperCase();
    }
    if (aGhLink) {
      aGhLink.href =
        "https://github.com/" + encodeURIComponent(String(owner).split("/")[0]);
    }

    var authorCard = document.querySelector(".author-card");
    if (authorCard) {
      authorCard.addEventListener("click", function (event) {
        if (
          event.target.closest(
            "#author-follow-btn, .author-follow, #author-github-link, .author-github, #author-name",
          )
        )
          return;
        if (S.startLoadBar) S.startLoadBar();
        location.href = profileUrl;
      });
    }
  }

  function renderNotes(extension) {
    var el = document.getElementById("ext-notes");
    if (!el) return;

    var notes = S.notesOf(extension).trim();
    if (!notes) {
      el.innerHTML =
        '<p class="muted-fg">No extension notes were published for this extension.</p>';
      return;
    }
    el.innerHTML = S.renderMarkdown(notes);
  }

  function renderTags(extension) {
    var row = document.getElementById("ext-tags");
    if (!row) return;

    var tags = (extension.hashtags || []).slice(0, 6);
    if (!tags.length) {
      tags = (extension.categories || []).map(function (category) {
        return String(category).replace(/_/g, "-");
      });
    }

    var html = tags
      .map(function (tag) {
        return (
          '<button type="button" class="hashtag" data-tag="' +
          S.escapeHtml(tag) +
          '" aria-label="Search extensions tagged ' +
          S.escapeHtml(tag) +
          '">[#' +
          S.escapeHtml(tag) +
          "]</button>"
        );
      })
      .join("");

    var licenseName = extension.licenseKey || extension.licenseName;
    if (licenseName) {
      var inner =
        SCALE_ICON +
        '<span class="chip-key">License:</span><span class="chip-val">' +
        S.escapeHtml(licenseName) +
        "</span>";
      html += extension.licenseUrl
        ? '<a class="license-chip" href="' +
          S.escapeHtml(extension.licenseUrl) +
          '" target="_blank" rel="noopener noreferrer">' +
          inner +
          EXTERNAL_ICON +
          "</a>"
        : '<span class="license-chip">' + inner + "</span>";
    }

    row.innerHTML = html;

    row.querySelectorAll(".hashtag").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tag = btn.getAttribute("data-tag");
        if (!tag) return;
        if (S.startLoadBar) S.startLoadBar();
        location.href = "index.html?search=" + encodeURIComponent(tag);
      });
    });
  }

  function renderLicenseLine(extension) {
    var textEl = document.getElementById("ext-license-text");
    if (!textEl) return;

    var licenseName = extension.licenseName || extension.licenseKey;
    if (!licenseName) {
      textEl.innerHTML =
        '<span class="lic-strong">No license was published</span>';
    } else {
      textEl.innerHTML =
        '<span class="lic-strong">' +
        S.escapeHtml(licenseName) +
        "</span>" +
        (extension.licenseDescription
          ? " — " + S.escapeHtml(extension.licenseDescription)
          : "");
    }

    var link = document.getElementById("ext-license-link");
    if (link) {
      if (extension.licenseUrl) {
        link.href = extension.licenseUrl;
        link.hidden = false;
      } else {
        link.hidden = true;
      }
    }
  }

  function renderStats(extension) {
    text("stat-views", S.formatCount(extension.views));
    text("stat-downloads", S.formatCount(extension.downloads));
    text(
      "stat-stars",
      extension.stars === null || extension.stars === undefined
        ? "—"
        : S.formatCount(extension.stars),
    );
    renderBrowsers(extension.supportedBrowsers || []);
    renderSecurity(extension);
    renderStack(extension);
  }

  function renderBrowsers(browsers) {
    var card = document.getElementById("browser-card");
    if (!card) return;

    if (!browsers.length) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    card.querySelectorAll("[data-browser]").forEach(function (chip) {
      chip.hidden = browsers.indexOf(chip.getAttribute("data-browser")) === -1;
    });
  }

  function renderSecurity(extension) {
    var box = document.getElementById("sec-score");
    if (!box) return;

    var card = box.closest(".stat-card");
    var raw = extension.securityScore;
    if (raw === null || raw === undefined || raw === "") {
      if (card) card.hidden = true;
      return;
    }

    var score = Number(raw);
    if (!Number.isFinite(score)) {
      if (card) card.hidden = true;
      return;
    }
    if (card) card.hidden = false;

    renderSecScore(score);
    text(
      "sec-updated",
      "Updated " + (S.timeAgo(extension.updatedAt) || "recently"),
    );

    var details = document.getElementById("sec-details");
    if (details) details.hidden = true;
    var toggle = document.getElementById("sec-toggle");
    if (toggle) toggle.hidden = true;
    text("sec-sub", "Score computed by the Sprinkling automation scan.");
  }

  function renderSecScore(raw) {
    var box = document.getElementById("sec-score");
    if (!box) return;

    var score = isNaN(raw) ? 0 : Math.max(0, Math.min(100, raw));
    var tier, word;
    if (score >= 80) {
      tier = "tier-high";
      word = "Low risk";
    } else if (score >= 50) {
      tier = "tier-mid";
      word = "Medium risk";
    } else {
      tier = "tier-low";
      word = "High risk";
    }
    box.classList.remove("tier-high", "tier-mid", "tier-low");
    box.classList.add(tier);
    box.setAttribute("data-score", String(score));
    box.style.setProperty("--pct", String(score));
    box.setAttribute(
      "aria-label",
      "Security score: " + score + " out of 100, " + word.toLowerCase(),
    );

    var valEl = box.querySelector(".sec-score-val");
    if (valEl) valEl.textContent = String(score);
    var tierEl = box.querySelector(".sec-score-tier");
    if (tierEl) tierEl.textContent = word;
  }

  function languageColor(language) {
    var key = String(language).toLowerCase();
    var colors = {
      javascript: "#f7df1e",
      typescript: "#3178c6",
      html: "#e34f26",
      css: "#1572b4",
      python: "#3572a5",
      go: "#00add8",
      rust: "#dea584",
      java: "#b07219",
      php: "#4f5d95",
      ruby: "#701516",
      kotlin: "#a97bff",
      swift: "#f05138",
      dart: "#00b4ab",
    };
    return colors[key] || "#8b949e";
  }

  function renderStack(extension) {
    var front = document.getElementById("stack-frontend");
    var back = document.getElementById("stack-backend");
    if (!front && !back) return;

    function chips(languages) {
      return (languages || [])
        .map(function (language) {
          return (
            '<span class="lg-chip" style="--c: ' +
            languageColor(language) +
            '">' +
            S.escapeHtml(language) +
            "</span>"
          );
        })
        .join("");
    }

    if (front) front.innerHTML = chips(extension.frontendLanguages);
    if (back) back.innerHTML = chips(extension.backendLanguages);

    var hasAny =
      (extension.frontendLanguages || []).length ||
      (extension.backendLanguages || []).length;
    var card = front ? front.closest(".stat-card") : null;
    if (card && !hasAny) card.hidden = true;
  }

  function renderAuthor(extension) {
    var aRepos = document.getElementById("author-repos");
    if (aRepos && current.owner) {
      S.api
        .listExtensions({ developer: current.owner, limit: 1 })
        .then(function (res) {
          if (res.ok && res.data) aRepos.textContent = String(res.data.total);
        });
    }
    if (extension.stars !== null && extension.stars !== undefined) {
      text("author-stars", S.formatCount(extension.stars));
    }
  }

  function readSaves() {
    try {
      return JSON.parse(localStorage.getItem(SAVES_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function writeSaves(map) {
    try {
      localStorage.setItem(SAVES_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  function initSaveButton(extension) {
    var btn = document.getElementById("save-btn");
    if (!btn) return;

    var label = btn.querySelector(".btn-label");
    var busy = false;
    var saved = false;

    function render(on) {
      saved = on;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
      if (label) label.textContent = on ? "Saved" : "Save";
    }

    S.api.listSaved().then(function (res) {
      if (res.ok && Array.isArray(res.data)) {
        render(
          res.data.some(function (item) {
            return item.id === extension.id;
          }),
        );
      } else {
        render(!!readSaves()[extension.id]);
      }
    });

    btn.addEventListener("click", function () {
      if (busy) return;
      busy = true;
      var next = !saved;
      var call = next
        ? S.api.saveExtension(extension.id)
        : S.api.unsaveExtension(extension.id);

      call.then(function (res) {
        busy = false;
        if (res.ok || res.status === 401 || res.status === 403) {
          render(next);
          var saves = readSaves();
          if (next) saves[extension.id] = true;
          else delete saves[extension.id];
          writeSaves(saves);

          if (S.showToast) {
            S.showToast(
              res.ok
                ? next
                  ? "Saved " + current.owner + "/" + current.name
                  : "Removed " + current.owner + "/" + current.name
                : "Sign in to sync saved extensions",
              res.ok ? (next ? "save" : "unsave") : "info",
            );
          }
        } else if (S.showToast) {
          S.showToast(
            res.message || "Unable to update saved extensions",
            "info",
          );
        }
      });
    });
  }

  function initDownload(extension) {
    var btn = document.querySelector(".download-btn");
    if (!btn) return;

    btn.addEventListener("click", function () {
      S.api.incrementDownload(extension.id);
      if (S.showToast) S.showToast("Download started", "info");
      var target =
        extension.id && S.api.bundleUrl
          ? S.api.bundleUrl(extension.id)
          : extension.extensionLink;
      if (target) window.open(target, "_blank", "noopener");
    });
  }

  function bindCopy() {
    var copyBtn = document.getElementById("copy-name");
    if (!copyBtn) return;

    copyBtn.addEventListener("click", function () {
      var value = current.owner + "/" + current.name;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).catch(function () {});
      }

      var original = copyBtn.innerHTML;
      copyBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
        'width="14" height="14" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
      copyBtn.classList.add("copied");
      if (S.showToast) S.showToast("Copied " + value, "copy");
      setTimeout(function () {
        copyBtn.innerHTML = original;
        copyBtn.classList.remove("copied");
      }, 1500);
    });
  }

  function bindTabs(params) {
    var id = params.get("id");
    document
      .querySelectorAll(".ext-tabs a.tab-btn[href]")
      .forEach(function (a) {
        try {
          var url = new URL(a.href, location.href);
          url.search = "";
          if (id) url.searchParams.set("id", id);
          a.href = url.pathname + url.search;
        } catch (e) {}
      });
  }

  function formatToggleCount(n) {
    return n >= 1000
      ? (n / 1000)
          .toFixed(2)
          .replace(/\.?0+$/, "")
          .replace(".", ",") + "k"
      : String(n);
  }

  function bindToggle(btn, options) {
    if (!btn) return null;
    var countEl = btn.querySelector(".count");
    var base = countEl ? Number(countEl.getAttribute("data-count")) : 0;
    var on = !!options.initialOn;

    function render(animate) {
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
      var label = btn.querySelector(".btn-label");
      if (label) label.textContent = on ? options.labelOn : options.labelOff;
      if (countEl) countEl.textContent = formatToggleCount(base + (on ? 1 : 0));
      if (!animate) return;
      btn.classList.remove("pop");
      void btn.offsetWidth;
      btn.classList.add("pop");
    }

    render(false);

    if (!options.managed) {
      btn.addEventListener("click", function () {
        on = !on;
        render(true);
        if (S.showToast && options.toastOn) {
          var what = current.owner + "/" + current.name;
          S.showToast(
            (on ? options.toastOn : options.toastOff).replace("{x}", what),
            options.kind,
          );
        }
      });
    }

    return {
      isOn: function () {
        return on;
      },
      set: function (value, animate) {
        if (on !== value) {
          on = value;
          render(!!animate);
        }
        return on;
      },
    };
  }

  function bindDemoToggles() {
    bindToggle(document.getElementById("like-btn"), {
      initialOn: false,
      labelOn: "Liked",
      labelOff: "Like",
      toastOn: "Liked {x}",
      toastOff: "Removed like from {x}",
      kind: "like",
    });

    var heroFollow = bindToggle(document.getElementById("follow-btn"), {
      initialOn: false,
      labelOn: "Following",
      labelOff: "Follow",
      managed: true,
    });

    var authorFollow = bindToggle(
      document.getElementById("author-follow-btn"),
      {
        initialOn: false,
        labelOn: "Following",
        labelOff: "Follow",
        managed: true,
      },
    );

    var aFollowers = document.getElementById("author-followers");
    var fBase = aFollowers
      ? parseInt(aFollowers.getAttribute("data-base"), 10) || 0
      : 0;
    var following = false;

    function syncFollow(on) {
      following = on;
      if (heroFollow) heroFollow.set(on, true);
      if (authorFollow) authorFollow.set(on, true);
      if (aFollowers) {
        aFollowers.textContent = (fBase + (on ? 1 : 0)).toLocaleString("en-US");
      }
      if (S.showToast) {
        S.showToast(
          on ? "Now following " + current.owner : "Unfollowed " + current.owner,
          "save",
        );
      }
    }

    ["follow-btn", "author-follow-btn"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("click", function () {
        syncFollow(!following);
      });
    });
  }

  function initFilesPage(extension) {
    var body = document.getElementById("fb-body");
    if (!body) return;

    var crumbs = document.getElementById("fb-crumbs");
    if (crumbs) {
      crumbs.innerHTML =
        '<span class="fb-crumb">' +
        S.escapeHtml(current.owner) +
        "</span>" +
        '<span class="fb-sep">/</span>' +
        '<span class="fb-crumb fb-branch">' +
        S.escapeHtml(current.name) +
        "</span>";
    }

    var files = (extension.repoFiles || [])
      .filter(function (path) {
        return typeof path === "string" && path.trim();
      })
      .slice()
      .sort(function (a, b) {
        return a.localeCompare(b);
      });

    if (!files.length) {
      body.innerHTML =
        '<tr><td colspan="3"><span class="muted-fg">No repository files were indexed for this extension.</span></td></tr>';
    } else {
      body.innerHTML = files
        .map(function (path) {
          return (
            "<tr>" +
            '<td><button type="button" class="fb-entry file-name" data-path="' +
            S.escapeHtml(path) +
            '">' +
            ICON_FILE +
            '<span class="fb-entry-name">' +
            S.escapeHtml(path) +
            "</span></button></td>" +
            '<td class="file-size">—</td>' +
            '<td class="file-updated">' +
            S.escapeHtml(S.formatDate(extension.lastCommitDate)) +
            "</td></tr>"
          );
        })
        .join("");
    }

    var table = document.getElementById("fb-table");
    var viewer = document.getElementById("fb-viewer");

    renderEndpoints(extension);

    body.addEventListener("click", function (event) {
      var btn = event.target.closest(".fb-entry[data-path]");
      if (!btn || !table || !viewer) return;
      openFile(extension, btn.getAttribute("data-path"), table, viewer);
    });

    if (viewer) {
      viewer.addEventListener("click", function (event) {
        if (!event.target.closest(".fb-back")) return;
        viewer.hidden = true;
        if (table) table.hidden = false;
      });
    }
  }

  function renderEndpoints(extension) {
    var list = document.getElementById("files-endpoints");
    if (!list) return;

    var endpoints = (extension.apiEndpoints || []).filter(function (endpoint) {
      return typeof endpoint === "string" && endpoint.trim();
    });

    text(
      "endpoint-count",
      endpoints.length + (endpoints.length === 1 ? " endpoint" : " endpoints"),
    );

    if (!endpoints.length) {
      list.innerHTML =
        '<li class="endpoint-item">No API endpoints were indexed for this extension.</li>';
      return;
    }

    list.innerHTML = endpoints
      .map(function (endpoint) {
        return (
          '<li class="endpoint-item"><code>' +
          S.escapeHtml(endpoint) +
          "</code></li>"
        );
      })
      .join("");
  }

  function openFile(extension, path, table, viewer) {
    table.hidden = true;
    viewer.hidden = false;
    viewer.innerHTML =
      '<div class="fb-file-head">' +
      '<button type="button" class="fb-back">' +
      ICON_BACK +
      "Files</button>" +
      '<div class="fb-file-titlebar"><span class="file-name">' +
      ICON_FILE +
      '<span class="fb-entry-name">' +
      S.escapeHtml(path) +
      "</span></span></div>" +
      "</div>" +
      '<div class="fb-binary">Loading ' +
      S.escapeHtml(path) +
      "…</div>";

    S.api.getExtensionFile(extension.id, path).then(function (res) {
      var inner;
      if (res.ok && res.data) {
        if (res.data.encoding === "base64") {
          inner =
            '<div class="fb-binary"><span class="fb-binary-ic">' +
            ICON_FILE +
            "</span>Binary file — preview not available.</div>";
        } else {
          var lines = String(res.data.content || "")
            .replace(/\n+$/, "")
            .split("\n");
          inner =
            '<div class="fb-codeview">' +
            lines
              .map(function (line, index) {
                return (
                  '<div class="fb-line"><span class="fb-ln">' +
                  (index + 1) +
                  '</span><span class="fb-lc">' +
                  (S.escapeHtml(line) || " ") +
                  "</span></div>"
                );
              })
              .join("") +
            "</div>";
        }
      } else if (res.status === 401 || res.status === 403) {
        inner =
          '<div class="fb-binary">File previews require a builder session. Sign in with a builder account to read <code>' +
          S.escapeHtml(path) +
          "</code>.</div>";
      } else {
        inner =
          '<div class="fb-binary">' +
          S.escapeHtml(res.message || "Unable to open this file.") +
          "</div>";
      }

      viewer.innerHTML =
        '<div class="fb-file-head">' +
        '<button type="button" class="fb-back">' +
        ICON_BACK +
        "Files</button>" +
        '<div class="fb-file-titlebar"><span class="file-name">' +
        ICON_FILE +
        '<span class="fb-entry-name">' +
        S.escapeHtml(path) +
        "</span></span></div>" +
        "</div>" +
        inner;
    });
  }
})();
