/*
 * Sprinkle API client.
 * Bridges the static pages to the Elysia gateway (src/gateway/index.ts):
 * /showcase, /extensions, /saved-extensions and the extension metrics routes.
 */
window.SPRINKLE = window.SPRINKLE || {};

(function () {
  "use strict";

  var S = window.SPRINKLE;

  function loginDbg(event, data) {
    if (window.SPRINKLE_LOGIN_DEBUG === false) return;
    console.info(
      "%c[login-dbg] " + event,
      "color:#38bdf8;font-weight:bold",
      data === undefined ? "" : data,
    );
  }

  function debugBody(body) {
    if (!body || typeof body !== "object") return String(body);
    var copy = {};
    Object.keys(body).forEach(function (key) {
      copy[key] =
        key === "password" ? String(body[key]).length + " chars" : body[key];
    });
    return copy;
  }

  S.loginDbg = loginDbg;

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

    var debug = path.indexOf("/user/") === 0;
    var url = apiBase() + path;

    if (debug) {
      loginDbg("api:request", {
        method: init.method,
        url: url,
        pageOrigin: location.origin,
        body: opts.body instanceof FormData ? "FormData" : debugBody(opts.body),
      });
    }

    return fetch(url, init)
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

          if (debug) {
            loginDbg("api:response", {
              url: url,
              status: res.status,
              ok: res.ok,
              loginKind: payload ? payload.loginKind : null,
              message: payload ? payload.message : null,
              raw: text ? text.slice(0, 160) : "",
            });
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
        if (debug) {
          loginDbg("api:network-error", {
            url: url,
            name: err && err.name,
            message: (err && err.message) || "unknown",
            hint: "fetch rejected before any response: gateway down, wrong apiBase, or CORS blocked",
          });
        }
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

    addReply: function (commentId, content) {
      var path = "/comments/" + encodeURIComponent(commentId) + "/replies";
      return request(path, { method: "POST", body: { content: content } });
    },

    deleteComment: function (commentId) {
      return request("/comments/" + encodeURIComponent(commentId), {
        method: "DELETE",
      });
    },

    deleteReply: function (replyId) {
      return request("/comments/replies/" + encodeURIComponent(replyId), {
        method: "DELETE",
      });
    },

    updateProfile: function (payload) {
      return request("/user/profile", { method: "PATCH", body: payload });
    },

    register: function (payload) {
      return request("/user/register", { method: "POST", body: payload });
    },

    login: function (payload) {
      return request("/user/login", { method: "POST", body: payload });
    },

    getUserByUsername: function (username) {
      return request("/user/getUserByUsername/" + encodeURIComponent(username));
    },

    listPlans: function () {
      return request("/payment/plans");
    },

    subscription: function () {
      return request("/payment/subscription");
    },

    selectPlan: function (planId) {
      return request("/payment/create", {
        method: "POST",
        body: { planId: Number(planId) },
      });
    },

    cancelSubscription: function () {
      return request("/payment/cancel", { method: "POST", body: {} });
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

  function licenseSummary(extension) {
    var raw =
      extension.licenseDescription ||
      (extension.licensePermissions || extension.licenseConditions
        ? "License terms reported by the package manifest."
        : "No license summary was published for this extension.");

    var clean = String(raw).replace(/\s+/g, " ").trim();
    var stop = clean.search(/[.!?](\s|$)/);
    var first = stop > 0 ? clean.slice(0, stop + 1) : clean;

    var max = 140;
    if (first.length <= max) return first;

    var cut = first.slice(0, max);
    var space = cut.lastIndexOf(" ");
    cut = space > 60 ? cut.slice(0, space) : cut;
    return cut.replace(/[,.;:]+$/, "") + "…";
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
    var summary = licenseSummary(extension);
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
      return (
        "/sprinkle-interface-html/pages/extensions.html?id=" +
        encodeURIComponent(extension.id)
      );
    }
    return (
      "/sprinkle-interface-html/pages/extensions.html?slug=" +
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

  // Emoji / pictograph / dingbat / flag code points that GitHub draws as
  // colorful icons and that read as "mysterious objects" in plain text.
  var README_NOISE_CHARS =
    /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2122}\u{2139}]/gu;

  // Turn a single prose line into clean, readable text: drop icons, unwrap
  // links to their labels, remove images and strip raw HTML badge markup.
  function cleanReadmeLine(line) {
    var out = line.replace(README_NOISE_CHARS, "");

    // :emoji: style shortcodes.
    out = out.replace(/:[a-z0-9_+-]+:/gi, " ");

    // Reference-style link/image definitions:  [id]: <url>  (whole line).
    if (/^[ \t]*\[[^\]\n]+\]:[ \t]*\S+[ \t]*$/.test(out)) return "";

    // Markdown images -> removed entirely (badges, screenshots).
    out = out.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
    out = out.replace(/!\[[^\]]*\]\[[^\]]*\]/g, "");

    // Markdown links -> keep the readable label, drop the target.
    out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
    out = out.replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1");

    // Links left with no label (badge wrappers) -> removed.
    out = out.replace(/\[\]\([^)]*\)/g, "");
    out = out.replace(/\[\]\[[^\]]*\]/g, "");

    // Autolinks <http://...> -> keep the plain URL text.
    out = out.replace(/<((?:https?|ftp):\/\/[^>\s]+)>/gi, "$1");

    // Residual raw HTML: drop script/style blocks, soft breaks, then tags.
    out = out.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ");
    out = out.replace(/<br\s*\/?>/gi, " ");
    out = out.replace(/<[^>]+>/g, "");

    // Tidy whitespace left behind by the removed tokens.
    out = out.replace(/[ \t]{2,}/g, " ");
    out = out.replace(/[ \t]+(?=[.,;:!?])/g, "");
    return out.replace(/[ \t]+$/, "").trim();
  }

  // Clean the announcement/README prose without touching fenced code blocks,
  // so snippets stay literal while the surrounding text reads like GitHub.
  function cleanReadme(markdown) {
    var inCode = false;
    return String(markdown || "")
      .split("\n")
      .map(function (rawLine) {
        if (/^ {0,3}(```|~~~)/.test(rawLine)) {
          inCode = !inCode;
          return rawLine;
        }
        if (inCode) return rawLine;
        return cleanReadmeLine(rawLine);
      })
      .join("\n");
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
    var lines = cleanReadme(markdown).replace(/\r\n?/g, "\n").split("\n");

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
        var level = Math.min(6, heading[1].length);
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
