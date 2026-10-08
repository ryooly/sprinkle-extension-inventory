/* ==========================================================================
 * sprinkle-data.js — shared data + SVG icon helpers for the vanilla rebuild.
 * Plain script (no modules) so the pages work straight from file://.
 * Exposes a global `SPRINKLE` namespace.
 * ========================================================================== */

window.SPRINKLE = (function () {
  "use strict";

  /* ─── Card data (1:1 port of CARDS in src/routes/index.tsx) ───────────── */

  var CARDS = {
    Recommendation: [
      {
        id: 1,
        user: "sprinkle-labs",
        repo: "sprinkle-notes",
        genre: "Notes",
        views: "3.5k",
        status: "active",
        claps: 218,
      },
      {
        id: 2,
        user: "flowco",
        repo: "flow-board-lite",
        genre: "Productivity",
        views: "12k",
        status: "active",
        claps: 941,
      },
      {
        id: 3,
        user: "datalens-io",
        repo: "datalens-core",
        genre: "Developer",
        views: "7.1k",
        status: "active",
        claps: 503,
      },
      {
        id: 4,
        user: "pixelcraft",
        repo: "pixelcraft-editor",
        genre: "Design",
        views: "4.8k",
        status: "archived",
        claps: 132,
      },
      {
        id: 5,
        user: "podwave-hq",
        repo: "podwave-2.1",
        genre: "AI",
        views: "9.2k",
        status: "active",
        claps: 677,
      },
      {
        id: 6,
        user: "codegarden",
        repo: "codegarden-sandbox",
        genre: "Developer",
        views: "2.3k",
        status: "archived",
        claps: 88,
      },
    ],
    Productivity: [
      {
        id: 11,
        user: "focusframe",
        repo: "focusframe-pro",
        genre: "Productivity",
        views: "18k",
        status: "active",
        claps: 1420,
      },
      {
        id: 12,
        user: "inboxzero",
        repo: "inboxzero-engine",
        genre: "Productivity",
        views: "6.4k",
        status: "active",
        claps: 390,
      },
      {
        id: 13,
        user: "dailybrief-ai",
        repo: "dailybrief-digest",
        genre: "AI",
        views: "21k",
        status: "active",
        claps: 1830,
      },
      {
        id: 14,
        user: "habitloop",
        repo: "habitloop-tracker",
        genre: "Productivity",
        views: "3.9k",
        status: "archived",
        claps: 104,
      },
      {
        id: 15,
        user: "meetingmind",
        repo: "meetingmind-llm",
        genre: "AI",
        views: "11k",
        status: "active",
        claps: 872,
      },
      {
        id: 16,
        user: "timeblock-io",
        repo: "timeblock-scheduler",
        genre: "Productivity",
        views: "5.7k",
        status: "active",
        claps: 441,
      },
    ],
    AI: [
      {
        id: 21,
        user: "palette-ai",
        repo: "palette-colorgen-2.0",
        genre: "AI",
        views: "42k",
        status: "active",
        claps: 3100,
      },
      {
        id: 22,
        user: "copyforge",
        repo: "copyforge-v3-instruct",
        genre: "Writing",
        views: "716k",
        status: "active",
        claps: 2270,
      },
      {
        id: 23,
        user: "voiceclone-ai",
        repo: "voiceclone-7B",
        genre: "AI",
        views: "31k",
        status: "active",
        claps: 1670,
      },
      {
        id: 24,
        user: "promptvault",
        repo: "promptvault-community",
        genre: "AI",
        views: "43k",
        status: "active",
        claps: 1600,
      },
      {
        id: 25,
        user: "scriptgenius",
        repo: "scriptgenius-34B-GGUF",
        genre: "AI",
        views: "9.5k",
        status: "archived",
        claps: 1040,
      },
      {
        id: 26,
        user: "autodoc-io",
        repo: "autodoc-codegen",
        genre: "Developer",
        views: "3.1M",
        status: "active",
        claps: 2070,
      },
    ],
    Notes: [
      {
        id: 31,
        user: "sprinkle-labs",
        repo: "sprinkle-notes",
        genre: "Notes",
        views: "3.5k",
        status: "active",
        claps: 218,
      },
      {
        id: 32,
        user: "mdstudio",
        repo: "markdown-studio",
        genre: "Writing",
        views: "8.2k",
        status: "active",
        claps: 560,
      },
      {
        id: 33,
        user: "quillpad",
        repo: "quillpad-oss",
        genre: "Writing",
        views: "5.1k",
        status: "active",
        claps: 310,
      },
      {
        id: 34,
        user: "jotter-hq",
        repo: "jotter-minimal",
        genre: "Notes",
        views: "1.9k",
        status: "archived",
        claps: 74,
      },
      {
        id: 35,
        user: "notesync",
        repo: "notesync-realtime",
        genre: "Notes",
        views: "4.4k",
        status: "active",
        claps: 289,
      },
      {
        id: 36,
        user: "inkwell-io",
        repo: "inkwell-editor",
        genre: "Writing",
        views: "2.7k",
        status: "archived",
        claps: 133,
      },
    ],
    Design: [
      {
        id: 41,
        user: "pixelcraft",
        repo: "pixelcraft-editor",
        genre: "Design",
        views: "4.8k",
        status: "active",
        claps: 380,
      },
      {
        id: 42,
        user: "palette-ai",
        repo: "palette-colorgen-2.0",
        genre: "AI",
        views: "42k",
        status: "active",
        claps: 3100,
      },
      {
        id: 43,
        user: "framekit-io",
        repo: "framekit-components",
        genre: "Design",
        views: "6.3k",
        status: "active",
        claps: 492,
      },
      {
        id: 44,
        user: "iconforge",
        repo: "iconforge-svg-pack",
        genre: "Design",
        views: "11k",
        status: "archived",
        claps: 720,
      },
      {
        id: 45,
        user: "colordrop",
        repo: "colordrop-palettes",
        genre: "Design",
        views: "3.2k",
        status: "active",
        claps: 195,
      },
      {
        id: 46,
        user: "vectora-design",
        repo: "vectora-studio",
        genre: "Design",
        views: "7.9k",
        status: "active",
        claps: 614,
      },
    ],
    Developer: [
      {
        id: 51,
        user: "codegarden",
        repo: "codegarden-sandbox",
        genre: "Developer",
        views: "2.3k",
        status: "active",
        claps: 88,
      },
      {
        id: 52,
        user: "volt-analytics",
        repo: "volt-dashboard-v2",
        genre: "Developer",
        views: "14k",
        status: "active",
        claps: 1050,
      },
      {
        id: 53,
        user: "logstream-io",
        repo: "logstream-tail",
        genre: "Developer",
        views: "5.5k",
        status: "archived",
        claps: 310,
      },
      {
        id: 54,
        user: "envsafe",
        repo: "envsafe-manager",
        genre: "Developer",
        views: "8.8k",
        status: "active",
        claps: 660,
      },
      {
        id: 55,
        user: "apiforge",
        repo: "apiforge-designer",
        genre: "Developer",
        views: "19k",
        status: "active",
        claps: 1430,
      },
      {
        id: 56,
        user: "deploykit-io",
        repo: "deploykit-ci",
        genre: "Developer",
        views: "3.3k",
        status: "archived",
        claps: 145,
      },
    ],
    Writing: [
      {
        id: 61,
        user: "quillpad",
        repo: "quillpad-oss",
        genre: "Writing",
        views: "5.1k",
        status: "active",
        claps: 310,
      },
      {
        id: 62,
        user: "copyforge",
        repo: "copyforge-v3-instruct",
        genre: "Writing",
        views: "716k",
        status: "active",
        claps: 2270,
      },
      {
        id: 63,
        user: "draftroom",
        repo: "draftroom-collab",
        genre: "Writing",
        views: "4.6k",
        status: "active",
        claps: 360,
      },
      {
        id: 64,
        user: "storyline-io",
        repo: "storyline-arc",
        genre: "Writing",
        views: "2.1k",
        status: "archived",
        claps: 97,
      },
      {
        id: 65,
        user: "essayist-ai",
        repo: "essayist-writer",
        genre: "AI",
        views: "6.7k",
        status: "active",
        claps: 520,
      },
      {
        id: 66,
        user: "proseflow",
        repo: "proseflow-editor",
        genre: "Writing",
        views: "3.0k",
        status: "active",
        claps: 241,
      },
    ],
  };

  /* Fixed "Top repositories" sidebar list — intentionally distinct from the
     category-driven CARDS grid, so it never changes when switching genres. */
  var TOP_REPOS = CARDS.Recommendation.slice(0);

  var GENRES = [
    "Recommendation",
    "Productivity",
    "AI",
    "Notes",
    "Design",
    "Developer",
    "Writing",
  ];

  /* ─── Hashtags ─────────────────────────────────────────────────────────
     The extension model card shows clickable hashtags (e.g. #audio). Clicking
     one jumps to the home page and runs a search for that category, so we need
     a tag vocabulary to match cards against. Every card already carries its
     genre as an implicit tag; EXTRA_TAGS layers the finer-grained categories on
     top, keyed by "user/repo". */

  var EXTRA_TAGS = {
    "podwave-hq/podwave-2.1": ["audio", "streaming", "realtime"],
    "voiceclone-ai/voiceclone-7B": ["audio", "speech-recognition", "realtime"],
    "meetingmind/meetingmind-llm": ["speech-recognition", "realtime"],
    "notesync/notesync-realtime": ["streaming", "realtime"],
    "logstream-io/logstream-tail": ["streaming", "realtime"],
    "dailybrief-ai/dailybrief-digest": ["streaming"],
  };

  /* Unique list of every card across all genres (deduped by user/repo so a
     repo that appears in two categories only shows once in search results). */
  function flattenCards() {
    var seen = {};
    var out = [];
    Object.keys(CARDS).forEach(function (genre) {
      CARDS[genre].forEach(function (card) {
        var key = card.user + "/" + card.repo;
        if (seen[key]) return;
        seen[key] = true;
        out.push(card);
      });
    });
    return out;
  }

  function cardTags(card) {
    var tags = card.genre ? [card.genre.toLowerCase()] : [];
    var extra = EXTRA_TAGS[card.user + "/" + card.repo];
    if (extra) tags = tags.concat(extra);
    return tags;
  }

  /* Case-insensitive substring match across user / repo / genre / tags. */
  function cardMatchesQuery(card, query) {
    if (!query) return true;
    var haystack = [card.user, card.repo, card.genre]
      .concat(cardTags(card))
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(query.toLowerCase()) !== -1;
  }

  /* ─── Repository file tree — powers the Files browser (GitHub-style) ────
     A nested directory tree. Each entry is either a dir (children) or a file
     (size / updated / optional `text` content or `binary` flag). Navigation
     resolves a path array against this structure. */

  var REPO_TREE = {
    name: ".",
    type: "dir",
    children: [
      {
        name: "audio8_asr_infinite",
        type: "dir",
        updated: "Sep 28, 2026",
        children: [
          {
            name: "__init__.py",
            type: "file",
            size: "126 B",
            updated: "Aug 14, 2026",
            lang: "python",
            text:
              "from .modeling_audio8 import Audio8ForConditionalGeneration\n" +
              "from .processor import Audio8Processor\n" +
              '\n__all__ = ["Audio8ForConditionalGeneration", "Audio8Processor"]\n',
          },
          {
            name: "modeling_audio8.py",
            type: "file",
            size: "12.4 KB",
            updated: "Sep 28, 2026",
            lang: "python",
            text:
              "import torch\nimport torch.nn as nn\n" +
              "\n\nclass Audio8Encoder(nn.Module):\n" +
              "    def __init__(self, cfg):\n" +
              "        super().__init__()\n" +
              "        self.cfg = cfg\n" +
              "        self.blocks = nn.ModuleList(\n" +
              "            [ResBlock(cfg.dim) for _ in range(cfg.depth)]\n" +
              "        )\n" +
              "\n    def forward(self, x):\n" +
              "        for block in self.blocks:\n" +
              "            x = block(x)\n" +
              "        return x\n",
          },
          {
            name: "processor.py",
            type: "file",
            size: "6.1 KB",
            updated: "Sep 21, 2026",
            lang: "python",
            text:
              "from transformers.feature_extraction_utils import FeatureExtractionMixin\n" +
              "\n\nclass Audio8Processor(FeatureExtractionMixin):\n" +
              '    """Waveform -> log-Mel features for Audio8-ASR."""\n' +
              "\n    def __call__(self, audio, sampling_rate=16000):\n" +
              "        return self.extract_features(audio, sampling_rate)\n",
          },
        ],
      },
      {
        name: "assets",
        type: "dir",
        updated: "Aug 14, 2026",
        children: [
          {
            name: "logo.svg",
            type: "file",
            size: "1.8 KB",
            updated: "Aug 14, 2026",
            binary: true,
            note: "Vector image — preview not shown for binary assets.",
          },
          {
            name: "latency-chart.png",
            type: "file",
            size: "84 KB",
            updated: "Aug 14, 2026",
            binary: true,
            note: "Image file (84 KB) — binary content not displayed.",
          },
        ],
      },
      {
        name: "README.md",
        type: "file",
        size: "4.8 KB",
        updated: "Sep 28, 2026",
        lang: "markdown",
        text:
          "# Audio8-ASR-Infinite\n\n" +
          "Streaming, unlimited-length automatic speech recognition.\n\n" +
          "## Highlights\n\n" +
          "- Real-time factor < 0.2 on CPU\n" +
          "- Chunked inference for infinite audio\n" +
          "- ONNX + INT8 quantized builds\n\n" +
          "## Quickstart\n\n" +
          "```python\nfrom audio8_asr_infinite import Audio8Processor\n" +
          "```\n",
      },
      {
        name: "config.json",
        type: "file",
        size: "2.1 KB",
        updated: "Sep 21, 2026",
        lang: "json",
        text:
          '{\n  "model_type": "audio8-asr",\n  "sampling_rate": 16000,\n' +
          '  "chunk_size": 480,\n  "dim": 512,\n  "depth": 12,\n' +
          '  "vocab_size": 5000\n}\n',
      },
      {
        name: "tokenizer.json",
        type: "file",
        size: "3.4 MB",
        updated: "Aug 14, 2026",
        binary: true,
        note: "Large file (3.4 MB) — GitHub won't display this by default.",
      },
      {
        name: "model-00001-of-00003.safetensors",
        type: "file",
        size: "4.9 GB",
        updated: "Sep 28, 2026",
        binary: true,
        note: "Binary model weights (4.9 GB) — use the download button to fetch.",
      },
      {
        name: "model-00002-of-00003.safetensors",
        type: "file",
        size: "4.9 GB",
        updated: "Sep 28, 2026",
        binary: true,
        note: "Binary model weights (4.9 GB) — use the download button to fetch.",
      },
      {
        name: "LICENSE",
        type: "file",
        size: "11.3 KB",
        updated: "Jan 19, 2026",
        lang: "text",
        text:
          "                                 Apache License\n" +
          "                           Version 2.0, January 2004\n" +
          "                        http://www.apache.org/licenses/\n\n" +
          "   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION\n\n" +
          '   1. Definitions. "License" shall mean the terms and conditions\n' +
          "      for use, reproduction, and distribution as defined by Sections\n" +
          "      1 through 9 of this document.\n",
      },
    ],
  };

  var AVATAR_COLORS = [
    "#4f46e5",
    "#0284c7",
    "#059669",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#15803d",
  ];

  function avatarColor(user) {
    return (
      AVATAR_COLORS[user.charCodeAt(0) % AVATAR_COLORS.length] || "#4f46e5"
    );
  }

  function formatClaps(n) {
    return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
  }

  /* ─── SVG icons — exact paths from the React originals ─────────────────── */

  function svg(inner, viewBox, cls, fill, stroke) {
    return (
      '<svg class="' +
      cls +
      '" viewBox="' +
      (viewBox || "0 0 16 16") +
      '"' +
      ' fill="' +
      (fill || "currentColor") +
      '"' +
      (stroke
        ? ' stroke="' +
          stroke +
          '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'
        : "") +
      ' aria-hidden="true">' +
      inner +
      "</svg>"
    );
  }

  var icons = {
    menu: function (cls) {
      return svg(
        '<path d="M2.5 3.5h11M2.5 8h7M2.5 12.5h11"/>',
        "0 0 16 16",
        cls,
        "none",
        "currentColor",
      );
    },
    search: function (cls) {
      return svg(
        '<path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.472 3.472a.75.75 0 1 1-1.06 1.06l-3.472-3.472ZM11.5 7a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0Z"/>',
        "0 0 16 16",
        cls,
      );
    },
    sprinkleLogo: function (cls) {
      return (
        '<svg class="' +
        cls +
        '" viewBox="0 0 96 96" fill="none" aria-hidden="true">' +
        '<path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M42 30h12a12 12 0 0 1 12 12v12a12 12 0 0 1-12 12H42a12 12 0 0 1-12-12V42a12 12 0 0 1 12-12Zm3 10a5 5 0 0 0-5 5v6a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5v-6a5 5 0 0 0-5-5h-6Z"/>' +
        '<circle cx="81" cy="48" r="8" fill="#FFA400"/>' +
        '<circle cx="71" cy="71" r="8" fill="#00B2F0"/>' +
        '<circle cx="25" cy="25" r="8" fill="#8A3FFC"/>' +
        '<path d="M27 69 21 75" stroke="#F43F6B" stroke-width="16" stroke-linecap="round"/>' +
        '<path d="M21 48H13" stroke="#22B558" stroke-width="16" stroke-linecap="round"/>' +
        '<path d="M69 27 75 21" stroke="#0A7CFF" stroke-width="16" stroke-linecap="round"/>' +
        "</svg>"
      );
    },
    sun: function (cls) {
      return svg(
        '<path d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.773-1.591 1.591M5.25 12H3m4.707-7.05-1.591 1.591M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"/>',
        "0 0 24 24",
        cls,
        "none",
        "currentColor",
      );
    },
    moon: function (cls) {
      return svg(
        '<path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"/>',
        "0 0 24 24",
        cls,
        "none",
        "currentColor",
      );
    },
    profile: function (cls) {
      return svg(
        '<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm0 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 7c2.145 0 4.057.74 5.5 1.982-.79 1.786-2.653 3.268-5.5 3.268-2.847 0-4.71-1.482-5.5-3.268C3.943 11.24 5.855 10.5 8 10.5Z"/>',
        "0 0 16 16",
        cls,
      );
    },
    plus: function (cls) {
      return svg(
        '<path d="M7.75 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 7.75 2Z"/>',
        "0 0 16 16",
        cls,
      );
    },
    resizeGrip: function (cls) {
      return svg(
        '<circle cx="2" cy="5" r="1"/><circle cx="6" cy="5" r="1"/><circle cx="2" cy="11" r="1"/><circle cx="6" cy="11" r="1"/>',
        "0 0 8 16",
        cls,
      );
    },
    filter: function (cls) {
      return svg(
        '<path d="M2 3h12M4 8h8M6.5 13h3"/>',
        "0 0 16 16",
        cls,
        "none",
        "currentColor",
      );
    },
    thumbsUp: function (cls) {
      return svg(
        '<path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/><path d="M7 10v12"/>',
        "0 0 24 24",
        cls,
        "none",
        "currentColor",
      );
    },
    /* Dropdown menu items — lucide stroke icons (24×24, sw 2) */
    lucide: function (name, cls) {
      var nodes = {
        package:
          '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/>',
        bookmark:
          '<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/>',
        history:
          '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
        settings:
          '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
        "arrow-left": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
        download:
          '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
        "git-pull-request":
          '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="19"/>',
        flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
        "book-open":
          '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
        "chevron-down": '<path d="m6 9 6 6 6-6"/>',
        x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        "circle-check":
          '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
        "triangle-alert":
          '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
        ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
        "external-link":
          '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
        copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
        scale:
          '<path d="M12 3v18"/><path d="m19 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1"/><path d="m5 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M7 21h10"/>',
      }[name];
      return (
        '<svg class="' +
        cls +
        '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        nodes +
        "</svg>"
      );
    },
    /* Card meta icons */
    genre: function (genre, cls) {
      var paths = {
        Productivity:
          "M13 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1ZM6 10.5 3.5 8 4.56 6.94 6 8.38l3.94-3.94L11 5.5 6 10.5Z",
        AI: "M8 1a1 1 0 0 1 1 1v1h2.5a.5.5 0 0 1 0 1H9v1a1 1 0 0 1-2 0V4H4.5a.5.5 0 0 1 0-1H7V2a1 1 0 0 1 1-1Zm5.5 5.5a.5.5 0 0 1 0 1H13v.5a1 1 0 0 1-1 1h-.5v1.5a.5.5 0 0 1-1 0V9H10a1 1 0 0 1-1-1v-.5H2.5a.5.5 0 0 1 0-1H9V6a1 1 0 0 1 1-1h.5V3.5a.5.5 0 0 1 1 0V5h.5a1 1 0 0 1 1 1v.5h.5Z",
        Notes:
          "M11.5 1h-7A1.5 1.5 0 0 0 3 2.5v11A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 11.5 1ZM5 4h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1Zm0 3h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1Zm0 3h4a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1Z",
        Design:
          "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 1 1 0 11A5.5 5.5 0 0 1 8 2.5Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-3 5a3 3 0 0 1 6 0H5Z",
        Developer:
          "M5.78 5.22a.75.75 0 0 0-1.06 1.06L6.94 8.5 4.72 10.72a.75.75 0 1 0 1.06 1.06l2.75-2.75a.75.75 0 0 0 0-1.06L5.78 5.22ZM9.25 10.5a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2Z",
        Writing:
          "M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086Z",
      };
      var d = paths[genre] || paths.Developer;
      return svg('<path d="' + d + '"/>', "0 0 16 16", cls);
    },
    eye: function (cls) {
      return svg(
        '<path d="M8 2C4.5 2 1.5 5 .5 8c1 3 4 6 7.5 6s6.5-3 7.5-6C14.5 5 11.5 2 8 2Zm0 9.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm0-5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>',
        "0 0 16 16",
        cls,
      );
    },
    status: function (status, cls) {
      if (status === "active") {
        return svg('<circle cx="8" cy="8" r="5"/>', "0 0 16 16", cls);
      }
      return svg(
        '<path d="M4 7V5a4 4 0 0 1 8 0v2h.5A1.5 1.5 0 0 1 14 8.5v5A1.5 1.5 0 0 1 12.5 15h-9A1.5 1.5 0 0 1 2 13.5v-5A1.5 1.5 0 0 1 3.5 7H4Zm2 0h4V5a2 2 0 1 0-4 0v2Zm2 3a1 1 0 0 0-1 1v.5a1 1 0 0 0 2 0V11a1 1 0 0 0-1-1Z"/>',
        "0 0 16 16",
        cls,
      );
    },
  };

  /* ─── Card renderer ───────────────────────────────────────────────────── */

  function escapeHtml(s) {
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

  function cardHtml(card, hideAvatar) {
    var color = avatarColor(card.user);
    var initials = card.user.slice(0, 2).toUpperCase();
    var href =
      "extensions.html?slug=" +
      encodeURIComponent(card.repo) +
      "&user=" +
      encodeURIComponent(card.user);

    var meta =
      '<span class="meta-item">' +
      icons.genre(card.genre, "") +
      escapeHtml(card.genre) +
      "</span>" +
      '<span class="meta-item">' +
      icons.eye("") +
      escapeHtml(card.views) +
      "</span>" +
      '<span class="meta-item status-' +
      card.status +
      '">' +
      icons.status(card.status, "") +
      (card.status === "active" ? "Active" : "Archived") +
      "</span>" +
      '<span class="meta-item meta-like" data-action="like" role="button" tabindex="0" ' +
      'aria-label="Like" aria-pressed="false">' +
      icons.thumbsUp("") +
      '<span class="clap-count">' +
      formatClaps(card.claps) +
      "</span>" +
      "</span>";

    var metaWrap = hideAvatar
      ? '<span class="card-meta grid2">' + meta + "</span>"
      : '<span class="card-meta row">' + meta + "</span>";

    var avatar = hideAvatar
      ? ""
      : '<span class="card-avatar" style="background:' +
        color +
        '" aria-hidden="true">' +
        initials +
        "</span>";

    var saveBtn =
      '<span class="card-save" data-action="save" role="button" tabindex="0" ' +
      'aria-label="Save" aria-pressed="false">' +
      icons.lucide("bookmark", "") +
      "</span>";

    return (
      '<a class="app-card ' +
      (hideAvatar ? "fading" : "solid") +
      '" href="' +
      href +
      '" data-card-id="' +
      escapeHtml(card.user + "/" + card.repo) +
      '" data-claps="' +
      card.claps +
      '">' +
      avatar +
      '<span class="card-body">' +
      '<span class="card-title">' +
      '<span class="user">' +
      escapeHtml(card.user) +
      "</span>" +
      '<span class="slash">/</span>' +
      '<span class="repo">' +
      escapeHtml(card.repo) +
      "</span>" +
      "</span>" +
      metaWrap +
      "</span>" +
      saveBtn +
      "</a>"
    );
  }

  /* ─── Theme + shared header behaviour (both pages) ────────────────────── */

  function initTheme() {
    var stored = localStorage.getItem("theme");
    var theme = stored === "light" || stored === "dark" ? stored : "dark";
    applyTheme(theme);

    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        theme = document.documentElement.classList.contains("dark")
          ? "light"
          : "dark";
        applyTheme(theme);
        localStorage.setItem("theme", theme);
      });
    }

    function applyTheme(next) {
      document.documentElement.classList.toggle("dark", next === "dark");
      var toggle = document.getElementById("theme-toggle");
      if (toggle) {
        toggle.setAttribute(
          "aria-label",
          next === "dark" ? "Switch to light theme" : "Switch to dark theme",
        );
        toggle.innerHTML = next === "dark" ? icons.sun("") : icons.moon("");
      }
    }
  }

  function initHeader() {
    /* Search expansion — mirrors the React focus/click-outside behaviour */
    var wrap = document.getElementById("search-wrap");
    var input = document.getElementById("global-search");
    var escBtn = document.getElementById("search-esc");
    if (wrap && input) {
      input.addEventListener("focus", function () {
        wrap.classList.add("expanded");
        var kbd = wrap.querySelector(".search-kbd");
        if (kbd) kbd.classList.add("hidden");
        if (escBtn) escBtn.classList.remove("hidden");
      });
      document.addEventListener("mousedown", function (event) {
        if (
          wrap.classList.contains("expanded") &&
          !wrap.contains(event.target)
        ) {
          collapse();
        }
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && wrap.classList.contains("expanded"))
          collapse();
      });
      if (escBtn) escBtn.addEventListener("click", collapse);
    }

    function collapse() {
      wrap.classList.remove("expanded");
      var kbd = wrap.querySelector(".search-kbd");
      if (kbd) kbd.classList.remove("hidden");
      if (escBtn) escBtn.classList.add("hidden");
      input.blur();
    }

    /* Profile dropdown */
    var avatarBtn = document.getElementById("profile-btn");
    var menu = document.getElementById("profile-menu");
    if (avatarBtn && menu) {
      avatarBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        var open = menu.classList.toggle("open");
        avatarBtn.classList.toggle("open", open);
      });
      document.addEventListener("click", function () {
        menu.classList.remove("open");
        avatarBtn.classList.remove("open");
      });
    }

    /* Small back button — inline at the left of the repo title (no dedicated
       bar). Always goes straight back to the main page (index.html);
       hidden on the home page. */
    var isHome = false;
    try {
      isHome =
        location.pathname === "/" ||
        /(^|\/)index\.html$/i.test(location.pathname);
    } catch (e) {}

    var title = document.querySelector(".ext-title");
    if (title && !isHome && !document.getElementById("back-btn")) {
      var backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.id = "back-btn";
      backBtn.className = "icon-btn back-btn";
      backBtn.setAttribute("aria-label", "Back to main page");
      backBtn.innerHTML = icons.lucide("arrow-left", "icon-sm");
      backBtn.addEventListener("click", function () {
        if (startLoadBar) startLoadBar(); /* buffer through the trip home */
        location.href = "index.html";
      });
      title.insertBefore(backBtn, title.firstChild);
    }
  }

  /* ─── Shared header — fetched from partials/header.html when possible,
     rendered from the inline mirror when running under file:// ────────────
     (partials/header.html is the source of truth; keep this copy in sync) */

  var HEADER_HTML = [
    '<header class="site-header">',
    '  <div class="header-left">',
    '    <button type="button" aria-label="Open menu" class="icon-btn" data-icon="menu"></button>',
    '    <a href="index.html" aria-label="Sprinkle home" class="logo-link" data-icon="logo"></a>',
    "  </div>",
    '  <div class="search-wrap" id="search-wrap">',
    '    <div class="search-box">',
    '      <span data-icon="search" style="display:inline-flex"></span>',
    '      <input type="text" id="global-search" placeholder="Type / to search" aria-label="Search" />',
    '      <kbd class="search-kbd">/</kbd>',
    '      <button type="button" id="search-esc" class="esc-btn hidden">Esc</button>',
    "    </div>",
    "  </div>",
    '  <div class="header-right">',
    '    <button type="button" id="theme-toggle" class="icon-btn" aria-label="Switch to light theme"></button>',
    '    <div class="dropdown">',
    '      <button type="button" id="profile-btn" aria-label="Open user menu" class="avatar-btn" data-icon="profile"></button>',
    '      <div id="profile-menu" class="dropdown-menu">',
    '        <div class="dropdown-user">',
    '          <span class="dropdown-avatar" aria-hidden="true">SL</span>',
    '          <span style="min-width: 0">',
    '            <span class="name">Sprinkle Labs</span>',
    '            <span class="handle">@sprinkle-labs</span>',
    "          </span>",
    "        </div>",
    '        <div class="dropdown-sep"></div>',
    '        <button type="button" class="dropdown-item"><span data-icon="package"></span><span>Inventory</span></button>',
    '        <button type="button" class="dropdown-item"><span data-icon="bookmark"></span><span>Save</span></button>',
    '        <button type="button" class="dropdown-item"><span data-icon="history"></span><span>History</span></button>',
    '        <button type="button" class="dropdown-item"><span data-icon="settings"></span><span>Settings</span></button>',
    "      </div>",
    "    </div>",
    "  </div>",
    "</header>",
  ].join("\n");

  var ICON_SLOTS = {
    menu: function (el) {
      el.innerHTML = icons.menu("");
      el.querySelector("svg").setAttribute("class", "icon-menu");
    },
    logo: function (el) {
      el.innerHTML = icons.sprinkleLogo("icon-logo");
    },
    search: function (el) {
      el.innerHTML = icons.search("icon-search");
    },
    "search-side": function (el) {
      el.innerHTML = icons.search("icon-search-side");
    },
    profile: function (el) {
      el.innerHTML = icons.profile("");
      el.querySelector("svg").setAttribute(
        "style",
        "width:100%;height:100%;padding:0.25rem",
      );
    },
    plus: function (el) {
      el.innerHTML = icons.plus("icon-plus");
    },
    grip: function (el) {
      el.innerHTML = icons.resizeGrip("icon-grip");
    },
    filter: function (el) {
      el.innerHTML = icons.filter("icon-sm");
    },
    package: function (el) {
      el.innerHTML = icons.lucide("package", "icon-sm");
    },
    bookmark: function (el) {
      el.innerHTML = icons.lucide("bookmark", "icon-sm");
    },
    history: function (el) {
      el.innerHTML = icons.lucide("history", "icon-sm");
    },
    settings: function (el) {
      el.innerHTML = icons.lucide("settings", "icon-sm");
    },
  };

  function hydrateIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
      var fn = ICON_SLOTS[el.getAttribute("data-icon")];
      if (fn) fn(el);
    });
  }

  function injectHeader(done) {
    var mount = document.querySelector("[data-header]");
    if (!mount) return done();

    /* Under http(s) keep partials/header.html as the single source of truth. */
    if (location.protocol !== "file:") {
      fetch("partials/header.html")
        .then(function (res) {
          return res.text();
        })
        .then(function (html) {
          mount.innerHTML = html;
          hydrateIcons(mount);
          done();
        })
        .catch(function () {
          mount.innerHTML = HEADER_HTML;
          hydrateIcons(mount);
          done();
        });
      return;
    }

    mount.innerHTML = HEADER_HTML;
    hydrateIcons(mount);
    done();
  }

  /* ─── License knowledge base — powers the license chip popover ────────── */

  var LICENSES = {
    "apache-2.0": {
      spdx: "Apache-2.0",
      name: "Apache License 2.0",
      tagline: "Permissive · OSI-approved",
      summary:
        "Free for commercial and personal use. Keep the license notice, state your changes, and you're covered — including an explicit grant of patent rights.",
      groups: [
        {
          kind: "allowed",
          label: "Permissions",
          items: [
            "Commercial use",
            "Modification",
            "Distribution",
            "Patent grant",
            "Private use",
          ],
        },
        {
          kind: "warn",
          label: "Conditions",
          items: ["License notice", "Copyright notice", "State changes"],
        },
        {
          kind: "denied",
          label: "Limitations",
          items: ["No warranty", "No liability", "No trademark use"],
        },
      ],
    },
  };

  /* ─── Load bar — brand-colored buffering indicator, pinned to the very
     top of the viewport so it lines up with the logo in the header.
     Re-triggerable: S.startLoadBar() restarts the sweep when the user
     navigates to another page, covering the whole hand-off. ─────────────── */

  function initLoadBar() {
    var bar = document.createElement("div");
    bar.className = "load-bar done"; /* hidden until start() */
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-label", "Page loading");
    document.body.insertBefore(bar, document.body.firstChild);

    var startedAt = 0;
    var finishTimer = null;

    function finish() {
      if (bar.classList.contains("done")) return;
      clearTimeout(finishTimer);
      /* keep it visible briefly on fast loads so it never just flickers */
      var visible = Math.max(0, 350 - (Date.now() - startedAt));
      finishTimer = setTimeout(function () {
        bar.classList.add("done");
      }, visible);
    }

    function start() {
      clearTimeout(finishTimer);
      bar.classList.remove("done");
      startedAt = Date.now();
      /* safety net — never leave the bar stuck on a hung load */
      finishTimer = setTimeout(finish, 8000);
    }

    start();
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish);
    return start;
  }

  var startLoadBar = initLoadBar();

  return {
    CARDS: CARDS,
    TOP_REPOS: TOP_REPOS,
    GENRES: GENRES,
    LICENSES: LICENSES,
    REPO_TREE: REPO_TREE,
    icons: icons,
    cardHtml: cardHtml,
    formatClaps: formatClaps,
    flattenCards: flattenCards,
    cardTags: cardTags,
    cardMatchesQuery: cardMatchesQuery,
    initTheme: initTheme,
    initHeader: initHeader,
    injectHeader: injectHeader,
    hydrateIcons: hydrateIcons,
    startLoadBar: function () {
      if (startLoadBar) startLoadBar();
    },
  };
})();
