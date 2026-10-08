/* ==========================================================================
 * dashboard.js — Home page behaviour (genre pills, card grid, sidebar,
 * resizable repository column). Mirrors src/routes/index.tsx.
 * ========================================================================== */

(function () {
  "use strict";

  var S = window.SPRINKLE;
  var activeGenre = "Recommendation";
  var activeQuery = "";
  var sidebarExpanded = false;
  var repositoryWidth = 288;
  var isResizing = false;
  var resizeStart = { pointerX: 0, width: 288 };

  document.addEventListener("DOMContentLoaded", function () {
    S.injectHeader(function () {
      S.initTheme();
      S.initHeader();
      initGenres();
      initGrid();
      initSearch();
      initSidebar();
      initResize();
    });
  });

  /* ─── Genre pills ─────────────────────────────────────────────────────── */

  function initGenres() {
    var bar = document.getElementById("genre-bar");
    var filterBtn = document.getElementById("filter-btn");

    S.GENRES.slice()
      .reverse()
      .forEach(function (genre) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pill";
        btn.dataset.genre = genre;
        btn.setAttribute("aria-pressed", String(genre === activeGenre));
        btn.textContent = genre;
        btn.addEventListener("click", function () {
          activeGenre = genre;
          clearSearch();
          refreshPills();
          renderGrid();
        });
        bar.insertBefore(btn, filterBtn);
      });

    refreshPills();
  }

  function refreshPills() {
    document.querySelectorAll("#genre-bar .pill").forEach(function (btn) {
      var active = btn.dataset.genre === activeGenre;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  /* ─── Card grid ───────────────────────────────────────────────────────── */

  function initGrid() {
    renderGrid();
  }

  function renderGrid() {
    var grid = document.getElementById("card-grid");
    var query = activeQuery;

    var cards = query
      ? S.flattenCards().filter(function (card) {
          return S.cardMatchesQuery(card, query);
        })
      : (S.CARDS[activeGenre] || []).slice(0, 6);

    grid.innerHTML = cards
      .map(function (card) {
        return S.cardHtml(card, false);
      })
      .join("");

    if (!cards.length) {
      grid.innerHTML =
        '<div class="grid-empty">No extensions match <strong>#' +
        escapeText(query) +
        "</strong>.</div>";
    }

    if (S.applyCardStates) S.applyCardStates(grid);
    updateBanner(query, cards.length);
  }

  /* ─── Search — the header box + hashtag deep-links filter the grid ─────── */

  function initSearch() {
    var input = document.getElementById("global-search");
    if (!input) return;

    input.addEventListener("input", function () {
      activeQuery = input.value.trim().toLowerCase();
      renderGrid();
    });

    /* Arriving from a model-card hashtag: ?search=<tag> pre-fills the box. */
    var params = new URLSearchParams(location.search);
    var tag = params.get("search");
    if (tag) {
      input.value = tag;
      activeQuery = tag.trim().toLowerCase();
      renderGrid();
    }
  }

  function clearSearch() {
    var input = document.getElementById("global-search");
    activeQuery = "";
    if (input) input.value = "";
  }

  function updateBanner(query, count) {
    var grid = document.getElementById("card-grid");
    if (!grid) return;
    var banner = document.getElementById("search-banner");

    if (!query) {
      if (banner) banner.hidden = true;
      return;
    }
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "search-banner";
      banner.className = "search-banner";
      grid.parentNode.insertBefore(banner, grid);
    }
    var label = query.indexOf("#") === 0 ? query : "#" + query;
    banner.innerHTML =
      '<span class="search-banner-text">' +
      count +
      " extension" +
      (count === 1 ? "" : "s") +
      ' tagged <span class="search-banner-tag">' +
      escapeText(label) +
      "</span></span>" +
      '<button type="button" class="search-banner-clear">Clear</button>';
    banner.hidden = false;

    var clearBtn = banner.querySelector(".search-banner-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        clearSearch();
        renderGrid();
      });
    }
  }

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

  /* ─── Sidebar: top repositories + find filter + show more ─────────────── */

  function initSidebar() {
    renderSidebar("");

    document
      .getElementById("repo-search")
      .addEventListener("input", function (event) {
        renderSidebar(event.target.value.trim().toLowerCase());
      });

    document.getElementById("show-more").addEventListener("click", function () {
      sidebarExpanded = !sidebarExpanded;
      this.textContent = sidebarExpanded ? "Show less" : "Show more";
      renderSidebar(
        document.getElementById("repo-search").value.trim().toLowerCase(),
      );
    });
  }

  function renderSidebar(query) {
    var list = document.getElementById("sidebar-list");
    var repos = S.TOP_REPOS.filter(function (card) {
      if (!query) return true;
      return (
        card.user.toLowerCase().indexOf(query) !== -1 ||
        card.repo.toLowerCase().indexOf(query) !== -1
      );
    });
    var limit = sidebarExpanded ? repos.length : Math.min(4, repos.length);
    list.innerHTML = repos
      .slice(0, limit)
      .map(function (card) {
        return S.cardHtml(card, true);
      })
      .join("");
    if (S.applyCardStates) S.applyCardStates(list);
    if (!repos.length) {
      list.innerHTML =
        '<div class="text-xs muted-fg" style="padding:0.5rem 0">No repositories match.</div>';
    }
  }

  /* ─── Resizable repository column ─────────────────────────────────────── */

  function initResize() {
    var handle = document.getElementById("resize-handle");

    handle.addEventListener("pointerdown", function (event) {
      resizeStart = { pointerX: event.clientX, width: repositoryWidth };
      handle.setPointerCapture(event.pointerId);
      setIsResizing(true);
    });

    handle.addEventListener("pointermove", function (event) {
      if (!isResizing) return;
      setWidth(resizeStart.width + event.clientX - resizeStart.pointerX);
    });

    handle.addEventListener("pointerup", function (event) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setIsResizing(false);
    });
    handle.addEventListener("pointercancel", function () {
      setIsResizing(false);
    });

    handle.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") setWidth(repositoryWidth - 16);
      if (event.key === "ArrowRight") setWidth(repositoryWidth + 16);
    });
  }

  function setWidth(next) {
    repositoryWidth = Math.min(480, Math.max(224, next));
    document.getElementById("repo-sidebar").style.width =
      repositoryWidth + "px";
    document
      .getElementById("resize-handle")
      .setAttribute("aria-valuenow", String(repositoryWidth));
  }

  function setIsResizing(value) {
    isResizing = value;
    document
      .getElementById("resize-handle")
      .classList.toggle("resizing", value);
  }
})();
