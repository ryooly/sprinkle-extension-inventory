(function () {
  "use strict";

  var S = window.SPRINKLE;

  var CHECK_ICON =
    '<svg class="plan-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ' +
    'width="13" height="13" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  var PLAN_TAGS = {
    basic: "Start here",
    pro: "For daily builders",
    premium: "For teams at scale",
  };

  var PLAN_FEATURES = {
    basic: [
      "1 workspace",
      "20 extension installs",
      "Public extension pages",
      "Community support",
    ],
    pro: [
      "5 workspaces",
      "Unlimited installs",
      "Private and draft extensions",
      "Faster review queue",
      "Email support",
    ],
    premium: [
      "Everything in Pro",
      "10 workspaces and 5 seats",
      "Early access releases",
      "Priority review and hotfixes",
      "Dedicated support",
    ],
  };

  var FALLBACK_PLANS = [
    { id: 2, name: "basic", price: 0, durationInDays: 30, isPremium: false },
    { id: 1, name: "pro", price: 49000, durationInDays: 90, isPremium: true },
    {
      id: 3,
      name: "premium",
      price: 99000,
      durationInDays: 365,
      isPremium: true,
    },
  ];

  var plans = FALLBACK_PLANS.slice();
  var state = {
    ready: false,
    error: "",
    isPremium: false,
    plan: null,
    subscription: null,
  };

  var overlay = null;
  var lastFocus = null;
  var closeTimer = 0;
  var pendingPlan = "";
  var cancelling = false;
  var checkoutUrl = "";
  var lastPremium = false;

  function titleCase(value) {
    var text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function formatPrice(value) {
    var amount = Number(value) || 0;
    if (amount <= 0) return "Free";
    return (
      "Rp" +
      amount.toLocaleString("id-ID", { maximumFractionDigits: 0 })
    );
  }

  function perMonth(plan) {
    var months = Math.max(1, Math.round(Number(plan.durationInDays) / 30));
    return "Rp" + ((Number(plan.price) || 0) / months).toFixed(0);
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

  function currentPlanId() {
    if (!state.subscription || state.subscription.status !== "active") {
      return "";
    }
    return state.plan ? state.plan.id : "";
  }

  function featureList(plan) {
    return PLAN_FEATURES[plan.name] || [
      "Full catalog access",
      "Saved extensions and history",
      "Community support",
    ];
  }

  function isFeatured(plan) {
    return plan.name === "premium";
  }

  function planHtml(plan) {
    var chosen = plan.id === currentPlanId();
    var name = titleCase(plan.name);
    var working = pendingPlan === String(plan.id);
    var ctaLabel = chosen
      ? "Current plan"
      : "Choose " + name + (working ? "…" : "");

    return (
      '<article class="plan-card' +
      (isFeatured(plan) ? " featured" : "") +
      '" data-plan="' +
      plan.id +
      '">' +
      (isFeatured(plan) ? '<span class="plan-badge">Most popular</span>' : "") +
      '<div class="plan-head">' +
      '<span class="plan-name">' +
      S.escapeHtml(name) +
      "</span>" +
      '<span class="plan-tag">' +
      (PLAN_TAGS[plan.name] || "Add-on") +
      "</span>" +
      "</div>" +
      '<div class="plan-price">' +
      '<span class="plan-amount">' +
      formatPrice(plan.price) +
      "</span>" +
      '<span class="plan-cycle">/ ' +
      plan.durationInDays +
      " days</span>" +
      "</div>" +
      '<span class="plan-eq">≈ ' +
      perMonth(plan) +
      " per month</span>" +
      '<ul class="plan-features">' +
      featureList(plan)
        .map(function (feature) {
          return "<li>" + CHECK_ICON + "<span>" + feature + "</span></li>";
        })
        .join("") +
      "</ul>" +
      '<button type="button" class="plan-cta" data-plan-cta="' +
      plan.id +
      '" aria-pressed="' +
      (chosen ? "true" : "false") +
      '"' +
      (pendingPlan ? " disabled" : "") +
      ">" +
      (chosen ? CHECK_ICON : "") +
      "<span>" +
      S.escapeHtml(ctaLabel) +
      "</span></button>" +
      "</article>"
    );
  }

  function statusHtml() {
    if (!S.auth || !S.auth.isLoggedIn()) {
      return (
        '<p class="sub-status-text">Sign in to manage your plan.</p>' +
        '<button type="button" class="sub-status-action" data-auth-open="login">' +
        "Log in</button>"
      );
    }

    if (!state.ready) {
      return '<p class="sub-status-text">Loading your subscription…</p>';
    }

    if (state.error) {
      return (
        '<p class="sub-status-text is-error">' +
        S.escapeHtml(state.error) +
        "</p>"
      );
    }

    var sub = state.subscription;

    if (!sub || sub.status !== "active") {
      return (
        '<p class="sub-status-text">No active plan — pick one below to unlock ' +
        "the premium showcase.</p>"
      );
    }

    var plan = state.plan || {};
    var until = sub.expiresAt
      ? " · until " +
        formatDate(sub.expiresAt) +
        (sub.daysRemaining !== null && sub.daysRemaining !== undefined
          ? " (" + sub.daysRemaining + " days left)"
          : "")
      : "";
    var perk = state.isPremium
      ? "Premium showcase unlocked"
      : S.escapeHtml(titleCase(plan.name || "current")) +
        " plan active — premium showcase still locked";

    return (
      '<p class="sub-status-text' +
      (state.isPremium ? " is-active" : "") +
      '">' +
      perk +
      until +
      "</p>" +
      (checkoutUrl
        ? '<a class="sub-status-link" href="' +
          S.escapeHtml(checkoutUrl) +
          '" target="_blank" rel="noopener">Open checkout</a>'
        : "") +
      '<button type="button" class="sub-status-action"' +
      (cancelling ? " disabled" : "") +
      ">" +
      (cancelling ? "Cancelling…" : "Cancel plan") +
      "</button>"
    );
  }

  function renderStatus() {
    var el = overlay && overlay.querySelector("#sub-status");
    if (!el) return;
    el.innerHTML = statusHtml();
  }

  function render() {
    if (!overlay) return;
    var grid = overlay.querySelector("#plan-grid");
    if (grid) grid.innerHTML = plans.map(planHtml).join("");
    renderStatus();
  }

  function syncPremiumButton() {
    var btn = document.getElementById("premium-btn");
    if (!btn) return;
    btn.classList.toggle("is-premium", !!state.isPremium);
    btn.setAttribute("aria-pressed", state.isPremium ? "true" : "false");

    var label = btn.querySelector("span:last-child");
    if (label) {
      label.textContent = state.isPremium
        ? titleCase((state.plan && state.plan.name) || "Premium")
        : "Premium";
    }
  }

  function notifyPremium() {
    if (lastPremium === state.isPremium) return;
    lastPremium = state.isPremium;
    document.dispatchEvent(
      new CustomEvent("sprinkle:premium", {
        detail: { isPremium: state.isPremium, plan: state.plan },
      }),
    );
  }

  function loadState() {
    if (!S.api || !S.api.subscription || !S.auth.isLoggedIn()) {
      state.ready = true;
      state.isPremium = false;
      state.plan = null;
      state.subscription = null;
      render();
      syncPremiumButton();
      notifyPremium();
      return Promise.resolve();
    }

    return S.api
      .subscription()
      .then(function (res) {
        state.ready = true;
        if (!res.ok) {
          state.error = res.message || "Unable to load your subscription.";
          state.isPremium = false;
          state.plan = null;
          state.subscription = null;
        } else {
          state.error = "";
          state.isPremium = !!res.data.isPremium;
          state.plan = res.data.plan || null;
          state.subscription = res.data.subscription || null;
        }
        render();
        syncPremiumButton();
        notifyPremium();
      })
      .catch(function (err) {
        state.ready = true;
        state.error = (err && err.message) || "Network error";
        render();
        syncPremiumButton();
        notifyPremium();
      });
  }

  function loadPlans() {
    if (!S.api || !S.api.listPlans) return Promise.resolve();

    return S.api
      .listPlans()
      .then(function (res) {
        var rows = res.ok && res.data && res.data.length ? res.data : null;
        if (rows) {
          plans = rows.slice().sort(function (a, b) {
            return Number(a.durationInDays) - Number(b.durationInDays);
          });
        }
      })
      .catch(function () {});
  }

  function selectPlan(planId) {
    var plan = null;
    plans.forEach(function (entry) {
      if (String(entry.id) === String(planId)) plan = entry;
    });
    if (!plan || pendingPlan) return;

    pendingPlan = String(plan.id);
    render();

    S.api
      .selectPlan(plan.id)
      .then(function (res) {
        pendingPlan = "";
        if (!res.ok) {
          S.showToast(
            res.message || "Could not activate the " + plan.name + " plan.",
            "error",
          );
          return loadState();
        }
        checkoutUrl = (res.data.checkout && res.data.checkout.redirectUrl) || "";
        S.showToast(
          titleCase(plan.name) +
            " is now your plan — premium " +
            (res.data.plan.isPremium ? "unlocked" : "still locked") +
            ".",
          "success",
        );
        return loadState();
      })
      .catch(function (err) {
        pendingPlan = "";
        S.showToast(
          (err && err.message) || "The gateway is unreachable.",
          "error",
        );
        loadState();
      });
  }

  function cancelPlan() {
    if (cancelling) return;

    cancelling = true;
    renderStatus();

    S.api
      .cancelSubscription()
      .then(function (res) {
        cancelling = false;
        if (!res.ok) {
          S.showToast(res.message || "Could not cancel your plan.", "error");
        } else {
          checkoutUrl = "";
          S.showToast("Subscription cancelled.", "info");
        }
        return loadState();
      })
      .catch(function (err) {
        cancelling = false;
        S.showToast(
          (err && err.message) || "The gateway is unreachable.",
          "error",
        );
        loadState();
      });
  }

  function onGridClick(event) {
    var cta = event.target.closest(".plan-cta");
    if (cta) {
      selectPlan(cta.getAttribute("data-plan-cta"));
    }
  }

  function build() {
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "sub-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="sub-modal" role="dialog" aria-modal="true" ' +
      'aria-labelledby="sub-dialog-title" aria-describedby="sub-dialog-lede">' +
      '<div class="sub-head">' +
      '<div class="sub-head-text">' +
      '<h2 class="sub-title" id="sub-dialog-title">' +
      S.icons.lucide("package", "icon-sm") +
      "<span>Subscription</span>" +
      "</h2>" +
      '<p class="sub-lede" id="sub-dialog-lede">Basic is billed every 30 days, ' +
      "Pro every 90 days and Premium every 365 days. Pick a plan to switch your " +
      "account immediately — cancel any time.</p>" +
      "</div>" +
      '<button type="button" class="sub-close" aria-label="Close subscription">' +
      S.icons.lucide("x", "icon-sm") +
      "</button>" +
      "</div>" +
      '<div class="sub-body">' +
      '<p class="sub-status" id="sub-status"></p>' +
      '<section class="sub-plans" id="plan-grid" aria-label="Plans"></section>' +
      "</div>" +
      '<p class="sub-foot">Prices in IDR. Plans activate as soon as they are ' +
      "selected and expire at the end of their period.</p>" +
      "</div>";

    document.body.appendChild(overlay);

    overlay.querySelector(".sub-close").addEventListener("click", close);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        close();
        return;
      }

      var signIn = event.target.closest("[data-auth-open]");
      if (signIn) {
        close();
        return;
      }

      if (event.target.closest(".sub-status-action")) cancelPlan();
    });
    overlay.querySelector("#plan-grid").addEventListener("click", onGridClick);

    return overlay;
  }

  function focusables() {
    return Array.prototype.slice.call(
      overlay.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;

    var items = focusables();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function open(trigger) {
    build();
    lastFocus = trigger || document.activeElement;
    state.ready = false;

    render();

    window.clearTimeout(closeTimer);
    overlay.hidden = false;
    document.documentElement.classList.add("sub-open");
    document.addEventListener("keydown", onKeydown);

    requestAnimationFrame(function () {
      overlay.classList.add("open");
    });

    overlay.querySelector(".sub-close").focus();

    loadPlans().then(loadState);
  }

  function close() {
    if (!overlay || overlay.hidden) return;

    overlay.classList.remove("open");
    document.documentElement.classList.remove("sub-open");
    document.removeEventListener("keydown", onKeydown);

    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(function () {
      overlay.hidden = true;
    }, 180);

    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("sprinkle:auth", function () {
    state.ready = false;
    checkoutUrl = "";
    loadState();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      loadState();
    });
  } else {
    loadState();
  }

  S.premium = {
    refresh: loadState,
    state: function () {
      return state;
    },
  };
  S.openSubscription = open;
  S.closeSubscription = close;
})();
