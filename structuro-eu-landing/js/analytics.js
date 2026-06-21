(function () {
  var GA_MEASUREMENT_ID = "G-26Q9L72S3P";

  /**
   * EU landing analytics (site=eu in PostHog).
   * Primaire conversie: cta_clicked → structuro.ai/start → signup_completed (niet waitlist).
   * Organisch EU: /start + utm_source=structuro_eu. TikTok: alleen bij utm_source=tiktok of ttclid → /tiktok.
   * /wachtlijst, /waitlist en /inschrijven redirecten naar structuro.ai/registreren (zie vercel.json).
   * Verouderde section_id "waarom" in historische data: sectie heet nu brein-termen / waarom-nodig.
   */
  /** Sectie-id's voor zichtbaarheid (moet overeenkomen met id="" op index.html). */
  var EU_SECTION_IDS = [
    "hero",
    "brein-termen",
    "wat-anderen-zeggen",
    "loop",
    "founder",
    "voor-vrouwen",
    "gezien-in",
    "prijs",
    "faq",
    "eu-sluitstuk",
  ];

  var SCROLL_MILESTONES_PCT = [25, 50, 75, 100];

  function capturePh(event, props, options) {
    try {
      if (window.posthog && typeof window.posthog.capture === "function") {
        window.posthog.capture(event, props || {}, options || {});
      }
    } catch (e) {}
  }

  function isTikTokAcquisitionTraffic(params) {
    var source = (params.get("utm_source") || "").toLowerCase();
    if (source === "tiktok") return true;
    if (params.get("ttclid")) return true;
    return false;
  }

  function structuroSignupBridgeUrl(contentId) {
    var params = new URLSearchParams(window.location.search || "");
    var isTikTok = isTikTokAcquisitionTraffic(params);
    var bridgePath = isTikTok ? "/tiktok" : "/start";
    var bridgeParams = new URLSearchParams({
      utm_content: contentId || "cta",
      campaign: "weten",
      hero: "A",
    });
    if (isTikTok) {
      bridgeParams.set("utm_source", "tiktok");
      bridgeParams.set(
        "utm_medium",
        (params.get("utm_medium") || "paid_social").toLowerCase()
      );
      bridgeParams.set(
        "utm_campaign",
        params.get("utm_campaign") || "tiktok_promote"
      );
    } else {
      bridgeParams.set("utm_source", "structuro_eu");
      bridgeParams.set("utm_medium", "organic");
      bridgeParams.set("utm_campaign", "website");
    }
    var lang =
      window.currentLang ||
      (typeof localStorage !== "undefined" && localStorage.getItem("structuro_lang")) ||
      "nl";
    if (lang === "nl" || lang === "en") {
      bridgeParams.set("lang", lang);
    }
    // Cross-domain identity: geef het anonieme PostHog distinct_id mee zodat
    // structuro.ai met hetzelfde ID kan bootstrappen (1 persoon over .eu → .ai).
    try {
      if (window.posthog && typeof window.posthog.get_distinct_id === "function") {
        var did = window.posthog.get_distinct_id();
        if (did) bridgeParams.set("_ph_did", did);
      }
    } catch (e) {}
    return "https://www.structuro.ai" + bridgePath + "?" + bridgeParams.toString();
  }

  function applySignupBridgeLinks() {
    document.querySelectorAll("[data-signup-bridge]").forEach(function (el) {
      var content = el.getAttribute("data-signup-bridge") || "cta";
      el.setAttribute("href", structuroSignupBridgeUrl(content));
    });
  }

  window.structuroSignupBridgeUrl = structuroSignupBridgeUrl;

  /**
   * Herbereken de bridge-href vlak vóór navigatie. De href wordt al gezet na
   * PostHog-init (applySignupBridgeLinks), maar bij een snelle klik kan PostHog
   * nog laden. Op pointerdown pakken we het meest verse distinct_id mee.
   */
  function attachSignupBridgeRefresh() {
    if (window.__structuroEuBridgeRefreshBound) return;
    window.__structuroEuBridgeRefreshBound = true;

    document.addEventListener(
      "pointerdown",
      function (e) {
        var target = e.target;
        if (!target || !target.closest) return;
        var el = target.closest("[data-signup-bridge]");
        if (!el) return;
        var content = el.getAttribute("data-signup-bridge") || "cta";
        el.setAttribute("href", structuroSignupBridgeUrl(content));
      },
      true
    );
  }

  function attachCtaClicks() {
    if (window.__structuroEuCtaBound) return;
    window.__structuroEuCtaBound = true;

    document.addEventListener(
      "click",
      function (e) {
        var target = e.target;
        if (!target || !target.closest) return;
        var el = target.closest("[data-ph-cta]");
        if (!el) return;
        var ctaId = el.getAttribute("data-ph-cta");
        if (!ctaId) return;
        capturePh(
          "cta_clicked",
          {
            cta_id: ctaId,
            page_path: window.location.pathname || "/",
          },
          { send_instantly: true }
        );
      },
      true
    );
  }

  function captureGa(name, props) {
    try {
      if (window.gtag && typeof window.gtag === "function") {
        window.gtag("event", name, props || {});
      }
    } catch (e) {}
  }

  /**
   * GA4: dataLayer-queue tot gtag.js geladen is (zelfde gedrag als Google's snippet).
   */
  function loadGoogleAnalytics() {
    if (window.__structuroGa4Loaded) return;
    window.__structuroGa4Loaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID);

    var s = document.createElement("script");
    s.async = true;
    s.src =
      "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(s);
  }

  function loadPosthog(initDone) {
    var raw = typeof window.__STRUCTURO_PH_KEY__ === "string" ? window.__STRUCTURO_PH_KEY__ : "";
    var key = raw.trim();
    if (!key || key.indexOf("__STRUCTURO_PH_PROJECT_KEY__") !== -1) {
      if (typeof initDone === "function") initDone();
      return;
    }

    var PH_API_HOST =
      typeof window.__STRUCTURO_PH_API_HOST__ === "string"
        ? window.__STRUCTURO_PH_API_HOST__.trim()
        : "/ph";
    var PH_ARRAY_SRC = PH_API_HOST.replace(/\/+$/, "") + "/static/array.js";

    var existing = document.querySelector('script[src="' + PH_ARRAY_SRC + '"]');
    if (existing && window.posthog && typeof window.posthog.init === "function") {
      initDone();
      return;
    }

    var s = document.createElement("script");
    s.async = true;
    s.src = PH_ARRAY_SRC;
    s.onload = function () {
      if (!window.posthog || typeof window.posthog.init !== "function") {
        if (typeof initDone === "function") initDone();
        return;
      }
      window.posthog.init(key, {
        api_host: PH_API_HOST,
        ui_host: "https://eu.posthog.com",
        __add_tracing_headers: [
          "localhost",
          "127.0.0.1",
          "structuro.ai",
          "www.structuro.ai",
          "structuro.eu",
          "www.structuro.eu",
          "t.structuro.eu",
          window.location.hostname,
        ].filter(Boolean),
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        disable_session_recording: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
        persistence: "localStorage+cookie",
        cross_subdomain_cookie: false,
        respect_dnt: true,
      });
      var hn = window.location.hostname || "";
      var siteProp = "dev";
      if (hn.indexOf("structuro.eu") !== -1) siteProp = "eu";
      else if (hn.indexOf("structuro.ai") !== -1) siteProp = "ai";
      window.posthog.register({ 
        site: siteProp,
        environment: "production"
      });
      window.posthog.opt_in_capturing();
      scheduleSessionRecording();
      if (typeof initDone === "function") initDone();
    };
    document.head.appendChild(s);
  }

  /**
   * Scroll-diepte (eenmalig per drempel), PostHog + GA4.
   */
  function attachScrollDepthMilestones() {
    if (window.__structuroEuScrollMilestones) return;
    window.__structuroEuScrollMilestones = true;

    var fired = {};
    var ticking = false;

    function pctScrolled() {
      var el = document.documentElement;
      var h = el.scrollHeight - el.clientHeight;
      if (h <= 0) return 100;
      return Math.min(100, Math.round((el.scrollTop / h) * 100));
    }

    function flush() {
      ticking = false;
      var p = pctScrolled();
      for (var i = 0; i < SCROLL_MILESTONES_PCT.length; i++) {
        var m = SCROLL_MILESTONES_PCT[i];
        if (p < m || fired[m]) continue;
        fired[m] = true;
        var props = { percent: m, page_path: window.location.pathname || "/" };
        capturePh("eu_scroll_depth", props);
        captureGa("scroll_depth", { percent: m });
      }
      if (fired[100]) {
        window.removeEventListener("scroll", onScroll);
      }
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(flush);
        } else {
          setTimeout(flush, 100);
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    flush();
  }

  /**
   * Eerste keer dat een hoofdsectie zichtbaar wordt (scroll-pad).
   */
  function attachSectionVisibility() {
    if (!("IntersectionObserver" in window) || window.__structuroEuSectionIO) return;
    window.__structuroEuSectionIO = true;

    var seen = {};

    var obs = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var en = entries[i];
          if (!en.isIntersecting || en.target.id === "") continue;
          var id = en.target.id;
          if (seen[id]) continue;
          seen[id] = true;
          var props = { section_id: id, page_path: window.location.pathname || "/" };
          capturePh("eu_section_viewed", props);
          captureGa("section_view", { section_id: id });
        }
      },
      { root: null, threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );

    for (var j = 0; j < EU_SECTION_IDS.length; j++) {
      var el = document.getElementById(EU_SECTION_IDS[j]);
      if (el) obs.observe(el);
    }
  }

  /** FAQ <details> open (uitklappen). */
  function attachFaqToggle() {
    if (window.__structuroEuFaqToggle) return;
    window.__structuroEuFaqToggle = true;

    document.addEventListener(
      "toggle",
      function (e) {
        var t = e.target;
        if (!t || t.tagName !== "DETAILS") return;
        if (!t.open) return;
        if (!t.classList || !t.classList.contains("faq-item")) return;
        var faqId = t.getAttribute("data-faq-id");
        if (!faqId) return;
        var props = { faq_id: faqId, page_path: window.location.pathname || "/" };
        capturePh("eu_faq_opened", props);
        captureGa("faq_open", { faq_id: faqId });
      },
      true
    );
  }

  /** Prijsblok eenmalig zichtbaar (bestaande funnel). */
  function attachPricingViewed() {
    var prijs = document.getElementById("prijs");
    if (!prijs || !("IntersectionObserver" in window) || window.__structuroEuPricingIO) return;
    window.__structuroEuPricingIO = true;

    var fired = false;
    var obs = new IntersectionObserver(
      function (entries) {
        if (fired) return;
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            fired = true;
            var props = { location: "eu_landing_pricing", page_path: window.location.pathname || "/" };
            capturePh("pricing_viewed", props);
            captureGa("pricing_view", { location: "eu_landing_pricing" });
            obs.disconnect();
            return;
          }
        }
      },
      { root: null, threshold: 0.2 }
    );
    obs.observe(prijs);
  }

  function attachLandingMeasurement() {
    applySignupBridgeLinks();
    attachSignupBridgeRefresh();
    attachScrollDepthMilestones();
    attachSectionVisibility();
    attachFaqToggle();
    attachPricingViewed();
    attachCtaClicks();
  }

  function scheduleSessionRecording() {
    if (window.__structuroEuRecordingScheduled) return;
    window.__structuroEuRecordingScheduled = true;

    function start() {
      try {
        if (window.posthog && typeof window.posthog.startSessionRecording === "function") {
          window.posthog.startSessionRecording();
        }
      } catch (e) {}
    }

    function onFirstEngagement() {
      start();
      window.removeEventListener("scroll", onFirstEngagement);
      window.removeEventListener("pointerdown", onFirstEngagement);
      window.removeEventListener("keydown", onFirstEngagement);
    }

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(start, { timeout: 8000 });
    } else {
      window.setTimeout(start, 4000);
    }

    window.addEventListener("scroll", onFirstEngagement, { passive: true, once: true });
    window.addEventListener("pointerdown", onFirstEngagement, { once: true });
    window.addEventListener("keydown", onFirstEngagement, { once: true });
  }

  function scheduleBootstrap() {
    function runPosthog() {
      loadPosthog(attachLandingMeasurement);
    }

    function runGa() {
      loadGoogleAnalytics();
    }

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(runPosthog, { timeout: 3500 });
    } else {
      window.addEventListener("load", function onLoad() {
        window.removeEventListener("load", onLoad);
        window.setTimeout(runPosthog, 200);
      });
    }

    window.addEventListener("load", function onGaLoad() {
      window.removeEventListener("load", onGaLoad);
      window.setTimeout(runGa, 1500);
    });
  }

  function bootstrap() {
    scheduleBootstrap();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
