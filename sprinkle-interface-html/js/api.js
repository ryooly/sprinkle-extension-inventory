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

  // Placeholder slots: a <br> must survive line splitting (a table row keeps
  // its pipes), anchors must survive the emphasis pass (a link target holds
  // underscores that would otherwise turn into <em>).
  var README_LINE_BREAK = "\u0002";
  var README_CODE_SLOT = "\u0000";
  var README_ANCHOR_SLOT = "\u0003";

  var README_ENTITIES = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&#x27;": "'",
  };

  // Raw HTML keeps its text but loses its tags, so the converted markdown is
  // built from plain text only.
  function plainReadmeText(value) {
    return String(value)
      .replace(/<[^>]*>/g, "")
      .split(README_LINE_BREAK)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Strip icons and :emoji: shortcodes from prose while leaving link syntax
  // intact, so the inline pass can still turn [label](url) into an anchor.
  // A shortcode has to start with a letter: ":----:" is a table divider.
  function stripReadmeNoise(line) {
    var out = line.replace(README_NOISE_CHARS, "");
    out = out.replace(/(^|[\s(]):[a-z][a-z0-9_+-]+:(?=[\s).,!?;:]|$)/gi, "$1");
    return out.replace(/[ \t]+$/, "");
  }

  // One fenced block, closing marker included; an unterminated fence runs to
  // the end of the document, exactly like GitHub.
  var README_FENCE_BLOCK =
    /(^[ \t]{0,3}(?:`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*$|(?![\s\S])))/gm;

  // Everything outside a fence: images and raw tags are dropped, markdown gets
  // the equivalent of the HTML that was there. Fenced code is skipped so a
  // "<div>" or "&nbsp;" inside a snippet prints exactly as it was written.
  function readmeProse(text) {
    text = text.replace(/<!--[\s\S]*?-->/g, "");
    text = text.replace(
      /<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    );

    // Badge wrappers and loose images disappear as a whole.
    text = text.replace(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi, "");
    text = text.replace(/<img\b[^>]*>/gi, "");

    // A <br> inside a table cell must not break the row apart, so it becomes a
    // slot that only the inline pass turns back into a line break.
    text = text.replace(/<br\s*\/?>/gi, README_LINE_BREAK);
    text = text.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");

    // Block-level raw HTML is rewritten as markdown before the tags are
    // dropped, otherwise "## Features" style headings vanish from the panel.
    text = text.replace(
      /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi,
      function (match, level, inner) {
        var label = plainReadmeText(inner);
        if (!label) return "";
        return "\n\n" + "######".slice(0, Number(level)) + " " + label + "\n\n";
      },
    );

    // Raw anchors keep their target: the "Language | 中文 | 日本語" switchers
    // and badge-free link lists stay clickable, and inlineMarkdown re-checks
    // every href against safeUrl.
    text = text.replace(
      /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi,
      function (match, attributes, inner) {
        var href = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(
          attributes,
        );
        var target = href ? href[1] || href[2] || href[3] || "" : "";
        var label = plainReadmeText(inner);
        if (!label) return "";
        return target ? "[" + label + "](" + target + ")" : label;
      },
    );

    // Inline raw HTML maps onto the equivalent markdown span.
    text = text.replace(/<\/?(?:strong|b)\s*>/gi, "**");
    text = text.replace(/<\/?(?:em|i)\s*>/gi, "*");
    text = text.replace(/<\/?(?:del|s|strike)\s*>/gi, "~~");
    text = text.replace(/<\/?(?:code|tt|kbd)\s*>/gi, "`");

    // Autolinks keep their target; every other tag is dropped, text kept.
    text = text.replace(/<((?:https?|mailto):[^>\s]+)>/gi, "$1");
    text = text.replace(/<\/?[a-z][^>]*>/gi, "");

    // Entities are decoded only after the tags are gone, so &lt;div&gt; shows
    // up as the text GitHub would print instead of disappearing.
    return text.replace(
      /&(?:nbsp|amp|lt|gt|quot|apos|#39|#x27);/gi,
      function (entity) {
        return README_ENTITIES[entity.toLowerCase()] || entity;
      },
    );
  }

  // Resolve reference-style links, drop HTML leftovers and icons, then hand the
  // block parser raw markdown lines. Images and raw tags never survive this
  // pass: a submitted README cannot inject markup or pull remote trackers.
  function readmeLines(markdown) {
    var text = String(markdown || "").replace(/\r\n?/g, "\n");

    // split() with one capture group alternates prose, fence, prose, fence…
    text = text
      .split(README_FENCE_BLOCK)
      .map(function (part, index) {
        return index % 2 === 1 ? part : readmeProse(part);
      })
      .join("");

    text = text.replace(/\t/g, "  ");

    var definitions = {};
    var kept = [];

    text.split("\n").forEach(function (line) {
      var definition = /^\s{0,3}\[([^\]]+)\]:\s*(\S+)(?:\s+["'(].*)?$/.exec(
        line,
      );
      if (definition) {
        definitions[definition[1].trim().toLowerCase()] = definition[2];
        return;
      }
      kept.push(line);
    });

    var resolved = kept.map(function (line) {
      return line
        .replace(/!\[[^\]]*\]\[[^\]]*\]/g, "")
        .replace(/\[([^\]]+)\]\[([^\]]*)\]/g, function (match, label, id) {
          var url = definitions[(id || label).trim().toLowerCase()];
          return url ? "[" + label + "](" + url + ")" : label;
        });
    });

    var inCode = false;

    // A link label that wrapped onto the next line ("[Run your app" then
    // "](url)") is a single link to GitHub; joining keeps the item whole.
    var joined = [];
    resolved.forEach(function (line) {
      var previous = joined[joined.length - 1];
      var open = previous ? (previous.match(/\[/g) || []).length : 0;
      var closed = previous ? (previous.match(/\]/g) || []).length : 0;

      if (previous && /^\s{0,3}\]\(/.test(line) && open > closed) {
        joined[joined.length - 1] =
          previous.replace(/[ \t]+$/, "") + line.trim();
        return;
      }

      joined.push(line);
    });

    return joined.map(function (line) {
      if (/^\s{0,3}(```|~~~)/.test(line)) {
        inCode = !inCode;
        return line;
      }
      // Fenced content is printed verbatim.
      if (inCode) return line;

      var out = stripReadmeNoise(line);
      out = out.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
      out = out.replace(/!\[[^\]]*\]/g, "");

      // Collapse runs of spaces in the prose only: list indentation and table
      // padding depend on the leading whitespace a level deeper up.
      var indent = /^[ \t]*/.exec(out)[0];
      var body = out
        .slice(indent.length)
        .replace(/[ \t]{2,}/g, " ")
        .replace(/[ \t]+(?=[.,;:!?])/g, "");
      return indent + body;
    });
  }

  // Only absolute http(s)/mailto targets and in-page links are rendered as
  // anchors; anything else (javascript:, data:) collapses to plain text.
  function safeUrl(url) {
    var value = String(url || "").trim();
    if (/^(?:https?:|mailto:)/i.test(value)) return value;
    if (/^(\/|#)/.test(value)) return value;
    return "";
  }

  // href/label arrive already escaped by inlineMarkdown, so they are inserted
  // verbatim: escaping twice would turn & into &amp;amp; inside the query.
  function anchor(href, label) {
    return (
      '<a href="' +
      href +
      '" target="_blank" rel="noopener noreferrer">' +
      label +
      "</a>"
    );
  }

  // Emphasis rules run on prose and on link labels: [**Label**](url) must
  // still print a bold label inside the anchor.
  function inlineEmphasis(text) {
    var out = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    out = out.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>");
    out = out.replace(/(^|[^_\w])_([^_\s][^_]*?)_/g, "$1<em>$2</em>");
    return out;
  }

  // A label whose leading image was dropped ("[<br> Chrome](url)") should not
  // open with an empty line. The break is still a slot at this point.
  function trimLabel(label) {
    return String(label).replace(
      new RegExp(
        "^[\\s" + README_LINE_BREAK + "]+|[\\s" + README_LINE_BREAK + "]+$",
        "g",
      ),
      "",
    );
  }

  function inlineMarkdown(text) {
    var codeSpans = [];
    var anchors = [];
    var out = escapeHtml(text);

    // Inline code is lifted out first so emphasis inside a span stays literal.
    out = out.replace(/`([^`]+)`/g, function (match, code) {
      codeSpans.push(code);
      return README_CODE_SLOT + (codeSpans.length - 1) + README_CODE_SLOT;
    });

    // Anchors wait in a slot too: their href holds __ and _ that the emphasis
    // rules below would otherwise rewrite into <em> inside the tag itself.
    function keepAnchor(href, label) {
      anchors.push(anchor(href, inlineEmphasis(trimLabel(label))));
      return README_ANCHOR_SLOT + (anchors.length - 1) + README_ANCHOR_SLOT;
    }

    // [label](url "title") -> anchor; unusable targets keep just the label.
    out = out.replace(
      /\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\s*\)/g,
      function (match, label, url) {
        var href = safeUrl(url);
        if (!href) return label;
        return keepAnchor(href, label || url);
      },
    );

    // Bare URLs, but never inside an existing tag or an anchor label.
    out = out.replace(
      /(^|[\s(])((?:https?:\/\/|www\.)[^\s<)"]+)(?!<\/a>)/g,
      function (match, prefix, url) {
        var href = /^www\./i.test(url) ? "https://" + url : url;
        return prefix + keepAnchor(href, url);
      },
    );

    out = inlineEmphasis(out);

    out = out.replace(
      new RegExp(README_ANCHOR_SLOT + "(\\d+)" + README_ANCHOR_SLOT, "g"),
      function (match, index) {
        return anchors[Number(index)];
      },
    );

    // Slot-ed line breaks and the newlines between wrapped paragraph lines
    // both render as a break, exactly like a soft break inside one run.
    out = out.replace(new RegExp(README_LINE_BREAK + "|\\n", "g"), "<br>");

    return out.replace(
      new RegExp(README_CODE_SLOT + "(\\d+)" + README_CODE_SLOT, "g"),
      function (match, index) {
        return "<code>" + codeSpans[Number(index)] + "</code>";
      },
    );
  }

  function indentOf(line) {
    return /^[ \t]*/.exec(line)[0].length;
  }

  function isListLine(line) {
    return /^\s*(?:[-*+]|\d+[.)])\s+\S/.test(line);
  }

  function isTableStart(lines, index) {
    if (index + 1 >= lines.length) return false;
    if (lines[index].indexOf("|") === -1) return false;

    var header = splitTableRow(lines[index]);
    var divider = splitTableRow(lines[index + 1]);

    // A delimiter row needs at least two columns and as many cells as the head.
    if (divider.length < 2 || divider.length !== header.length) return false;

    return divider.every(function (cell) {
      return /^:?-+:?$/.test(cell.replace(/\s/g, ""));
    });
  }

  function splitTableRow(line) {
    var pipe = "\u0001";
    var source = line
      .trim()
      .replace(/\\\|/g, pipe)
      .replace(/^\|/, "")
      .replace(/\|$/, "");

    return source.split("|").map(function (cell) {
      return cell.split(pipe).join("|").trim();
    });
  }

  function collectTable(lines, start) {
    var header = splitTableRow(lines[start]);
    var alignments = splitTableRow(lines[start + 1]).map(function (cell) {
      var value = cell.replace(/\s/g, "");
      var left = value.charAt(0) === ":";
      var right = value.charAt(value.length - 1) === ":";
      if (left && right) return "center";
      if (right) return "right";
      if (left) return "left";
      return "";
    });

    function row(cells, cellTag) {
      return (
        "<tr>" +
        header
          .map(function (_cell, index) {
            var align = alignments[index];
            return (
              "<" +
              cellTag +
              (align ? ' style="text-align:' + align + '"' : "") +
              ">" +
              inlineMarkdown(cells[index] || "") +
              "</" +
              cellTag +
              ">"
            );
          })
          .join("") +
        "</tr>"
      );
    }

    var body = [];
    var i = start + 2;

    while (
      i < lines.length &&
      lines[i].trim() &&
      lines[i].indexOf("|") !== -1
    ) {
      body.push(splitTableRow(lines[i]));
      i++;
    }

    var html =
      '<div class="readme-table"><table><thead>' +
      row(header, "th") +
      "</thead>";

    if (body.length > 0) {
      html +=
        "<tbody>" +
        body
          .map(function (cells) {
            return row(cells, "td");
          })
          .join("") +
        "</tbody>";
    }

    return { html: html + "</table></div>", next: i };
  }

  function collectList(lines, start) {
    var baseIndent = indentOf(lines[start]);
    var block = [];
    var i = start;

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) {
        // A blank line only continues the list when a deeper item follows.
        var next = i + 1;
        while (next < lines.length && !lines[next].trim()) next++;
        if (
          next < lines.length &&
          indentOf(lines[next]) > baseIndent &&
          isListLine(lines[next])
        ) {
          block.push("");
          i++;
          continue;
        }
        break;
      }

      var indent = indentOf(line);
      if (indent < baseIndent) break;
      if (indent === baseIndent && !isListLine(line)) break;

      block.push(line);
      i++;
    }

    return { lines: block, next: i };
  }

  function renderListNodes(nodes) {
    if (!nodes.length) return "";

    var tag = nodes[0].ordered ? "ol" : "ul";
    // The task class hides the bullets, so a list only gets it when every item
    // is a checkbox — a mixed list keeps its markers.
    var isTask = nodes.every(function (node) {
      return node.task !== null;
    });

    var items = nodes.map(function (node) {
      var inner = inlineMarkdown(node.text);

      if (node.task !== null) {
        inner =
          '<label class="readme-task"><input type="checkbox" disabled' +
          (node.task ? " checked" : "") +
          "><span>" +
          inner +
          "</span></label>";
      }

      return "<li>" + inner + renderListChildren(node.children) + "</li>";
    });

    return (
      "<" +
      tag +
      (isTask ? ' class="readme-tasks"' : "") +
      ">" +
      items.join("") +
      "</" +
      tag +
      ">"
    );
  }

  function renderListChildren(nodes) {
    var html = "";
    var group = [];

    nodes.forEach(function (node) {
      if (group.length > 0 && node.ordered !== group[0].ordered) {
        html += renderListNodes(group);
        group = [];
      }
      group.push(node);
    });

    if (group.length > 0) html += renderListNodes(group);

    return html;
  }

  function buildListHtml(block) {
    var root = { children: [] };
    var stack = [{ indent: -1, node: root }];

    block.forEach(function (line) {
      var item = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);

      if (!item) {
        // Wrapped text belongs to the item above it, or to the current item
        // when that item has no children yet.
        var owner = stack[stack.length - 1].node;
        var last = owner.children[owner.children.length - 1];

        if (!line.trim()) return;
        if (last) last.text += " " + line.trim();
        else if (typeof owner.text === "string")
          owner.text += " " + line.trim();
        return;
      }

      var indent = item[1].length;
      // A shallower or equal indent closes the deeper items: siblings share a
      // parent, only a deeper indent becomes a child of the item above.
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      var parent = stack[stack.length - 1].node;
      var task = /^\[([ xX])\]\s*(.*)$/.exec(item[3]);
      var node = {
        ordered: /\d/.test(item[2]),
        text: task ? task[2] : item[3],
        task: task ? task[1].toLowerCase() === "x" : null,
        children: [],
      };

      parent.children.push(node);
      stack.push({ indent: indent, node: node });
    });

    // Group by marker type so a "1." run after "-" items starts its own <ol>.
    return renderListChildren(root.children);
  }

  var README_ALERTS = {
    note: "Note",
    tip: "Tip",
    important: "Important",
    warning: "Warning",
    caution: "Caution",
  };

  function renderQuote(quoted) {
    var lines = quoted.slice();
    var marker = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i.exec(
      (lines[0] || "").trim(),
    );
    var alert = marker ? marker[1].toLowerCase() : null;
    var body = renderMarkdown((alert ? lines.slice(1) : lines).join("\n"));

    if (!alert) {
      return '<blockquote class="notes-quote">' + body + "</blockquote>";
    }

    return (
      '<div class="readme-alert is-' +
      alert +
      '"><p class="readme-alert-title">' +
      README_ALERTS[alert] +
      "</p>" +
      body +
      "</div>"
    );
  }

  function renderCodeBlock(code, language) {
    var lang = String(language || "")
      .replace(/[^\w+#.-]/g, "")
      .toLowerCase();
    var pre =
      '<pre class="notes-code"><code>' + escapeHtml(code) + "</code></pre>";

    if (!lang) return pre;

    return (
      '<div class="readme-code"><span class="readme-code-lang">' +
      escapeHtml(lang) +
      "</span>" +
      pre +
      "</div>"
    );
  }

  function isBlockStart(lines, index) {
    var line = lines[index];

    if (/^\s{0,3}(`{3,}|~{3,})/.test(line)) return true;
    if (/^\s{0,3}#{1,6}\s+/.test(line)) return true;
    if (/^\s{0,3}>/.test(line)) return true;
    if (isListLine(line)) return true;
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) return true;
    if (isTableStart(lines, index)) return true;

    return false;
  }

  // GitHub-flavoured block parser: headings, fenced code (with a language
  // label), GFM tables, nested and task lists, blockquotes plus alerts, rules
  // and paragraphs with hard line breaks. Images and raw HTML never reach it.
  function renderMarkdown(markdown) {
    var lines = readmeLines(markdown);
    var html = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) {
        i++;
        continue;
      }

      var fence = /^\s{0,3}(`{3,}|~{3,})\s*([^\s`]*)/.exec(line);
      if (fence) {
        var closing = new RegExp(
          "^\\s{0,3}" + fence[1].charAt(0) + "{3,}\\s*$",
        );
        var code = [];
        i++;
        while (i < lines.length && !closing.test(lines[i])) {
          code.push(lines[i]);
          i++;
        }
        i++;
        html.push(renderCodeBlock(code.join("\n"), fence[2]));
        continue;
      }

      var heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
      if (heading) {
        var level = heading[1].length;
        html.push(
          "<h" + level + ">" + inlineMarkdown(heading[2]) + "</h" + level + ">",
        );
        i++;
        continue;
      }

      if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
        html.push("<hr>");
        i++;
        continue;
      }

      if (isTableStart(lines, i)) {
        var table = collectTable(lines, i);
        html.push(table.html);
        i = table.next;
        continue;
      }

      if (/^\s{0,3}>/.test(line)) {
        var quoted = [];
        while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
          quoted.push(lines[i].replace(/^\s{0,3}>\s?/, "").replace(/\s+$/, ""));
          i++;
        }
        html.push(renderQuote(quoted));
        continue;
      }

      if (isListLine(line)) {
        var list = collectList(lines, i);
        html.push(buildListHtml(list.lines));
        i = list.next;
        continue;
      }

      var paragraph = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) {
        paragraph.push(lines[i].trim());
        i++;
      }

      // Guard against an unhandled construct looping on a single line.
      if (!paragraph.length) {
        paragraph.push(line.trim());
        i++;
      }

      // The paragraph is parsed as one run so a link label or an emphasis span
      // that wraps onto the next line still forms a single element.
      html.push("<p>" + inlineMarkdown(paragraph.join("\n")) + "</p>");
    }

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
