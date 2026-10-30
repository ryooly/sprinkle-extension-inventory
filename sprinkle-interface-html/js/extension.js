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

  // Every string below is a lucide path set wrapped by svgIcon().
  var PERMISSION_PATHS = {
    globe:
      '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    database:
      '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    clipboard:
      '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    download:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    shieldCheck:
      '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C16.51 3.81 19 5 21 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    alert:
      '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  };

  // Mirrors PERMISSION_SENSITIVITY in the automation scan: the level bucket and
  // the plain-language consequence of granting each browser permission.
  var PERMISSION_META = {
    accessAllWebsites: {
      label: "Read and change all website data",
      icon: "globe",
      weight: 8,
      why: "The extension can inject scripts into every page you open, on every site.",
    },
    readCookies: {
      label: "Read cookies",
      icon: "database",
      weight: 7,
      why: "Can inspect the session cookies sent to the sites it has access to.",
    },
    clipboardRead: {
      label: "Read the clipboard",
      icon: "clipboard",
      weight: 6,
      why: "Can read anything you copied, which may include passwords or tokens.",
    },
    readBrowsingHistory: {
      label: "Read browsing history",
      icon: "eye",
      weight: 6,
      why: "Can list the pages you have visited, beyond the current tab.",
    },
    readOpenTabs: {
      label: "Read open tabs",
      icon: "eye",
      weight: 4,
      why: "Can inspect the titles and URLs of the pages currently loaded.",
    },
    readWebsiteData: {
      label: "Read stored website data",
      icon: "database",
      weight: 4,
      why: "Can read data websites stored on your device, such as local storage.",
    },
    manageDownloads: {
      label: "Manage downloads",
      icon: "download",
      weight: 3,
      why: "Can list, create and modify files downloaded through the browser.",
    },
    accessCurrentWebsite: {
      label: "Read and change the current site",
      icon: "globe",
      weight: 2,
      why: "Only applies to the tab you are viewing, not the whole browser.",
    },
    backgroundExecution: {
      label: "Run in the background",
      icon: "power",
      weight: 2,
      why: "Stays active after the browser window closes, so it can act at any time.",
    },
    clipboardWrite: {
      label: "Write to the clipboard",
      icon: "clipboard",
      weight: 2,
      why: "Can replace whatever you have copied.",
    },
    manageBookmarks: {
      label: "Manage bookmarks",
      icon: "bookmark",
      weight: 2,
      why: "Can read and change your bookmark tree.",
    },
    showNotifications: {
      label: "Show notifications",
      icon: "bell",
      weight: 1,
      why: "Can display system notifications from the browser.",
    },
  };

  // Weights match computeSecurityScore() in the automation scan.
  var SIGNAL_META = [
    { key: "endpointThreats", max: 40, label: "Endpoint threats" },
    {
      key: "verificationConfidence",
      max: 20,
      label: "Verification confidence",
    },
    { key: "transportHygiene", max: 15, label: "Transport hygiene" },
    { key: "permissionExposure", max: 25, label: "Permission exposure" },
  ];

  var RISK_META = {
    "flagged-endpoint": {
      level: "bad",
      icon: "ban",
      text: "Safe Browsing flagged at least one outbound endpoint.",
    },
    "unverified-endpoint": {
      level: "warn",
      icon: "alert",
      text: "Some endpoints could not be verified — the Safe Browsing lookup failed or was skipped.",
    },
    "insecure-endpoint": {
      level: "warn",
      icon: "alert",
      text: "At least one endpoint uses a suspicious or non-standard URL pattern.",
    },
    "sensitive-permission": {
      level: "warn",
      icon: "alert",
      text: "The manifest requests permissions with broad access to browser data.",
    },
  };

  var DESTINATION_KINDS = [
    {
      cls: "d-telemetry",
      type: "Error telemetry",
      pattern: /sentry|crash|telemetry|rollbar|bugsnag|newrelic|appsignal/i,
    },
    {
      cls: "d-analytics",
      type: "Analytics",
      pattern:
        /analytics|doubleclick|mixpanel|amplitude|segment|posthog|heap|fathom|plausible|matomo|piwik/i,
    },
    {
      cls: "d-registry",
      type: "Package or model registry",
      pattern:
        /registry|npmjs|unpkg|jsdelivr|cdn|huggingface|pypi|releases|download|fonts|storage|s3|objects/i,
    },
  ];

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
    bindSecToggles();
    resetSecurity();

    loadExtension(ctx, function (extension) {
      current.id = extension.id;
      current.owner = extension.developer || "unknown";
      current.name = stripOwner(current.owner, extension.name || "untitled");

      applyHeader(extension);
      renderNotes(extension);
      renderTags(extension);
      renderLicenseLine(extension);
      renderMeta(extension);
      renderStats(extension);
      renderAuthor(extension);
      initSaveButton(extension);
      initDownload(extension);
      initFilesPage(extension);
      recordHistory(extension);
      bindLicenseDetails(extension);

      if (S.community) S.community.init(extension);

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
    ".ext-meta",
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

  // Catalogue names arrive as "owner/repo" from the importer, while the header
  // already prints the owner next to the name — drop the duplicated prefix.
  function stripOwner(owner, name) {
    var prefix = (owner || "") + "/";
    return name.indexOf(prefix) === 0 ? name.slice(prefix.length) : name;
  }

  function applyHeader(extension) {
    var owner = current.owner;
    var name = current.name;
    var profileUrl =
      "/sprinkle-interface-html/pages/profile.html?user=" +
      encodeURIComponent(owner);

    text("ext-owner", owner);
    text("ext-name", name);
    text("ext-heading", name);
    text("tree-owner", owner + "/" + name);
    text("badge-name", name.toUpperCase());
    text(
      "badge-source",
      extension.source ? String(extension.source).toUpperCase() : "",
    );
    text(
      "badge-status",
      extension.extensionStatus === "premium"
        ? "PREMIUM"
        : extension.extensionStatus
          ? "BASIC"
          : "",
    );
    text("badge-license", extension.licenseKey || extension.licenseName || "");
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

  var README_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    'width="15" height="15" aria-hidden="true">' +
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />' +
    '<path d="M14 2v5h5" /><path d="M8 13h8" /><path d="M8 17h8" />' +
    '<path d="M8 9h2" /></svg>';

  function renderNotes(extension) {
    var el = document.getElementById("ext-notes");
    if (!el) return;

    var notes = S.notesOf(extension).trim();
    if (!notes) {
      // Blank rather than a placeholder sentence, so the panel reflects the
      // extension output as-is.
      el.className = "ext-notes";
      el.innerHTML = "";
      return;
    }

    el.className = "ext-notes readme";
    el.innerHTML =
      '<div class="readme-head">' +
      '<span class="readme-head-icon" aria-hidden="true">' +
      README_ICON +
      "</span>" +
      '<span class="readme-head-title">README</span>' +
      "</div>" +
      '<div class="readme-body">' +
      S.renderMarkdown(notes) +
      "</div>";
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
        location.href =
          "/sprinkle-interface-html/pages/index.html?search=" +
          encodeURIComponent(tag);
      });
    });
  }

  function licenseBlurb(text) {
    var clean = String(text || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return "";

    var stop = clean.search(/[.!?](\s|$)/);
    var first = stop > 0 ? clean.slice(0, stop + 1) : clean;

    var max = 140;
    if (first.length <= max) return first;

    var cut = first.slice(0, max);
    var space = cut.lastIndexOf(" ");
    cut = space > 60 ? cut.slice(0, space) : cut;
    return cut.replace(/[,.;:]+$/, "") + "…";
  }

  function renderLicenseLine(extension) {
    var textEl = document.getElementById("ext-license-text");
    if (!textEl) return;

    var licenseName = extension.licenseName || extension.licenseKey;
    var blurb = licenseBlurb(extension.licenseDescription);
    if (!licenseName) {
      textEl.innerHTML = "";
    } else {
      textEl.innerHTML =
        '<span class="lic-strong">' +
        S.escapeHtml(licenseName) +
        "</span>" +
        (blurb ? " — " + S.escapeHtml(blurb) : "");
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

  function metaValue(value) {
    if (value === null || value === undefined || value === "") return "";
    return String(value);
  }

  // The record carries more than the header shows, so the strip under the
  // badges prints the remaining columns straight from the detail payload. A
  // missing value stays blank so the strip reflects only what was indexed.
  function renderMeta(extension) {
    var wrap = document.getElementById("ext-meta");
    if (!wrap) return;

    var browsers = extension.supportedBrowsers || [];
    var rows = [
      {
        term: "Repository",
        value: extension.name || "",
        href: /^https?:\/\//i.test(extension.extensionLink || "")
          ? extension.extensionLink
          : "",
      },
      {
        term: "Publisher",
        value: extension.publishedBy
          ? extension.publishedBy === "user"
            ? "Community upload"
            : "Sprinkling automation"
          : "",
      },
      { term: "Source", value: metaValue(extension.source).toUpperCase() },
      {
        term: "Status",
        value: extension.extensionStatus
          ? extension.extensionStatus === "premium"
            ? "Premium"
            : "Basic"
          : "",
      },
      {
        term: "License",
        value: extension.licenseName || extension.licenseKey || "",
      },
      { term: "First listed", value: S.formatDate(extension.createdAt) || "" },
      { term: "Last updated", value: S.formatDate(extension.updatedAt) || "" },
      {
        term: "Last commit",
        value: S.formatDate(extension.lastCommitDate) || "",
      },
      {
        term: "Browsers",
        value: browsers.length ? browsers.join(", ") : "",
      },
      {
        term: "Displayed price",
        value: extension.amountDisplayed
          ? S.formatCount(extension.amountDisplayed)
          : "",
      },
    ];

    wrap.innerHTML = rows
      .map(function (row) {
        var value = S.escapeHtml(row.value);
        return (
          '<div class="ext-meta-row"><dt>' +
          row.term +
          "</dt><dd>" +
          (row.href
            ? '<a href="' +
              S.escapeHtml(row.href) +
              '" target="_blank" rel="noopener noreferrer">' +
              value +
              "</a>"
            : value) +
          "</dd></div>"
        );
      })
      .join("");
  }

  // The licence popover reads the stored permission/condition/limitation
  // arrays instead of the old reference table.
  function bindLicenseDetails(extension) {
    if (S.bindExtensionLicense) S.bindExtensionLicense(extension);
  }

  function renderStats(extension) {
    text("stat-views", S.formatCount(extension.views));
    text("stat-downloads", S.formatCount(extension.downloads));
    text(
      "stat-stars",
      extension.stars === null || extension.stars === undefined
        ? "0"
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
    var score = Number(raw);
    var hasScore =
      raw !== null && raw !== undefined && raw !== "" && Number.isFinite(score);

    // Each section always renders its headline plus an optional answer when
    // it has no data, so the panel stays understandable regardless of output.
    if (card) card.hidden = false;

    renderSecSignals(extension, hasScore ? score : null);
    renderSecPerms(extension.permissions || []);
    renderSecDestinations(extension);
    renderSecMetrics(extension);
    renderSecFindings(extension, hasScore);

    if (hasScore) {
      renderSecScore(score);
      text(
        "sec-updated",
        "Updated " + (S.timeAgo(extension.updatedAt) || "recently"),
      );
    } else {
      clearSecScore();
      text("sec-updated", "");
    }

    text(
      "sec-sub",
      hasScore ? "Score computed by the Sprinkling automation scan." : "",
    );

    var details = document.getElementById("sec-details");
    var toggle = document.getElementById("sec-toggle");

    // The full report is always reachable because every section exposes a
    // headline and an optional answer.
    if (details) {
      details.hidden = false;
      details.classList.remove("open");
      details.inert = true;
    }
    if (toggle) {
      toggle.hidden = false;
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  function svgIcon(name, className, size) {
    var paths = PERMISSION_PATHS[name] || "";
    var dimension = size || 14;
    return (
      "<svg" +
      (className ? ' class="' + className + '"' : "") +
      ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" width="' +
      dimension +
      '" height="' +
      dimension +
      '" aria-hidden="true">' +
      paths +
      "</svg>"
    );
  }

  function renderSecSignals(extension, score) {
    var list = document.getElementById("sec-signals");
    var note = document.getElementById("sec-signals-note");
    if (!list) return false;

    var breakdown = extension.securityBreakdown;
    if (!breakdown || score === null) {
      list.innerHTML = "";
      if (note) {
        note.textContent = breakdown
          ? "The signal weights are stored, but no total score was recorded yet."
          : "No signal breakdown was stored for this extension yet.";
      }
      var emptyHead = document.getElementById("sec-signals-h");
      if (emptyHead) emptyHead.hidden = false;
      return false;
    }

    list.innerHTML = SIGNAL_META.map(function (signal) {
      var value = Number(breakdown[signal.key]);
      if (!Number.isFinite(value)) value = 0;
      var ratio = Math.max(0, Math.min(1, value / signal.max));
      var tier = ratio >= 0.75 ? "" : ratio >= 0.4 ? " mid" : " low";
      return (
        '<li class="sec-signal' +
        tier +
        '">' +
        '<div class="sec-signal-top">' +
        '<span class="sec-signal-name">' +
        signal.label +
        "</span>" +
        '<span class="sec-signal-value">' +
        value +
        "/" +
        signal.max +
        "</span>" +
        "</div>" +
        '<div class="sec-signal-track">' +
        '<span class="sec-signal-fill" style="width:' +
        Math.round(ratio * 100) +
        '%"></span>' +
        "</div>" +
        "</li>"
      );
    }).join("");

    var signalsHead = document.getElementById("sec-signals-h");
    if (signalsHead) signalsHead.hidden = false;

    if (note) {
      var sum = SIGNAL_META.reduce(function (total, signal) {
        var value = Number(breakdown[signal.key]);
        return total + (Number.isFinite(value) ? value : 0);
      }, 0);
      note.textContent =
        sum === score
          ? "The " +
            score +
            "/100 score is the sum of these four signals, weighted exactly as the scan computes them."
          : "These four signals add up to " +
            sum +
            ", but the scan caps the score at " +
            score +
            "/100 once an endpoint is flagged.";
    }
    return true;
  }

  function permissionLevel(weight) {
    if (weight >= 6) return "high";
    if (weight >= 3) return "medium";
    return "low";
  }

  var PERMISSION_LEVEL_LABELS = {
    high: "High access",
    medium: "Moderate access",
    low: "Limited access",
  };

  function renderSecPerms(permissions) {
    var list = document.getElementById("sec-perms");
    var note = document.getElementById("sec-perms-note");
    if (!list) return false;

    var unique = [];
    permissions.forEach(function (permission) {
      if (unique.indexOf(permission) === -1) unique.push(permission);
    });

    if (!unique.length) {
      list.innerHTML = "";
      if (note) {
        note.textContent =
          "No browser permissions were detected in the manifest for this extension.";
      }
      var emptyHead = document.getElementById("sec-perms-h");
      if (emptyHead) emptyHead.hidden = false;
      return false;
    }

    unique.sort(function (a, b) {
      return (
        ((PERMISSION_META[b] || {}).weight || 0) -
        ((PERMISSION_META[a] || {}).weight || 0)
      );
    });

    list.innerHTML = unique
      .map(function (permission, index) {
        var meta = PERMISSION_META[permission] || null;
        var label = meta ? meta.label : permission;
        var level = permissionLevel(meta ? meta.weight : 3);
        var id = "sec-perm-" + index;
        return (
          '<li class="perm">' +
          '<button type="button" class="perm-row" aria-expanded="false" aria-controls="' +
          id +
          '">' +
          '<span class="perm-ic" aria-hidden="true">' +
          svgIcon(meta ? meta.icon : "shieldCheck", "", 16) +
          "</span>" +
          '<span class="perm-name">' +
          S.escapeHtml(label) +
          "</span>" +
          '<span class="perm-tag ' +
          level +
          '">' +
          PERMISSION_LEVEL_LABELS[level] +
          "</span>" +
          svgIcon("chevron", "perm-chevron", 14) +
          "</button>" +
          '<div class="perm-why" id="' +
          id +
          '">' +
          S.escapeHtml(
            meta
              ? meta.why
              : "This permission was reported by the manifest but is not in the labelled list.",
          ) +
          "</div>" +
          "</li>"
        );
      })
      .join("");

    var permsHead = document.getElementById("sec-perms-h");
    if (permsHead) permsHead.hidden = false;

    if (note) {
      note.textContent =
        unique.length +
        (unique.length === 1 ? " permission" : " permissions") +
        " requested, ordered by how much access each one grants.";
    }
    return true;
  }

  function endpointHost(path) {
    var match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(String(path || ""));
    if (!match) return "";
    return match[1].replace(/^www\./i, "").toLowerCase();
  }

  function destinationKind(host) {
    for (var i = 0; i < DESTINATION_KINDS.length; i++) {
      if (DESTINATION_KINDS[i].pattern.test(host)) return DESTINATION_KINDS[i];
    }
    return { cls: "d-api", type: "External API" };
  }

  function safetyRecords(extension) {
    var records = (extension.endpointSafety || []).filter(function (record) {
      return record && record.path;
    });
    if (records.length) return records;

    // Rows scanned before endpoint safety was stored: fall back to the
    // flattened endpoint strings so destinations still render, unchecked.
    return (extension.apiEndpoints || [])
      .map(function (entry) {
        var match = /^(internal|external):([A-Z]+)\s+(.+)$/.exec(
          String(entry || ""),
        );
        if (!match) return null;
        return {
          type: match[1],
          method: match[2],
          path: match[3],
          file: "",
          safe: null,
          threats: [],
          checkedAt: "",
          skippedOnError: false,
        };
      })
      .filter(function (record) {
        return record !== null;
      });
  }

  function renderSecDestinations(extension) {
    var list = document.getElementById("sec-dest");
    var note = document.getElementById("sec-dest-note");
    if (!list) return false;

    var records = safetyRecords(extension).filter(function (record) {
      return record.type === "external" && endpointHost(record.path);
    });

    var internal = safetyRecords(extension).filter(function (record) {
      return record.type === "internal";
    }).length;

    if (!records.length) {
      list.innerHTML = "";
      if (note) {
        note.textContent = internal
          ? "Only internal (relative) endpoints were indexed — no external data destinations."
          : "No API endpoints or data destinations were indexed for this extension.";
      }
      var emptyHead = document.getElementById("sec-dest-h");
      if (emptyHead) emptyHead.hidden = false;
      return false;
    }

    var byHost = {};
    var hosts = [];
    records.forEach(function (record) {
      var host = endpointHost(record.path);
      if (!byHost[host]) {
        byHost[host] = [];
        hosts.push(host);
      }
      byHost[host].push(record);
    });

    hosts.sort();

    list.innerHTML = hosts
      .map(function (host, index) {
        var rows = byHost[host];
        var kind = destinationKind(host);
        var id = "sec-dest-" + index;
        var methods = [];
        var flagged = 0;
        var unchecked = 0;
        var verdicts = 0;
        var files = [];
        var checkedAt = "";

        rows.forEach(function (row) {
          if (methods.indexOf(row.method) === -1) methods.push(row.method);
          if (row.safe === false) flagged += 1;
          if (
            row.safe === null ||
            row.safe === undefined ||
            row.skippedOnError
          ) {
            unchecked += 1;
          } else {
            verdicts += 1;
            if (row.checkedAt && row.checkedAt > checkedAt) {
              checkedAt = row.checkedAt;
            }
          }
          if (row.file && files.indexOf(row.file) === -1) files.push(row.file);
        });

        var threats = [];
        rows.forEach(function (row) {
          (row.threats || []).forEach(function (threat) {
            var label =
              threat.threatType +
              (threat.threatEntryType
                ? " (" + threat.threatEntryType + ")"
                : "");
            if (threats.indexOf(label) === -1) threats.push(label);
          });
        });

        var status = flagged
          ? "Safe Browsing flagged " +
            flagged +
            " of " +
            rows.length +
            " calls."
          : verdicts === 0
            ? "Endpoints were indexed, but the lookup returned no verdict for them."
            : verdicts === rows.length
              ? "Safe Browsing reported no threats for these calls."
              : "Safe Browsing returned a verdict for " +
                verdicts +
                " of " +
                rows.length +
                " calls.";

        var first = rows[0].path;
        var details =
          '<div class="dest-line"><span class="dest-k">Endpoint</span>' +
          '<a class="dest-link" href="' +
          S.escapeHtml(first) +
          '" target="_blank" rel="noopener noreferrer">' +
          S.escapeHtml(first.replace(/^https?:\/\//i, "")) +
          "</a></div>" +
          '<div class="dest-line"><span class="dest-k">Methods</span><span class="dest-v">' +
          S.escapeHtml(methods.join(", ")) +
          "</span></div>" +
          '<div class="dest-line"><span class="dest-k">Threats</span><span class="dest-v">' +
          S.escapeHtml(threats.length ? threats.join(", ") : "None reported") +
          "</span></div>" +
          '<div class="dest-line"><span class="dest-k">Checked</span><span class="dest-v">' +
          S.escapeHtml(
            verdicts && checkedAt
              ? S.formatDate(checkedAt) +
                  (unchecked ? " · " + unchecked + " without verdict" : "")
              : "No verdict returned",
          ) +
          "</span></div>" +
          (files.length
            ? '<div class="dest-line"><span class="dest-k">Source files</span><span class="dest-v">' +
              S.escapeHtml(files.slice(0, 3).join(", ")) +
              (files.length > 3 ? " +" + (files.length - 3) + " more" : "") +
              "</span></div>"
            : "");

        return (
          '<li class="dest ' +
          kind.cls +
          '">' +
          '<div class="dest-head">' +
          '<span class="dest-ic" aria-hidden="true">' +
          svgIcon(kind.cls === "d-api" ? "activity" : "globe", "", 14) +
          "</span>" +
          '<span class="dest-domain">' +
          S.escapeHtml(host) +
          "</span>" +
          '<span class="dest-type">' +
          kind.type +
          "</span>" +
          "</div>" +
          '<p class="dest-desc">' +
          S.escapeHtml(
            rows.length +
              (rows.length === 1 ? " call" : " calls") +
              " indexed. " +
              status,
          ) +
          "</p>" +
          '<button type="button" class="dest-more" aria-expanded="false" aria-controls="' +
          id +
          '">' +
          '<span class="dest-more-label">Read more</span>' +
          svgIcon("chevron", "dest-more-chevron", 12) +
          "</button>" +
          '<div class="dest-details" id="' +
          id +
          '">' +
          details +
          "</div>" +
          "</li>"
        );
      })
      .join("");

    var destHead = document.getElementById("sec-dest-h");
    if (destHead) destHead.hidden = false;

    if (note) {
      note.textContent =
        hosts.length +
        (hosts.length === 1 ? " external host" : " external hosts") +
        " referenced by the indexed endpoints" +
        (internal ? ", plus " + internal + " internal endpoints" : "") +
        ".";
    }
    return true;
  }

  function gradeClass(total) {
    if (total >= 75) return " grade-a";
    if (total >= 50) return " grade-b";
    return " grade-c";
  }

  function renderSecMetrics(extension) {
    var wrap = document.getElementById("sec-metrics");
    if (!wrap) return false;

    var rating = extension.repoRating || {};
    var total = Number(rating.totalScore);
    // Show only the letter grade (A/B/C) — no numeric score.
    var trust = extension.repoGrade || "";

    var metrics = [
      {
        value:
          extension.stars === null || extension.stars === undefined
            ? ""
            : S.formatCount(extension.stars),
        label: "Repository stars",
      },
      {
        value: extension.lastCommitDate
          ? S.formatDate(extension.lastCommitDate)
          : "",
        label: "Last commit",
      },
      {
        value: trust,
        label: "Repo trust score",
        cls: extension.repoGrade
          ? gradeClass(Number.isFinite(total) ? total : 0)
          : "",
      },
    ].filter(function (metric) {
      return metric.value !== "";
    });

    var head = document.getElementById("sec-metrics-h");
    if (head) head.hidden = false;
    var note = document.getElementById("sec-metrics-note");
    if (note) {
      note.textContent = metrics.length
        ? ""
        : "No repository metrics (stars, last commit or trust score) were captured for this extension.";
    }

    wrap.innerHTML = metrics
      .map(function (metric) {
        return (
          '<div class="sec-metric">' +
          '<div class="value' +
          (metric.cls || "") +
          '">' +
          S.escapeHtml(metric.value) +
          "</div>" +
          '<div class="label">' +
          metric.label +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    return metrics.length > 0;
  }

  function renderSecFindings(extension, hasScore) {
    var list = document.getElementById("sec-findings");
    var foot = document.getElementById("sec-foot");
    if (!list) return false;

    var risks = (extension.securityRisks || []).filter(function (risk) {
      return RISK_META[risk];
    });

    var items = risks.map(function (risk) {
      var meta = RISK_META[risk];
      return (
        '<li class="' +
        meta.level +
        '">' +
        svgIcon(meta.icon, "", 12) +
        S.escapeHtml(meta.text) +
        "</li>"
      );
    });

    var checked = 0;
    var flagged = 0;
    var unverifiable = 0;
    (extension.endpointSafety || []).forEach(function (row) {
      if (!row || row.type !== "external") return;
      if (row.skippedOnError || row.safe === null || row.safe === undefined) {
        unverifiable += 1;
        return;
      }
      checked += 1;
      if (row.safe === false) flagged += 1;
    });

    if (flagged) {
      items.push(
        '<li class="bad">' +
          svgIcon("ban", "", 12) +
          S.escapeHtml(
            flagged +
              (flagged === 1 ? " endpoint was" : " endpoints were") +
              " reported unsafe by Google Safe Browsing.",
          ) +
          "</li>",
      );
    } else if (checked) {
      items.push(
        "<li>" +
          svgIcon("shieldCheck", "", 12) +
          S.escapeHtml(
            "Google Safe Browsing checked " +
              checked +
              (checked === 1 ? " external endpoint" : " external endpoints") +
              " without findings" +
              (unverifiable
                ? "; " + unverifiable + " could not be reached for a verdict."
                : ".") +
              "",
          ) +
          "</li>",
      );
    }

    // A scored but clean scan is real output worth stating; anything else with
    // no stored findings stays blank rather than showing a placeholder.
    if (hasScore && !items.length) {
      items.push(
        "<li>" +
          svgIcon("shieldCheck", "", 12) +
          S.escapeHtml(
            "No endpoint or permission risks were flagged by the scan.",
          ) +
          "</li>",
      );
    }

    list.innerHTML = items.join("");

    if (foot) {
      foot.textContent = items.length
        ? "Recomputed by the Sprinkling automation scan" +
          (extension.updatedAt
            ? " · last stored " + S.timeAgo(extension.updatedAt)
            : "")
        : "";
    }

    return items.length > 0;
  }

  function bindSecToggles() {
    var details = document.getElementById("sec-details");
    var toggle = document.getElementById("sec-toggle");

    if (toggle && details) {
      toggle.addEventListener("click", function () {
        var open = !details.classList.contains("open");
        details.classList.toggle("open", open);
        details.inert = !open;
        toggle.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", String(open));
      });
    }

    if (!details) return;

    details.addEventListener("click", function (event) {
      var row = event.target.closest(".perm-row");
      if (row) {
        var item = row.closest(".perm");
        var expanded = row.getAttribute("aria-expanded") === "true";
        item.classList.toggle("open", !expanded);
        row.setAttribute("aria-expanded", String(!expanded));
        return;
      }

      var more = event.target.closest(".dest-more");
      if (more) {
        var dest = more.closest(".dest");
        var open = more.getAttribute("aria-expanded") === "true";
        dest.classList.toggle("open", !open);
        more.setAttribute("aria-expanded", String(!open));
        var label = more.querySelector(".dest-more-label");
        if (label) label.textContent = open ? "Read more" : "Show less";
      }
    });
  }

  function clearSecScore() {
    var box = document.getElementById("sec-score");
    if (!box) return;
    box.classList.remove("tier-high", "tier-mid", "tier-low");
    box.removeAttribute("data-score");
    box.style.setProperty("--pct", "0");
    box.removeAttribute("aria-label");

    var valEl = box.querySelector(".sec-score-val");
    if (valEl) valEl.textContent = "";
    var tierEl = box.querySelector(".sec-score-tier");
    if (tierEl) tierEl.textContent = "";
  }

  function resetSecurity() {
    // The template ships with a sample score; blank it until the real scan
    // data arrives so an unresolved extension never shows another verdict.
    clearSecScore();

    var updated = document.getElementById("sec-updated");
    if (updated) updated.textContent = "";

    [
      "sec-signals",
      "sec-perms",
      "sec-dest",
      "sec-metrics",
      "sec-findings",
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
    ["sec-signals-note", "sec-perms-note", "sec-dest-note", "sec-foot"].forEach(
      function (id) {
        var el = document.getElementById(id);
        if (el) el.textContent = "";
      },
    );

    var details = document.getElementById("sec-details");
    if (details) {
      details.hidden = true;
      details.classList.remove("open");
      details.inert = true;
    }
    var toggle = document.getElementById("sec-toggle");
    if (toggle) {
      toggle.hidden = true;
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
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
      scss: "#c6538c",
      sass: "#a53b70",
      less: "#1d365d",
      stylus: "#ff6347",
      vue: "#41b883",
      svelte: "#ff3e00",
      astro: "#ff5d01",
      mdx: "#fcb32c",
      elm: "#60b5cc",
      pug: "#a86454",
      python: "#3572a5",
      go: "#00add8",
      rust: "#dea584",
      java: "#b07219",
      php: "#4f5d95",
      ruby: "#701516",
      kotlin: "#a97bff",
      swift: "#f05138",
      dart: "#00b4ab",
      "c#": "#178600",
      "c++": "#f34b7d",
      c: "#555555",
      "objective-c": "#438eff",
      scala: "#c22d40",
      elixir: "#6e4a7e",
      erlang: "#b83998",
      haskell: "#5e5086",
      perl: "#0298c3",
      clojure: "#db5855",
      crystal: "#000100",
      groovy: "#4298b8",
      lua: "#000080",
      r: "#198ce7",
      julia: "#a270ba",
      zig: "#ec915c",
      nim: "#ffc200",
      ocaml: "#3be133",
      jupyter: "#da5b0b",
    };
    return colors[key] || "#8b949e";
  }

  function uniqueLanguages(languages) {
    var seen = {};
    return (languages || []).filter(function (language) {
      if (!language || seen[language]) return false;
      seen[language] = true;
      return true;
    });
  }

  function renderStack(extension) {
    var front = document.getElementById("stack-frontend");
    var back = document.getElementById("stack-backend");
    if (!front && !back) return;

    function chips(languages) {
      return languages
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

    // A missing list is answered in place instead of hiding the card, so the
    // section still explains why there is nothing to print.
    function fill(target, languages, note) {
      if (!target) return false;
      if (languages.length > 0) {
        target.innerHTML = chips(languages);
        return true;
      }
      target.innerHTML =
        '<span class="lg-empty">' + S.escapeHtml(note) + "</span>";
      return false;
    }

    var hasFront = fill(
      front,
      uniqueLanguages(extension.frontendLanguages),
      "No client-side languages were indexed for this extension.",
    );
    var hasBack = fill(
      back,
      uniqueLanguages(extension.backendLanguages),
      "No backend languages detected — this extension runs in the browser only.",
    );

    // Dim the half of the pyramid with nothing to list so the graphic never
    // implies a stack the record does not carry.
    var frontTier = document.querySelector(".tech-stack .tri-frontend");
    var backTier = document.querySelector(".tech-stack .tri-backend");
    if (frontTier) frontTier.classList.toggle("is-empty", !hasFront);
    if (backTier) backTier.classList.toggle("is-empty", !hasBack);
    var frontIcon = document.querySelector(".tech-stack .tri-ico-front");
    var backIcon = document.querySelector(".tech-stack .tri-ico-back");
    if (frontIcon) frontIcon.classList.toggle("is-empty", !hasFront);
    if (backIcon) backIcon.classList.toggle("is-empty", !hasBack);
  }

  function renderAuthor(extension) {
    var aRepos = document.getElementById("author-repos");
    if (aRepos) {
      // Start at 0 until the real count arrives (or stays 0 on failure).
      aRepos.textContent = "0";
      if (current.owner) {
        S.api
          .listExtensions({ developer: current.owner, limit: 1 })
          .then(function (res) {
            aRepos.textContent =
              res.ok && res.data ? String(res.data.total) : "0";
          });
      }
    }
    text(
      "author-stars",
      extension.stars === null || extension.stars === undefined
        ? "0"
        : S.formatCount(extension.stars),
    );
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
      if (btn.getAttribute("data-busy") === "true") return;
      startDownload(extension, btn);
    });
  }

  function downloadFileName(extension, disposition) {
    var match = /filename="?([^";]+)"?/i.exec(disposition || "");
    if (match && match[1]) return match[1].trim();

    var base = String(extension.name || extension.extensionLink || "extension")
      .replace(/^.*\/([^/]+)$/, "$1")
      .replace(/[^A-Za-z0-9._-]+/g, "-");

    if (!base) base = "extension";
    return /\.zip$/i.test(base) ? base : base + ".zip";
  }

  function triggerBrowserDownload(blobUrl, fileName) {
    var anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = fileName;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(function () {
      URL.revokeObjectURL(blobUrl);
    }, 4000);
  }

  function startDownload(extension, btn) {
    var target =
      extension.id && S.api.bundleUrl
        ? S.api.bundleUrl(extension.id)
        : extension.extensionLink;

    if (!target) {
      if (S.showToast) S.showToast("Nothing to download yet.", "info");
      return;
    }

    // Without a catalog id there is no same-origin bundle to read as a blob
    // (for example a bare external link), so hand it to the browser directly.
    if (!extension.id) {
      if (S.showToast) S.showToast("Download started", "info");
      window.open(target, "_blank", "noopener");
      return;
    }

    btn.setAttribute("data-busy", "true");
    if (S.showToast) S.showToast("Preparing download…", "info");

    // Uploaded packages are served from the gateway and convert cleanly to a
    // blob; automation rows 302 to an upstream archive that a blob read cannot
    // follow (CORS), so those fall through to the direct-open path below.
    fetch(target, { credentials: "include" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        var disposition = res.headers.get("content-disposition") || "";
        return res.blob().then(function (blob) {
          return { blob: blob, disposition: disposition };
        });
      })
      .then(function (result) {
        S.api.incrementDownload(extension.id);
        var blobUrl = URL.createObjectURL(result.blob);
        triggerBrowserDownload(
          blobUrl,
          downloadFileName(extension, result.disposition),
        );
        if (S.showToast) S.showToast("Download started", "success");
      })
      .catch(function () {
        // Fall back to opening the bundle endpoint directly.
        window.open(target, "_blank", "noopener");
        if (S.showToast) S.showToast("Download started", "info");
      })
      .finally(function () {
        btn.removeAttribute("data-busy");
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
            '<td class="file-size"></td>' +
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

  function endpointSafetyKey(record) {
    return record.type + ":" + record.method + " " + record.path;
  }

  function renderEndpoints(extension) {
    var list = document.getElementById("files-endpoints");
    if (!list) return;

    var endpoints = (extension.apiEndpoints || []).filter(function (endpoint) {
      return typeof endpoint === "string" && endpoint.trim();
    });

    if (!endpoints.length) {
      text("endpoint-count", "0 endpoints");
      list.innerHTML =
        '<li class="endpoint-item">No API endpoints were indexed for this extension.</li>';
      return;
    }

    text(
      "endpoint-count",
      endpoints.length + (endpoints.length === 1 ? " endpoint" : " endpoints"),
    );

    var safety = {};
    (extension.endpointSafety || []).forEach(function (record) {
      if (record && record.path) safety[endpointSafetyKey(record)] = record;
    });

    list.innerHTML = endpoints
      .map(function (endpoint) {
        var record = safety[endpoint];
        var state = "pending";
        var label = "no verdict recorded";
        if (record) {
          if (record.safe === false) {
            state = "unsafe";
            label = "flagged by Safe Browsing";
          } else if (record.skippedOnError || record.safe === null) {
            label = "lookup failed";
          } else {
            state = "clear";
            label = "checked · no threats";
          }
        }
        return (
          '<li class="endpoint-item ' +
          state +
          '"><code>' +
          S.escapeHtml(endpoint) +
          '</code><span class="ep-status">' +
          S.escapeHtml(label) +
          "</span></li>"
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
          '<div class="fb-binary">File previews need a signed-in session.' +
          '<button type="button" class="pill-btn" data-auth-open="login">' +
          "Log in</button> to read <code>" +
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
