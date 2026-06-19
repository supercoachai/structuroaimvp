(function () {
  var loaded = {};

  function loadScript(src) {
    if (loaded[src]) return;
    loaded[src] = true;
    var s = document.createElement("script");
    s.src = src;
    s.defer = true;
    document.body.appendChild(s);
  }

  function loadStorySerifFont() {
    if (window.__structuroStorySerifLoaded) return;
    window.__structuroStorySerifLoaded = true;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500&display=swap";
    document.head.appendChild(link);
  }

  function observeSection(selector, src, margin, withFonts) {
    var el = document.querySelector(selector);
    if (!el || !("IntersectionObserver" in window)) {
      if (withFonts) loadStorySerifFont();
      loadScript(src);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        if (withFonts) loadStorySerifFont();
        loadScript(src);
      },
      { rootMargin: margin || "200px 0px", threshold: 0 }
    );
    observer.observe(el);
  }

  function scheduleIdle(fn, timeout) {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(fn, { timeout: timeout || 2000 });
    } else {
      window.addEventListener("load", function onLoad() {
        window.removeEventListener("load", onLoad);
        window.setTimeout(fn, 120);
      });
    }
  }

  scheduleIdle(function () {
    loadScript("/js/landing-live-demo.js?v=20260616n");
  }, 2500);

  observeSection(
    "#brein-termen",
    "/js/landing-zelftest.js?v=20260619a",
    "500px 0px"
  );
  observeSection("#loop", "/js/landing-audit.js?v=20260619a", "250px 0px");
  observeSection(
    "#founder",
    "/js/landing-founder-story.js?v=20260616c",
    "250px 0px",
    true
  );
  window.addEventListener("load", function () {
    var insights = document.createElement("script");
    insights.src = "/_vercel/insights/script.js";
    insights.defer = true;
    document.body.appendChild(insights);
  });
})();
