/* ==========================================================================
 * extension.js — Detail page behaviour. Mirrors src/routes/extensions.$slug.tsx:
 * the uploader name arrives via ?user= and the repo slug via ?slug=.
 * ========================================================================== */

(function () {
  "use strict";

  /* Placeholder data (basic structure only — wire to real API later) */
  var EXT = {
    owner: "Edge0",
    name: "Audio8-ASR-Infinite",
  };

  document.addEventListener("DOMContentLoaded", function () {
    var S = window.SPRINKLE;
    S.injectHeader(function () {
      S.initTheme();
      S.initHeader();
    });

    var params = new URLSearchParams(location.search);
    var slug = params.get("slug");
    var user = params.get("user");
    var owner = user || EXT.owner;
    var name = slug || EXT.name;

    function text(id, value) {
      var el = document.getElementById(id);
      if (el) el.textContent = value;
    }

    text("ext-owner", owner);
    text("ext-name", name);
    text("ext-heading", name);
    text("ext-strong", name);
    text("badge-name", name.toUpperCase());
    text("tree-owner", owner + "/" + name);
    text("space-owner", owner + "/" + name);

    /* Copy full extension name to the clipboard */
    var copyBtn = document.getElementById("copy-name");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var value = owner + "/" + name;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).catch(function () {});
        }
        /* feedback: swap to a check mark for 1.5s + toast */
        var original = copyBtn.innerHTML;
        copyBtn.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
          'width="14" height="14" aria-hidden="true">' +
          '<path d="M20 6 9 17l-5-5"/></svg>';
        copyBtn.classList.add("copied");
        if (S.showToast) S.showToast("Copied " + value, "copy");
        setTimeout(function () {
          copyBtn.innerHTML = original;
          copyBtn.classList.remove("copied");
        }, 1500);
      });
    }

    /* ─── Toggle buttons (Like / Follow / Saved) ────────────────────────── */

    function formatCount(n) {
      return n >= 1000
        ? (n / 1000)
            .toFixed(2)
            .replace(/\.?0+$/, "")
            .replace(".", ",") + "k"
        : String(n);
    }

    function bindToggle(btn, options) {
      if (!btn) return;
      var countEl = btn.querySelector(".count");
      var base = countEl ? Number(countEl.getAttribute("data-count")) : 0;
      var on = !!options.initialOn;

      function apply(animate) {
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-pressed", String(on));
        var label = btn.querySelector(".btn-label");
        if (label) label.textContent = on ? options.labelOn : options.labelOff;
        if (countEl) countEl.textContent = formatCount(base + (on ? 1 : 0));
        if (!animate) return; /* initial sync — no animation, no toast */
        btn.classList.remove("pop");
        /* restart the keyframe animation */
        void btn.offsetWidth;
        btn.classList.add("pop");
        if (S.showToast) {
          var what = owner + "/" + name;
          S.showToast(
            on
              ? options.toastOn.replace("{x}", what)
              : options.toastOff.replace("{x}", what),
            options.kind,
          );
        }
      }

      btn.addEventListener("click", function () {
        on = !on;
        apply(true);
      });
      apply(false);
    }

    bindToggle(document.getElementById("like-btn"), {
      initialOn: false,
      labelOn: "Liked",
      labelOff: "Like",
      toastOn: "Liked {x}",
      toastOff: "Removed like from {x}",
      kind: "like",
    });

    bindToggle(document.getElementById("follow-btn"), {
      initialOn: false,
      labelOn: "Following",
      labelOff: "Follow",
      toastOn: "Now following {x}",
      toastOff: "Unfollowed {x}",
      kind: "save",
    });

    bindToggle(document.getElementById("save-btn"), {
      initialOn: false,
      labelOn: "Saved",
      labelOff: "Save",
      toastOn: "Saved {x} to your inventory",
      toastOff: "Removed {x} from saved",
      kind: "save",
    });

    /* ─── Tabs are real links to dedicated pages — keep the query string
       (slug/user) so every tab renders the same extension ──────────────── */

    document
      .querySelectorAll(".ext-tabs a.tab-btn[href]")
      .forEach(function (a) {
        try {
          var url = new URL(a.href, location.href);
          if (slug) url.searchParams.set("slug", slug);
          if (user) url.searchParams.set("user", user);
          a.href = url.pathname + url.search;
        } catch (e) {}
      });

    /* ─── Download button: demo toast ───────────────────────────────────── */

    var downloadBtn = document.querySelector(".download-btn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", function () {
        if (S.showToast) S.showToast("Download started (demo)", "info");
      });
    }

    /* ─── Security card — expand the full report, collapse back to the
       limited summary ──────────────────────────────────────────────────── */

    var secToggle = document.getElementById("sec-toggle");
    var secDetails = document.getElementById("sec-details");
    if (secToggle && secDetails) {
      secToggle.addEventListener("click", function () {
        var open = secDetails.classList.toggle("open");
        secToggle.classList.toggle("open", open);
        secToggle.setAttribute("aria-expanded", String(open));
        var label = secToggle.querySelector(".sec-toggle-label");
        if (label) {
          label.textContent = open ? "Hide full report" : "View full report";
        }
      });
    }

    /* ─── Security score — color + gauge derive from a 0–100 safety value ── */

    (function initSecScore() {
      var box = document.getElementById("sec-score");
      if (!box) return;
      var raw = parseInt(box.getAttribute("data-score"), 10);
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
      box.style.setProperty("--pct", String(score));
      box.setAttribute(
        "aria-label",
        "Security score: " + score + " out of 100, " + word.toLowerCase(),
      );

      var valEl = box.querySelector(".sec-score-val");
      if (valEl) valEl.textContent = String(score);
      var tierEl = box.querySelector(".sec-score-tier");
      if (tierEl) tierEl.textContent = word;
    })();

    /* ─── Permission rows — pressing a row reveals its justification ────── */

    document.querySelectorAll(".sec-perms .perm-row").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var row = btn.closest(".perm");
        if (!row) return;
        var open = row.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(open));
      });
    });

    /* ─── Data destinations — "Read more" reveals the full details ─────── */

    document.querySelectorAll(".sec-dest .dest-more").forEach(function (btn) {
      var label = btn.querySelector(".dest-more-label");
      btn.addEventListener("click", function () {
        var card = btn.closest(".dest");
        if (!card) return;
        var open = card.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(open));
        if (label) label.textContent = open ? "Show less" : "Read more";
      });
    });

    /* ─── Community discussions — the chevron reveals the replies ───────── */

    document.querySelectorAll(".disc-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var thread = btn.closest(".disc-thread");
        if (!thread) return;
        var open = thread.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(open));
        btn.setAttribute("aria-label", open ? "Hide replies" : "Show replies");
      });
    });

    /* ─── "Read more" — reveals the second-level comments under a reply ── */

    document.querySelectorAll(".disc-more").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var nested = btn.nextElementSibling;
        if (!nested || !nested.classList.contains("disc-nested")) return;
        var open = nested.classList.toggle("open");
        btn.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", String(open));
        var label = btn.querySelector(".disc-more-label");
        if (label) label.textContent = open ? "Show less" : "Read more";
      });
    });

    /* ─── Hashtags — click jumps to the home page and searches that category ─ */

    document.querySelectorAll(".ext-tags-row .hashtag").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tag =
          btn.getAttribute("data-tag") ||
          btn.textContent.replace(/[[\]#]/g, "").trim();
        if (!tag) return;
        if (S.startLoadBar) S.startLoadBar();
        location.href = "index.html?search=" + encodeURIComponent(tag);
      });
    });

    /* ─── Files browser — GitHub-style folder navigation + file viewing ─── */

    (function initFileBrowser() {
      var body = document.getElementById("fb-body");
      var table = document.getElementById("fb-table");
      var viewer = document.getElementById("fb-viewer");
      var crumbsEl = document.getElementById("fb-crumbs");
      if (!body || !table || !viewer || !crumbsEl) return;

      var TREE = S.REPO_TREE || { name: ".", type: "dir", children: [] };
      var ownerEl = document.getElementById("ext-owner");
      var nameEl = document.getElementById("ext-name");
      var repoLabel =
        (ownerEl ? ownerEl.textContent : "Edge0") +
        "/" +
        (nameEl ? nameEl.textContent : "Audio8-ASR-Infinite");
      var branch = "main";
      var path = [];
      var openFile = null;

      var ICON_DIR =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';
      var ICON_FILE =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';
      var ICON_UP =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
      var ICON_BACK =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>';

      function esc(s) {
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

      function resolveDir(p) {
        var node = TREE;
        for (var i = 0; i < p.length; i++) {
          var next = null;
          (node.children || []).forEach(function (c) {
            if (c.type === "dir" && c.name === p[i]) next = c;
          });
          if (!next) return null;
          node = next;
        }
        return node;
      }

      function renderCrumbs() {
        var html =
          '<button type="button" class="fb-crumb" data-depth="0">' +
          esc(repoLabel) +
          '</button><span class="fb-sep">/</span>' +
          '<button type="button" class="fb-crumb fb-branch" data-depth="0">' +
          esc(branch) +
          "</button>";
        for (var i = 0; i < path.length; i++) {
          html +=
            '<span class="fb-sep">/</span>' +
            '<button type="button" class="fb-crumb" data-depth="' +
            (i + 1) +
            '">' +
            esc(path[i]) +
            "</button>";
        }
        crumbsEl.innerHTML = html;
      }

      function render() {
        renderCrumbs();
        if (openFile) {
          table.hidden = true;
          viewer.hidden = false;
          renderFile();
        } else {
          viewer.hidden = true;
          table.hidden = false;
          renderList(resolveDir(path) || TREE);
        }
      }

      function renderList(node) {
        var entries = (node.children || []).slice().sort(function (a, b) {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return String(a.name).localeCompare(String(b.name));
        });
        var rows = "";
        if (path.length) {
          rows +=
            '<tr class="fb-up-row"><td colspan="3">' +
            '<button type="button" class="fb-entry file-name" data-up="1">' +
            ICON_UP +
            '<span class="fb-entry-name">..</span></button></td></tr>';
        }
        entries.forEach(function (c) {
          var isDir = c.type === "dir";
          rows +=
            "<tr>" +
            '<td><button type="button" class="fb-entry file-name' +
            (isDir ? " fb-dir" : "") +
            '" data-name="' +
            esc(c.name) +
            '" data-type="' +
            c.type +
            '">' +
            (isDir ? ICON_DIR : ICON_FILE) +
            '<span class="fb-entry-name">' +
            esc(c.name) +
            (isDir ? "/" : "") +
            "</span></button></td>" +
            '<td class="file-size">' +
            (isDir ? "&mdash;" : esc(c.size || "—")) +
            "</td>" +
            '<td class="file-updated">' +
            esc(c.updated || "") +
            "</td></tr>";
        });
        body.innerHTML = rows;
      }

      function renderFile() {
        var node = openFile.node;
        var full = openFile.path.concat([node.name]).join("/");
        var head =
          '<div class="fb-file-head">' +
          '<button type="button" class="fb-back">' +
          ICON_BACK +
          "Files</button>" +
          '<div class="fb-file-titlebar">' +
          '<span class="file-name">' +
          ICON_FILE +
          '<span class="fb-entry-name">' +
          esc(node.name) +
          "</span></span>" +
          '<span class="fb-file-path">' +
          esc(full) +
          "</span>" +
          '<span class="fb-file-size">' +
          esc(node.size || "") +
          "</span>" +
          "</div>" +
          "</div>";
        var inner;
        if (node.binary) {
          inner =
            '<div class="fb-binary"><span class="fb-binary-ic">' +
            ICON_FILE +
            "</span>" +
            esc(node.note || "Binary file — preview not available.") +
            "</div>";
        } else {
          var lines = String(node.text || "")
            .replace(/\n+$/, "")
            .split("\n");
          inner =
            '<div class="fb-codeview">' +
            lines
              .map(function (l, i) {
                return (
                  '<div class="fb-line"><span class="fb-ln">' +
                  (i + 1) +
                  '</span><span class="fb-lc">' +
                  (esc(l) || " ") +
                  "</span></div>"
                );
              })
              .join("") +
            "</div>";
        }
        viewer.innerHTML = head + inner;
      }

      crumbsEl.addEventListener("click", function (e) {
        var btn = e.target.closest(".fb-crumb");
        if (!btn) return;
        path = path.slice(0, parseInt(btn.getAttribute("data-depth"), 10) || 0);
        openFile = null;
        render();
      });

      body.addEventListener("click", function (e) {
        var btn = e.target.closest(".fb-entry");
        if (!btn) return;
        if (btn.getAttribute("data-up")) {
          path.pop();
          openFile = null;
          render();
          return;
        }
        var node = resolveDir(path) || TREE;
        var child = null;
        (node.children || []).forEach(function (c) {
          if (c.name === btn.getAttribute("data-name")) child = c;
        });
        if (!child) return;
        if (child.type === "dir") {
          path.push(child.name);
          openFile = null;
        } else {
          openFile = { node: child, path: path.slice() };
        }
        render();
      });

      viewer.addEventListener("click", function (e) {
        if (e.target.closest(".fb-back")) {
          openFile = null;
          render();
        }
      });

      render();
    })();
  });
})();
