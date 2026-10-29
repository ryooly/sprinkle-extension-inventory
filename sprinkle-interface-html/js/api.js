/*
 * Sprinkle API client.
 * Bridges the static pages to the Elysia gateway (src/gateway/index.ts):
 * /showcase, /extensions, /saved-extensions and the extension metrics routes.
 */
window.SPRINKLE = window.SPRINKLE || {};

(function () {
  "use strict";

  var S = window.SPRINKLE;

  var CATEGORY_META = {
    productivity: { label: "Productivity", genre: "Productivity" },
    developer_tools: { label: "Developer", genre: "Developer" },
    communication: { label: "Communication", genre: "Writing" },
    design: { label: "Design", genre: "Design" },
    finance: { label: "Finance", genre: "Developer" },
    security: { label: "Security", genre: "Developer" },
    education: { label: "Education", genre: "Notes" },
    entertainment: { label: "Entertainment", genre: "Design" },
    social: { label: "Social", genre: "Writing" },
    utilities: { label: "Utilities", genre: "Developer" },
    general: { label: "General", genre: "Notes" },
    misc: { label: "Misc", genre: "Notes" },
    other: { label: "Other", genre: "Developer" },
  };

  var BROWSER_LABELS = {
    chrome: "Chrome",
    edge: "Edge",
    firefox: "Firefox",
    opera: "Opera Mini",
    safari: "Safari",
  };

  function apiBase() {
    if (window.SPRINKLE_API_BASE) {
      return String(window.SPRINKLE_API_BASE).replace(/\/+$/, "");
    }
    try {
      if (
        /^(localhost|127\.0\.0\.1)$/i.test(location.hostname) &&
        location.port === "3000"
      ) {
        return "";
      }
    } catch (e) {}
    return "http://localhost:3000";
  }

  function queryString(params) {
    if (!params) return "";
    var parts = [];
    Object.keys(params).forEach(function (key) {
      var value = params[key];
      if (value === undefined || value === null || value === "") return;
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
    });
    return parts.length ? "?" + parts.join("&") : "";
  }

  function request(path, options) {
    var opts = options || {};
    var init = {
      method: opts.method || "GET",
      credentials: "include",
      headers: {},
    };

    if (opts.body instanceof FormData) {
      init.body = opts.body;
    } else if (opts.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }

    return fetch(apiBase() + path, init)
      .then(function (res) {
        return res.text().then(function (text) {
          var payload = null;
          if (text) {
            try {
              payload = JSON.parse(text);
            } catch (e) {
              payload = null;
            }
          }
          return {
            ok: res.ok,
            status: res.status,
            payload: payload,
            data:
              payload && Object.prototype.hasOwnProperty.call(payload, "data")
                ? payload.data
                : payload,
            message:
              payload && typeof payload.message === "string"
                ? payload.message
                : "",
          };
        });
      })
      .catch(function (err) {
        return {
          ok: false,
          status: 0,
          payload: null,
          data: null,
          message: (err && err.message) || "Network error",
        };
      });
  }

  var api = {
    base: apiBase,
    request: request,

    dailyShowcase: function (date) {
      return request("/showcase" + queryString({ date: date }));
    },

    premiumShowcase: function (date) {
      return request("/showcase/premium" + queryString({ date: date }));
    },

    listExtensions: function (params) {
      return request("/extensions" + queryString(params));
    },

    getExtension: function (id) {
      return request("/extensions/" + encodeURIComponent(id));
    },

    getExtensionFile: function (id, path) {
      return request(
        "/extensions/" +
          encodeURIComponent(id) +
          "/file" +
          queryString({ path: path }),
      );
    },

    bundleUrl: function (id) {
      return apiBase() + "/extensions/" + encodeURIComponent(id) + "/bundle";
    },

    incrementView: function (id) {
      return request("/extensions/" + encodeURIComponent(id) + "/view", {
        method: "POST",
      });
    },

    incrementDownload: function (id) {
      return request("/extensions/" + encodeURIComponent(id) + "/download", {
        method: "POST",
      });
    },

    listSaved: function () {
      return request("/saved-extensions");
    },

    saveExtension: function (id) {
      return request("/saved-extensions/" + encodeURIComponent(id), {
        method: "POST",
      });
    },

    unsaveExtension: function (id) {
      return request("/saved-extensions/" + encodeURIComponent(id), {
        method: "DELETE",
      });
    },

    createExtension: function (formData) {
      return request("/extensions/creating", {
        method: "POST",
        body: formData,
      });
    },

    listComments: function (extensionId) {
      return request("/comments/extension/" + encodeURIComponent(extensionId));
    },

    addComment: function (extensionId, content) {
      return request("/comments/extension/" + encodeURIComponent(extensionId), {
        method: "POST",
        body: { content: content },
      });
    },

    register: function (payload) {
      return request("/user/register", { method: "POST", body: payload });
    },

    login: function (payload) {
      return request("/user/login", { method: "POST", body: payload });
    },

    getUserByUsername: function (username) {
      return request(
        "/user/getUserByUsername/" + encodeURIComponent(username),
      );
    },
  };

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value).replace(
      /[&<>"']/g,
      function (char) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[char];
      },
    );
  }

  function formatCount(value) {
    var n = Number(value) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return String(n);
  }

  function formatDate(value) {
    if (!value) return "";
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function timeAgo(value) {
    if (!value) return "";
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    var diff = Math.max(0, Date.now() - date.getTime());
    var minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return minutes + " min ago";
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
    var days = Math.floor(hours / 24);
    if (days < 30) return days + (days === 1 ? " day ago" : " days ago");
    return formatDate(value);
  }

  function categoryMeta(extension) {
    var categories = (extension && extension.categories) || [];
    for (var i = 0; i < categories.length; i++) {
      var meta = CATEGORY_META[categories[i]];
      if (meta) return meta;
    }
    return { label: "Extension", genre: "Developer" };
  }

  function notesOf(extension) {
    if (!extension) return "";
    var announcement =
      typeof extension.announcement === "string"
        ? extension.announcement.trim()
        : "";
    if (announcement) return announcement;
    return typeof extension.description === "string"
      ? extension.description
      : "";
  }

  function languagesOf(extension) {
    var languages = []
      .concat(extension.frontendLanguages || [])
      .concat(extension.backendLanguages || []);
    var seen = {};
    return languages.filter(function (language) {
      if (!language || seen[language]) return false;
      seen[language] = true;
      return true;
    });
  }

  function browserLabels(extension) {
    return (extension.supportedBrowsers || []).map(function (browser) {
      return BROWSER_LABELS[browser] || browser;
    });
  }

  function licenseOf(extension) {
    var permissions = extension.licensePermissions || [];
    var conditions = extension.licenseConditions || [];
    var limitations = extension.licenseLimitations || [];

    var groups = [];
    if (permissions.length)
      groups.push({
        kind: "allowed",
        label: "Permissions",
        items: permissions,
      });
    if (conditions.length)
      groups.push({ kind: "warn", label: "Conditions", items: conditions });
    if (limitations.length)
      groups.push({ kind: "denied", label: "Limitations", items: limitations });

    var name =
      extension.licenseName || extension.licenseKey || "Custom license";
    var summary =
      extension.licenseDescription ||
      (groups.length
        ? "License terms reported by the package manifest."
        : "No license summary was published for this extension.");

    return {
      spdx: extension.licenseKey || extension.licenseName || "custom",
      name: name,
      tagline: extension.licenseKey
        ? "SPDX · " + extension.licenseKey
        : "Custom terms",
      summary: summary,
      groups: groups,
      url: extension.licenseUrl || "",
    };
  }

  function extensionHref(extension) {
    if (extension && extension.id) {
      return "extensions.html?id=" + encodeURIComponent(extension.id);
    }
    return (
      "extensions.html?slug=" +
      encodeURIComponent(extension.name || "") +
      "&user=" +
      encodeURIComponent(extension.developer || "")
    );
  }

  function repoName(extension) {
    var name = extension.name || "untitled";
    var developer = extension.developer || "";
    // Ingested rows sometimes store "owner/repo" as the name.
    if (developer && name.indexOf(developer + "/") === 0) {
      name = name.slice(developer.length + 1);
    }
    return name;
  }

  function toCard(extension) {
    if (!extension) return null;
    var meta = categoryMeta(extension);
    return {
      id: extension.id,
      user: extension.developer || "unknown",
      repo: repoName(extension),
      genre: meta.genre,
      genreLabel: meta.label,
      views: Number(extension.views) || 0,
      downloads: Number(extension.downloads) || 0,
      viewsLabel: formatCount(extension.views),
      downloadsLabel: formatCount(extension.downloads),
      status: extension.extensionStatus === "premium" ? "premium" : "basic",
      statusLabel:
        extension.extensionStatus === "premium" ? "Premium" : "Basic",
      href: extensionHref(extension),
      categories: extension.categories || [],
      hashtags: extension.hashtags || [],
      languages: languagesOf(extension),
      publishedBy: extension.publishedBy,
      source: extension.source,
      extensionLink: extension.extensionLink,
      createdAt: extension.createdAt,
      updatedAt: extension.updatedAt,
    };
  }

  function cardsFrom(items) {
    return (items || []).map(toCard).filter(Boolean);
  }

  function cardMatches(card, query) {
    if (!query) return true;
    var haystack = []
      .concat([card.user, card.repo, card.genreLabel])
      .concat(card.categories || [])
      .concat(card.hashtags || [])
      .concat(card.languages || [])
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(String(query).toLowerCase()) !== -1;
  }

  function inlineMarkdown(text) {
    var out = escapeHtml(text);
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    out = out.replace(
      /!\[([^\]]*)\]\((https?:[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
    out = out.replace(
      /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
    return out;
  }

  function renderMarkdown(markdown) {
    var lines = String(markdown || "")
      .replace(/\r\n/g, "\n")
      .split("\n");

    var html = [];
    var paragraph = [];
    var list = null;
    var code = null;

    function flushParagraph() {
      if (!paragraph.length) return;
      html.push("<p>" + inlineMarkdown(paragraph.join(" ")) + "</p>");
      paragraph = [];
    }

    function flushList() {
      if (!list) return;
      html.push(
        "<" +
          list.tag +
          ">" +
          list.items
            .map(function (item) {
              return "<li>" + inlineMarkdown(item) + "</li>";
            })
            .join("") +
          "</" +
          list.tag +
          ">",
      );
      list = null;
    }

    function flushCode() {
      if (!code) return;
      html.push(
        '<pre class="notes-code"><code>' +
          escapeHtml(code.lines.join("\n")) +
          "</code></pre>",
      );
      code = null;
    }

    function flushAll() {
      flushParagraph();
      flushList();
      flushCode();
    }

    lines.forEach(function (rawLine) {
      var line = rawLine.replace(/\s+$/, "");

      if (/^```/.test(line)) {
        if (code) {
          flushCode();
        } else {
          flushParagraph();
          flushList();
          code = { lines: [] };
        }
        return;
      }

      if (code) {
        code.lines.push(rawLine);
        return;
      }

      if (!line.trim()) {
        flushParagraph();
        flushList();
        return;
      }

      var heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        flushAll();
        var level = Math.min(6, Math.max(3, heading[1].length + 1));
        html.push(
          "<h" +
            level +
            ">" +
            inlineMarkdown(heading[2].trim()) +
            "</h" +
            level +
            ">",
        );
        return;
      }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        flushAll();
        html.push("<hr>");
        return;
      }

      var unordered = /^\s*[-*+]\s+(.*)$/.exec(line);
      if (unordered) {
        flushParagraph();
        if (!list || list.tag !== "ul") {
          flushList();
          list = { tag: "ul", items: [] };
        }
        list.items.push(unordered[1].trim());
        return;
      }

      var ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
      if (ordered) {
        flushParagraph();
        if (!list || list.tag !== "ol") {
          flushList();
          list = { tag: "ol", items: [] };
        }
        list.items.push(ordered[1].trim());
        return;
      }

      var quote = /^>\s?(.*)$/.exec(line);
      if (quote) {
        flushParagraph();
        flushList();
        html.push(
          '<blockquote class="notes-quote">' +
            inlineMarkdown(quote[1]) +
            "</blockquote>",
        );
        return;
      }

      flushList();
      paragraph.push(line.trim());
    });

    flushAll();
    return html.join("\n");
  }

  S.api = api;
  S.CATEGORY_META = CATEGORY_META;
  S.BROWSER_LABELS = BROWSER_LABELS;
  S.escapeHtml = escapeHtml;
  S.formatCount = formatCount;
  S.formatDate = formatDate;
  S.timeAgo = timeAgo;
  S.categoryMeta = categoryMeta;
  S.notesOf = notesOf;
  S.languagesOf = languagesOf;
  S.browserLabels = browserLabels;
  S.licenseOf = licenseOf;
  S.extensionHref = extensionHref;
  S.toCard = toCard;
  S.cardsFrom = cardsFrom;
  S.cardMatches = cardMatches;
  S.renderMarkdown = renderMarkdown;
})();
