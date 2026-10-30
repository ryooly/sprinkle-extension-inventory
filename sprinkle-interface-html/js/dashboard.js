(function () {
  "use strict";

  var S = window.SPRINKLE;
  var CARD_LIMIT = 60;
  var SHOWCASE_IN_GRID = 6;
  var GENRE_ORDER = ["Productivity", "Notes", "Design", "Developer", "Writing"];

  var activeGenre = "Recommendation";
  var activeQuery = "";
  var sidebarExpanded = false;
  var repositoryWidth = 288;
  var isResizing = false;
  var resizeStart = { pointerX: 0, width: 288 };

  var state = {
    loading: true,
    error: "",
    cards: [],
    showcaseCards: [],
    showcaseDate: "",
  };

  document.addEventListener("DOMContentLoaded", function () {
    S.injectHeader(function () {
      S.initHeader();

      if (S.hydrateIcons) S.hydrateIcons(document.body);
      initGenres();
      initGrid();
      initSearch();
      initSidebar();
      initResize();
      loadCatalog();
    });
  });

  document.addEventListener("sprinkle:premium", function () {
    loadCatalog();
  });

  function isPremiumViewer() {
    return !!(
      S.premium &&
      S.premium.state &&
      S.premium.state().isPremium &&
      S.api.premiumShowcase
    );
  }

  function showcaseOrder(a, b) {
    function rank(card) {
      if (card.publishedBy === "user" && card.status === "premium") return 0;
      if (card.publishedBy === "automation") return 1;
      return 2;
    }

    return rank(a) - rank(b);
  }

  function loadCatalog() {
    state.loading = true;
    state.error = "";
    renderGrid();
    renderSidebar(sidebarQuery());

    Promise.all([
      S.api.listExtensions({ limit: CARD_LIMIT }),
      isPremiumViewer() ? S.api.premiumShowcase() : S.api.dailyShowcase(),
    ]).then(function (results) {
      var listRes = results[0];
      var showRes = results[1];

      state.loading = false;

      if (!listRes.ok) {
        state.error =
          listRes.message || "Unable to load the extension catalog.";
        renderGrid();
        renderSidebar(sidebarQuery());
        return;
      }

      var items = (listRes.data && listRes.data.items) || [];
      var byId = {};
      items.forEach(function (item) {
        byId[item.id] = item;
      });

      var showcase =
        (showRes.ok && showRes.data && showRes.data.extensions) || [];
      state.showcaseDate =
        (showRes.ok && showRes.data && showRes.data.date) || "";
      state.showcaseCards = S.cardsFrom(
        showcase.map(function (extension) {
          return byId[extension.id] || extension;
        }),
      ).sort(showcaseOrder);
      state.cards = S.cardsFrom(items);

      renderShowcaseMeta();
      renderPills();
      renderGrid();
      renderSidebar(sidebarQuery());
    });
  }

  function renderShowcaseMeta() {
    var el = document.getElementById("showcase-meta");
    if (!el) return;
    var label = state.showcaseDate
      ? "Updated " + S.formatDate(state.showcaseDate)
      : "Updated daily";
    el.textContent =
      label +
      (isPremiumViewer() ? " · premium picks" : " · refreshes every 24 hours");
  }

  function initGenres() {
    var filterBtn = document.getElementById("filter-btn");
    if (S.hydrateIcons && filterBtn) S.hydrateIcons(filterBtn);
    renderPills();
  }

  function renderPills() {
    var bar = document.getElementById("genre-bar");
    var filterBtn = document.getElementById("filter-btn");
    if (!bar || !filterBtn) return;

    bar.querySelectorAll(".pill").forEach(function (pill) {
      pill.remove();
    });

    var labels = [];
    state.cards.forEach(function (card) {
      if (labels.indexOf(card.genreLabel) === -1) labels.push(card.genreLabel);
    });
    labels.sort(function (a, b) {
      var ai = GENRE_ORDER.indexOf(a);
      var bi = GENRE_ORDER.indexOf(b);
      if (ai === -1) ai = GENRE_ORDER.length;
      if (bi === -1) bi = GENRE_ORDER.length;
      return ai - bi || a.localeCompare(b);
    });

    var genres = ["Recommendation"].concat(labels);
    if (genres.indexOf(activeGenre) === -1) activeGenre = "Recommendation";

    genres.forEach(function (genre) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill";
      btn.dataset.genre = genre;
      btn.setAttribute("aria-pressed", "false");
      if (genre === "Recommendation") {
        btn.classList.add("pill-recommend");
      }
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

  function initGrid() {
    renderGrid();
  }

  function renderGrid() {
    var grid = document.getElementById("card-grid");
    if (!grid) return;

    if (state.loading) {
      grid.innerHTML = '<div class="grid-empty">Loading extensions…</div>';
      updateBanner("", 0);
      return;
    }

    if (state.error) {
      grid.innerHTML =
        '<div class="grid-empty">' +
        escapeText(state.error) +
        ' <button type="button" class="search-banner-clear" id="grid-retry">Retry</button></div>';
      var retry = document.getElementById("grid-retry");
      if (retry) retry.addEventListener("click", loadCatalog);
      updateBanner("", 0);
      return;
    }

    var cards;
    if (activeQuery) {
      cards = state.cards.filter(function (card) {
        return S.cardMatches(card, activeQuery);
      });
    } else if (activeGenre === "Recommendation") {
      cards = state.showcaseCards.length
        ? state.showcaseCards.slice(0, SHOWCASE_IN_GRID)
        : state.cards.slice(0, SHOWCASE_IN_GRID);
    } else {
      cards = state.cards.filter(function (card) {
        return card.genreLabel === activeGenre;
      });
    }

    grid.innerHTML = cards
      .map(function (card) {
        return S.cardHtml(card, false);
      })
      .join("");

    if (!cards.length) {
      grid.innerHTML =
        '<div class="grid-empty">' +
        (activeQuery
          ? "No extensions match <strong>#" +
            escapeText(activeQuery) +
            "</strong>."
          : "No extensions here yet.") +
        "</div>";
    }

    if (S.applyCardStates) S.applyCardStates(grid);
    updateBanner(activeQuery, cards.length);
  }

  function initSearch() {
    var input = document.getElementById("global-search");
    if (!input) return;

    input.addEventListener("input", function () {
      activeQuery = input.value.trim().toLowerCase();
      renderGrid();
    });

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

  function sidebarQuery() {
    var input = document.getElementById("repo-search");
    return input ? input.value.trim().toLowerCase() : "";
  }

  function initSidebar() {
    renderSidebar("");

    var search = document.getElementById("repo-search");
    if (search) {
      search.addEventListener("input", function (event) {
        renderSidebar(event.target.value.trim().toLowerCase());
      });
    }

    var showMore = document.getElementById("show-more");
    if (showMore) {
      showMore.addEventListener("click", function () {
        sidebarExpanded = !sidebarExpanded;
        this.textContent = sidebarExpanded ? "Show less" : "Show more";
        renderSidebar(sidebarQuery());
      });
    }
  }

  function renderSidebar(query) {
    var list = document.getElementById("sidebar-list");
    var showMore = document.getElementById("show-more");
    if (!list) return;

    if (state.loading) {
      list.innerHTML =
        '<div class="text-xs muted-fg" style="padding:0.5rem 0">Loading showcase…</div>';
      if (showMore) showMore.hidden = true;
      return;
    }

    if (state.error) {
      list.innerHTML =
        '<div class="text-xs muted-fg" style="padding:0.5rem 0">Showcase unavailable.</div>';
      if (showMore) showMore.hidden = true;
      return;
    }

    var cards = state.showcaseCards.filter(function (card) {
      return !query || S.cardMatches(card, query);
    });

    if (!cards.length) {
      list.innerHTML =
        '<div class="text-xs muted-fg" style="padding:0.5rem 0">No extensions match.</div>';
      if (showMore) showMore.hidden = true;
      return;
    }

    var limit = sidebarExpanded ? cards.length : Math.min(4, cards.length);
    list.innerHTML = cards
      .slice(0, limit)
      .map(function (card) {
        return S.cardHtml(card, true);
      })
      .join("");
    if (S.applyCardStates) S.applyCardStates(list);
    if (showMore) showMore.hidden = cards.length <= 4;
  }

  function initResize() {
    var handle = document.getElementById("resize-handle");
    if (!handle) return;

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
