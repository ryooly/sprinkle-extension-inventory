(function () {
  "use strict";

  var S = window.SPRINKLE;
  var SAVES_KEY = "sprinkle:saves";
  var HISTORY_KEY = "sprinkle:history";
  var flags = { signedOut: false };

  document.addEventListener("DOMContentLoaded", function () {
    S.injectHeader(function () {
      S.initHeader();

      if (S.hydrateIcons) S.hydrateIcons(document.body);
      initSection();
    });
  });

  function initSection() {
    var key = document.body.getAttribute("data-section");
    var grid = document.getElementById("section-results");
    var search = document.getElementById("section-search");
    var countEl = document.getElementById("section-count");
    if (!grid) return;

    var noun = key === "history" ? "visits" : "extensions";
    var items = [];
    var loading = true;
    var error = "";

    function currentQuery() {
      return search && search.value ? search.value.trim().toLowerCase() : "";
    }

    function render(query) {
      if (loading) {
        grid.className = "card-grid";
        grid.innerHTML = '<div class="grid-empty">Loading ' + noun + "…</div>";
        return;
      }

      if (error) {
        grid.className = "card-grid";
        grid.innerHTML =
          '<div class="grid-empty">' + escapeText(error) + "</div>";
        return;
      }

      var matched = items.filter(function (entry) {
        return S.cardMatches(entry.card || entry, query);
      });

      if (key === "history") {
        grid.className = "history-list";
        grid.innerHTML = matched
          .map(function (entry) {
            return (
              '<div class="history-row">' +
              '<span class="history-time">' +
              escapeText(entry.time) +
              "</span>" +
              S.cardHtml(entry.card, true) +
              "</div>"
            );
          })
          .join("");
      } else {
        grid.className = "card-grid";
        grid.innerHTML = matched
          .map(function (entry) {
            return S.cardHtml(entry.card || entry, false);
          })
          .join("");
      }

      if (!matched.length) {
        grid.innerHTML =
          '<div class="grid-empty">' + emptyHtml(query) + "</div>";
      }

      if (S.applyCardStates) S.applyCardStates(grid);
      if (countEl) {
        countEl.textContent =
          matched.length + " " + (query ? "matching" : noun);
      }
    }

    function emptyHtml(query) {
      if (query)
        return (
          "No " + noun + " match <strong>" + escapeText(query) + "</strong>."
        );
      if (key === "saved")
        return flags.signedOut
          ? "Sign in to sync the extensions you save."
          : "No saved extensions yet.";
      if (key === "inventory") return "No extensions published yet.";
      if (key === "history")
        return "No visits yet - open an extension to start your history.";
      return "No extensions yet.";
    }

    render("");

    loadItems(key).then(function (loaded) {
      items = loaded;
      loading = false;
      render(currentQuery());
    });

    if (search) {
      search.addEventListener("input", function () {
        render(currentQuery());
      });
    }
  }

  function loadItems(key) {
    if (key === "saved") return loadSaved();
    if (key === "inventory") return loadInventory();
    if (key === "history") return loadHistory();
    return Promise.resolve([]);
  }

  function loadSaved() {
    return Promise.all([
      S.api.listSaved(),
      S.api.listExtensions({ limit: 60 }),
    ]).then(function (results) {
      var savedRes = results[0];
      var byId = indexCatalog(results[1]);
      flags.signedOut = savedRes.status === 401 || savedRes.status === 403;

      if (savedRes.ok && Array.isArray(savedRes.data)) {
        var savedById = {};
        savedRes.data.forEach(function (item) {
          if (item && item.id) savedById[item.id] = item;
        });

        return savedRes.data
          .map(function (item) {
            if (!item || !item.id) return null;
            return S.toCard(byId[item.id] || savedById[item.id]);
          })
          .filter(isValidCard);
      }

      return localSavedIds()
        .map(function (id) {
          return byId[id] ? S.toCard(byId[id]) : null;
        })
        .filter(Boolean);
    });
  }

  function loadInventory() {
    return S.api
      .listExtensions({ publisher: "user", limit: 60 })
      .then(function (res) {
        if (!res.ok || !res.data) return [];
        return S.cardsFrom(res.data.items || []).filter(isValidCard);
      });
  }

  function loadHistory() {
    var rows = readHistory();
    if (!rows.length) return Promise.resolve([]);

    return S.api.listExtensions({ limit: 60 }).then(function (res) {
      var byId = indexCatalog(res);
      return rows
        .map(function (row) {
          var item = byId[row.id];
          if (!item) return null;
          return { card: S.toCard(item), time: S.timeAgo(row.at) };
        })
        .filter(Boolean);
    });
  }

  function indexCatalog(res) {
    var byId = {};
    if (res && res.ok && res.data && res.data.items) {
      res.data.items.forEach(function (item) {
        byId[item.id] = item;
      });
    }
    return byId;
  }

  function isValidCard(card) {
    return !!card && card.repo !== "untitled";
  }

  function localSavedIds() {
    try {
      var map = JSON.parse(localStorage.getItem(SAVES_KEY) || "{}") || {};
      return Object.keys(map).filter(function (id) {
        return map[id];
      });
    } catch (e) {
      return [];
    }
  }

  function readHistory() {
    try {
      var rows = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      return [];
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
})();
