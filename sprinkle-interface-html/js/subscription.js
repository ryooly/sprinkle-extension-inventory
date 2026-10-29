(function () {
  "use strict";

  var S = window.SPRINKLE;

  var STORAGE_KEY = "sprinkle:subscription";

  var CHECK_ICON =
    '<svg class="plan-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ' +
    'width="13" height="13" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  var PLANS = [
    {
      id: "basic",
      name: "Basic",
      tag: "Start here",
      duration: "30",
      price: 3,
      features: [
        "1 workspace",
        "20 extension installs",
        "Public extension pages",
        "Community support",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      tag: "For daily builders",
      duration: "90",
      price: 24,
      features: [
        "5 workspaces",
        "Unlimited installs",
        "Private and draft extensions",
        "Faster review queue",
        "Email support",
      ],
    },
    {
      id: "premium",
      name: "Premium",
      tag: "For teams at scale",
      duration: "365",
      price: 148,
      featured: true,
      features: [
        "Everything in Pro",
        "10 workspaces and 5 seats",
        "Early access releases",
        "Priority review and hotfixes",
        "Dedicated support",
      ],
    },
  ];

  var selection = readSelection();
  var overlay = null;
  var lastFocus = null;
  var closeTimer = 0;
  var planName = "";

  function readSelection() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === "object") return saved;
    } catch (e) {}
    return {};
  }

  function saveSelection() {
    var plan = byId(planName);
    if (!plan) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          plan_name: plan.id,
          duration: plan.duration,
          startedAt: new Date().toISOString(),
        }),
      );
    } catch (e) {}
  }

  function byId(id) {
    for (var i = 0; i < PLANS.length; i++) {
      if (PLANS[i].id === id) return PLANS[i];
    }
    return null;
  }

  function perMonth(plan) {
    return (plan.price / Math.round(Number(plan.duration) / 30)).toFixed(2);
  }

  function planHtml(plan) {
    return (
      '<article class="plan-card' +
      (plan.featured ? " featured" : "") +
      '" data-plan="' +
      plan.id +
      '">' +
      (plan.featured
        ? '<span class="plan-badge">Most popular</span>'
        : "") +
      '<div class="plan-head">' +
      '<span class="plan-name">' +
      plan.name +
      "</span>" +
      '<span class="plan-tag">' +
      plan.tag +
      "</span>" +
      "</div>" +
      '<div class="plan-price">' +
      '<span class="plan-amount">$' +
      plan.price +
      "</span>" +
      '<span class="plan-cycle">/ ' +
      plan.duration +
      " days</span>" +
      "</div>" +
      '<span class="plan-eq">≈ $' +
      perMonth(plan) +
      " per month</span>" +
      '<ul class="plan-features">' +
      plan.features
        .map(function (feature) {
          return "<li>" + CHECK_ICON + "<span>" + feature + "</span></li>";
        })
        .join("") +
      "</ul>" +
      '<button type="button" class="plan-cta" aria-pressed="false">' +
      "<span>Choose " +
      plan.name +
      "</span></button>" +
      "</article>"
    );
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
      "Pro every 90 days and Premium every 365 days. Every plan starts with a " +
      "14-day trial and can be cancelled at any time.</p>" +
      "</div>" +
      '<button type="button" class="sub-close" aria-label="Close subscription">' +
      S.icons.lucide("x", "icon-sm") +
      "</button>" +
      "</div>" +
      '<div class="sub-body">' +
      '<section class="sub-plans" id="plan-grid" aria-label="Plans"></section>' +
      "</div>" +
      '<p class="sub-foot">Prices in USD. Cancel anytime from your inventory.</p>' +
      "</div>";

    document.body.appendChild(overlay);

    overlay.querySelector(".sub-close").addEventListener("click", close);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) close();
    });
    overlay.querySelector("#plan-grid").addEventListener("click", onPlanClick);

    return overlay;
  }

  function render() {
    overlay.querySelector("#plan-grid").innerHTML = PLANS.map(planHtml).join("");
  }

  function sync() {
    overlay.querySelectorAll(".plan-card").forEach(function (card) {
      var plan = byId(card.getAttribute("data-plan"));
      var cta = card.querySelector(".plan-cta");
      var chosen = plan.id === planName;

      card.classList.toggle("chosen", chosen);
      cta.classList.toggle("chosen", chosen);
      cta.setAttribute("aria-pressed", String(chosen));
      cta.innerHTML = chosen
        ? CHECK_ICON + "<span>Current plan</span>"
        : "<span>Choose " + plan.name + "</span>";
    });
  }

  function onPlanClick(event) {
    var cta = event.target.closest(".plan-cta");
    if (!cta) return;
    var card = cta.closest(".plan-card");
    var next = card.getAttribute("data-plan");
    if (next === planName) {
      S.showToast(byId(next).name + " is already your current plan", "info");
      return;
    }
    planName = next;
    saveSelection();
    sync();
    var plan = byId(planName);
    S.showToast(
      plan.name +
        " · " +
        plan.duration +
        " days selected — checkout coming soon",
      "info",
    );
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
    planName = byId(selection.plan_name) ? selection.plan_name : "";

    render();
    sync();

    window.clearTimeout(closeTimer);
    overlay.hidden = false;
    document.documentElement.classList.add("sub-open");
    document.addEventListener("keydown", onKeydown);

    requestAnimationFrame(function () {
      overlay.classList.add("open");
    });

    overlay.querySelector(".sub-close").focus();
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

  S.openSubscription = open;
  S.closeSubscription = close;
})();
