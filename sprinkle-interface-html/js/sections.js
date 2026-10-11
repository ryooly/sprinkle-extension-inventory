

(function () {
  "use strict";

  var S = window.SPRINKLE;

  document.addEventListener("DOMContentLoaded", function () {
    S.injectHeader(function () {
      S.initTheme();
      S.initHeader();

      if (S.hydrateIcons) S.hydrateIcons(document.body);
      initSection();
    });
  });



  var catalog = (function () {
    var map = {};
    S.flattenCards().forEach(function (card) {
      map[card.user + "/" + card.repo] = card;
    });
    return map;
  })();

  function pick(keys) {
    var out = [];
    keys.forEach(function (key) {
      if (catalog[key]) out.push(catalog[key]);
    });
    return out;
  }




  var INVENTORY_KEYS = [
    "sprinkle-labs/sprinkle-notes",
    "flowco/flow-board-lite",
    "datalens-io/datalens-core",
    "focusframe/focusframe-pro",
    "inboxzero/inboxzero-engine",
    "pixelcraft/pixelcraft-editor",
    "codegarden/codegarden-sandbox",
    "envsafe/envsafe-manager",
  ];


  var SAVED_SEED_KEYS = [
    "podwave-hq/podwave-2.1",
    "palette-ai/palette-colorgen-2.0",
    "notesync/notesync-realtime",
    "apiforge/apiforge-designer",
  ];

  function savedItems() {
    var ids = {};
    SAVED_SEED_KEYS.forEach(function (k) {
      ids[k] = true;
    });
    try {
      var live = JSON.parse(localStorage.getItem("sprinkle:saves")) || {};
      Object.keys(live).forEach(function (k) {
        if (live[k]) ids[k] = true;
      });
    } catch (e) {

    }

    var keys = SAVED_SEED_KEYS.slice();
    Object.keys(ids).forEach(function (k) {
      if (keys.indexOf(k) === -1) keys.push(k);
    });
    return pick(keys);
  }


  var HISTORY_ROWS = [
    { key: "sprinkle-labs/sprinkle-notes", time: "2 hours ago" },
    { key: "copyforge/copyforge-v3-instruct", time: "Yesterday" },
    { key: "voiceclone-ai/voiceclone-7B", time: "2 days ago" },
    { key: "pixelcraft/pixelcraft-editor", time: "4 days ago" },
    { key: "habitloop/habitloop-tracker", time: "Last week" },
    { key: "storyline-io/storyline-arc", time: "2 weeks ago" },
  ];

  function historyItems() {
    var out = [];
    HISTORY_ROWS.forEach(function (row) {
      if (catalog[row.key])
        out.push({ card: catalog[row.key], time: row.time });
    });
    return out;
  }

  var CONFIG = {
    inventory: {
      noun: "extensions",
      render: "grid",
      items: function () {
        return pick(INVENTORY_KEYS);
      },
    },
    saved: {
      noun: "extensions",
      render: "grid",
      items: savedItems,
    },
    history: {
      noun: "visits",
      render: "history",
      items: historyItems,
    },
  };



  function initSection() {
    var key = document.body.getAttribute("data-section");
    var conf = CONFIG[key];
    var grid = document.getElementById("section-results");
    var search = document.getElementById("section-search");
    var countEl = document.getElementById("section-count");
    if (!conf || !grid) return;

    var items = conf.items();

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

    function updateCount(noun, count) {
      if (!countEl) return;
      countEl.textContent = count + " " + noun;
    }

    function render(query) {
      var matched;

      if (conf.render === "history") {
        matched = items.filter(function (row) {
          return S.cardMatchesQuery(row.card, query);
        });
        grid.className = "history-list";
        grid.innerHTML = matched
          .map(function (row) {
            return (
              '<div class="history-row">' +
              '<span class="history-time">' +
              escapeText(row.time) +
              "</span>" +
              S.cardHtml(row.card, true) +
              "</div>"
            );
          })
          .join("");
      } else {
        matched = items.filter(function (card) {
          return S.cardMatchesQuery(card, query);
        });
        grid.className = "card-grid";
        grid.innerHTML = matched
          .map(function (card) {
            return S.cardHtml(card, false);
          })
          .join("");
      }

      if (!matched.length) {
        grid.innerHTML =
          '<div class="grid-empty">No ' +
          conf.noun +
          (query
            ? " match <strong>" + escapeText(query) + "</strong>."
            : " yet.") +
          "</div>";
      }

      if (S.applyCardStates) S.applyCardStates(grid);
      updateCount(query ? "matching" : conf.noun, matched.length);
    }

    render("");

    if (search) {
      search.addEventListener("input", function () {
        render(search.value.trim().toLowerCase());
      });
    }
  }
})();
