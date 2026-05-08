(function () {
  var CONSENT_KEY = "structuro_analytics_consent";

  var COPY = {
    nl: {
      bannerTitle: "Anonieme productstatistieken",
      bannerText:
        "Met jouw toestemming meten we paginaweergaves en klikken om Structuro te verbeteren. Je IP-adres sturen we niet naar PostHog.",
      accept: "Sta toe",
      deny: "Weigeren",
      privacy: "Privacybeleid",
      privacyHref: "/privacy/",
    },
    en: {
      bannerTitle: "Anonymous product analytics",
      bannerText:
        "With your consent we measure page views and clicks to improve Structuro. We do not send your IP address to PostHog.",
      accept: "Allow",
      deny: "Decline",
      privacy: "Privacy policy",
      privacyHref: "/privacy/",
    },
  };

  function lang() {
    var fromHtml = document.documentElement && document.documentElement.lang;
    if (fromHtml === "en") return "en";
    return "nl";
  }

  function consentRead() {
    try {
      var v = localStorage.getItem(CONSENT_KEY);
      if (v === "granted" || v === "denied") return v;
    } catch (e) {}
    return null;
  }

  function consentWrite(v) {
    try {
      localStorage.setItem(CONSENT_KEY, v);
    } catch (e) {}
  }

  function injectBanner(onChoice) {
    if (document.getElementById("structuro-ph-banner")) return;

    var L = COPY[lang()];
    var wrap = document.createElement("div");
    wrap.id = "structuro-ph-banner";
    wrap.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:9999;padding:16px;background:rgba(15,23,42,.94);color:#f8fafc;font-family:'DM Sans',system-ui,sans-serif;font-size:14px;line-height:1.45;box-shadow:0 -8px 30px rgba(0,0,0,.18);";
    wrap.innerHTML =
      '<div style="max-width:1100px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:flex-end;gap:14px 20px;justify-content:space-between;">' +
      '<div style="flex:1;min-width:240px;max-width:720px;">' +
      "<strong style=\"display:block;margin-bottom:6px;font-weight:700;\">" +
      L.bannerTitle +
      '</strong><span style="opacity:.92;">' +
      L.bannerText +
      '</span> <a href="' +
      L.privacyHref +
      "\" style=\"color:#93c5fd;text-decoration:underline;text-underline-offset:2px;font-weight:600;\">" +
      L.privacy +
      '</a></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;">' +
      '<button type="button" id="structuro-ph-deny" style="cursor:pointer;border-radius:10px;border:1px solid rgba(148,163,184,.5);background:transparent;color:#e2e8f0;padding:10px 18px;font-weight:600;font-size:14px;">' +
      L.deny +
      '</button><button type="button" id="structuro-ph-accept" style="cursor:pointer;border-radius:10px;border:none;background:#2563eb;color:#fff;padding:10px 18px;font-weight:700;font-size:14px;">' +
      L.accept +
      "</button></div></div>";

    document.body.appendChild(wrap);
    document.getElementById("structuro-ph-accept").onclick = function () {
      consentWrite("granted");
      wrap.remove();
      onChoice("granted");
    };
    document.getElementById("structuro-ph-deny").onclick = function () {
      consentWrite("denied");
      wrap.remove();
      onChoice("denied");
    };
  }

  function loadPosthog(initDone) {
    var key = window.__STRUCTURO_PH_KEY__;
    if (!key) return;

    var existing = document.querySelector('script[src="/ph/static/array.js"]');
    if (existing && window.posthog && typeof window.posthog.init === "function") {
      initDone();
      return;
    }

    var s = document.createElement("script");
    s.async = true;
    s.src = "/ph/static/array.js";
    s.onload = function () {
      if (!window.posthog || typeof window.posthog.init !== "function") return;
      window.posthog.init(key, {
        api_host: window.location.origin + "/ph",
        ui_host: "https://eu.posthog.com",
        capture_pageview: false,
        autocapture: false,
        disable_session_recording: true,
        persistence: "localStorage+cookie",
        cross_subdomain_cookie: false,
        respect_dnt: true,
      });
      initDone();
    };
    document.head.appendChild(s);
  }

  function attachProductEvents() {
    if (!window.posthog) return;

    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest && e.target.closest("[data-ph-cta]");
      if (!t) return;
      var loc = t.getAttribute("data-ph-cta");
      if (!loc) return;
      window.posthog.capture("cta_clicked", { location: loc });
    });

    var prijs = document.getElementById("prijs");
    if (!prijs || !("IntersectionObserver" in window)) return;
    var fired = false;
    var obs = new IntersectionObserver(
      function (entries) {
        if (fired) return;
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            fired = true;
            window.posthog.capture("pricing_viewed", { location: "eu_landing_pricing" });
            obs.disconnect();
            return;
          }
        }
      },
      { root: null, threshold: 0.2 }
    );
    obs.observe(prijs);
  }

  function bootstrap() {
    var c = consentRead();
    if (!c) {
      injectBanner(function (choice) {
        if (choice === "granted") {
          loadPosthog(attachProductEvents);
        }
      });
      return;
    }
    if (c === "granted") {
      loadPosthog(attachProductEvents);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
