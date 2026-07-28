/**
 * Motion for structuro.eu/v2:
 * sticky header, scroll reveals, phone demos, sticky CTA.
 */
(function () {
  "use strict";

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function initNav() {
    var header =
      document.getElementById("siteHeader") ||
      document.querySelector(".site-header");
    if (!header) return;
    var on = false;
    function sync() {
      var next = window.scrollY > 8;
      if (next === on) return;
      on = next;
      header.classList.toggle("is-scrolled", on);
    }
    window.addEventListener("scroll", sync, { passive: true });
    sync();

    var mm = document.getElementById("mm");
    var burger = document.getElementById("burgerBtn");
    var backdrop = document.getElementById("mmBackdrop");

    function setMenuOpen(open) {
      if (!mm) return;
      mm.classList.toggle("open", open);
      mm.hidden = !open;
      document.body.classList.toggle("mobile-nav-open", open);
      if (burger) burger.setAttribute("aria-expanded", open ? "true" : "false");
      if (backdrop) {
        backdrop.hidden = !open;
        backdrop.classList.toggle("is-on", open);
      }
    }

    if (burger) {
      burger.addEventListener("click", function () {
        setMenuOpen(!(mm && mm.classList.contains("open")));
      });
    }
    if (backdrop) {
      backdrop.addEventListener("click", function () {
        setMenuOpen(false);
      });
    }
    document.querySelectorAll("#mm a").forEach(function (a) {
      a.addEventListener("click", function () {
        setMenuOpen(false);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenuOpen(false);
    });
  }

  function initReveal() {
    if (reduce) {
      document.querySelectorAll("[data-reveal]").forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }
    document.documentElement.classList.add("has-scroll-motion");
    var els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.classList.add("is-in");
          /* Drop will-change after phone fly-in settles (compositor hygiene). */
          if (el.classList.contains("feature-visual")) {
            var phone = el.querySelector(".phone");
            if (phone) {
              window.setTimeout(function () {
                phone.style.willChange = "auto";
              }, 900);
            }
          }
          io.unobserve(el);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }

  function dictForLang() {
    var lang = window.currentLang || "nl";
    return (
      (window.V2_I18N && window.V2_I18N[lang]) ||
      (window.V2_I18N && window.V2_I18N.nl) ||
      {}
    );
  }

  function syncHomeEnergyChip(root) {
    var chip = root.querySelector("[data-home-energy-chip]");
    if (!chip) return;
    var energy = root.getAttribute("data-energy") || "ok";
    if (energy !== "low" && energy !== "ok" && energy !== "high") energy = "ok";
    var dict = dictForLang();
    var key = "phone_home_energy_aria_" + energy;
    var label = dict[key] || chip.getAttribute("aria-label") || "";
    chip.setAttribute("data-i18n-aria", key);
    if (label) {
      chip.setAttribute("aria-label", label);
      chip.setAttribute("title", label);
    }
  }

  function syncFlowBeats(root) {
    var section = root.closest("[data-flow-section]");
    if (!section) return;
    var state = root.getAttribute("data-state");
    var energy = root.getAttribute("data-energy") || "low";
    var beat = "energy";
    if (state === "micro") beat = "micro";
    else if (energy === "high") beat = "propose";
    section.querySelectorAll("[data-flow-beat]").forEach(function (el) {
      el.classList.toggle(
        "is-active",
        el.getAttribute("data-flow-beat") === beat,
      );
    });
    var sheet = root.querySelector("[data-micro-sheet]");
    if (sheet) {
      sheet.setAttribute("aria-hidden", state === "micro" ? "false" : "true");
    }
  }

  function setDemoState(root, state) {
    root.setAttribute("data-state", state);
    root.querySelectorAll("[data-pill]").forEach(function (el) {
      el.classList.toggle(
        "is-active",
        el.getAttribute("data-pill") === root.getAttribute("data-energy"),
      );
    });
    syncEnergyTitle(root);
    syncHomeEnergyChip(root);
    syncFlowBeats(root);
    if (root.getAttribute("data-demo") === "cycle") {
      var sheet = root.querySelector(".phone-cycle-sheet");
      var hint = root.querySelector(".phone-cycle-hint");
      if (sheet) {
        sheet.setAttribute("aria-hidden", state === "optin" ? "false" : "true");
      }
      if (hint) {
        hint.setAttribute("aria-hidden", state === "off" ? "false" : "true");
      }
    }
  }

  function syncEnergyTitle(root) {
    if (root.getAttribute("data-demo") !== "energy") return;
    var titleEl = root.querySelector("[data-energy-title]");
    if (!titleEl) return;
    var dict = dictForLang();
    var state = root.getAttribute("data-state");
    var key =
      state === "idle" || state === "pick" ? "phone_energy" : "phone_suggest_title";
    /* pick toont al energie-keuze + voorstellen (zoals app). */
    if (state === "pick" || state === "propose") key = "phone_suggest_title";
    if (state === "idle") key = "phone_energy";
    titleEl.textContent = dict[key] || titleEl.textContent;
    titleEl.setAttribute("data-i18n", key);
  }

  function clearAllDemoTimers(root) {
    if (root._timer) {
      clearTimeout(root._timer);
      root._timer = null;
    }
    if (root._tapTimer) {
      clearTimeout(root._tapTimer);
      root._tapTimer = null;
    }
    if (root._microTimer) {
      clearTimeout(root._microTimer);
      root._microTimer = null;
    }
    if (root._raf) {
      cancelAnimationFrame(root._raf);
      root._raf = null;
    }
  }

  function demoStillActive(root) {
    return root.classList.contains("is-playing") && !root._userPaused;
  }

  /** User-tap: auto-advance soft pauzeren, huidige state behouden (geen hard reset). */
  function pauseDemoAuto(root) {
    if (root._userPaused) return;
    root._userPaused = true;
    clearAllDemoTimers(root);
    clearFocusDemoTaps(root);
    clearDumpDemoTaps(root);
  }

  function bindDemoInteraction(root) {
    if (root._interactBound) return;
    root._interactBound = true;
    root.addEventListener(
      "pointerdown",
      function (e) {
        if (!root.classList.contains("is-playing")) return;
        /* Energy-pills hebben eigen handler; die pauzeren zelf. */
        if (e.target && e.target.closest && e.target.closest("[data-pill]")) return;
        pauseDemoAuto(root);
      },
      { passive: true },
    );
  }

  function playHomeDemo(root) {
    /* Static hero: één rustige taak, geen auto-rotate. Batterij = genoeg (2 segmenten). */
    var titleEl = root.querySelector("[data-home-title]");
    var countEl = root.querySelector("[data-home-count]");
    var key = "phone_task2";
    root._userPaused = false;
    root.setAttribute("data-energy", "ok");
    setDemoState(root, "t2");
    if (countEl) countEl.textContent = "1/1";
    if (titleEl) {
      var dict = dictForLang();
      titleEl.textContent = dict[key] || titleEl.textContent;
      titleEl.setAttribute("data-i18n", key);
    }
  }

  function playEnergyDemo(root) {
    /*
     * Flow: energie (laag→genoeg→hoog / max 3) → micro-stap USP → loop.
     * Handmatige pill-tik of phone-tap stopt auto-rotate tot opnieuw in view.
     */
    var steps = [
      { energy: "low", state: "propose", hold: 3400 },
      { energy: "ok", state: "propose", hold: 3400 },
      { energy: "high", state: "propose", hold: 4000 },
      { energy: "high", state: "micro", hold: 5000 },
    ];
    var i = 0;
    root._userPaused = false;
    root._energyManual = false;
    clearAllDemoTimers(root);
    bindEnergyPills(root);
    bindDemoInteraction(root);
    root.setAttribute("data-energy", steps[0].energy);
    setDemoState(root, steps[0].state);
    function tick() {
      if (!demoStillActive(root)) return;
      if (root._energyManual) return;
      i = (i + 1) % steps.length;
      root.setAttribute("data-energy", steps[i].energy);
      setDemoState(root, steps[i].state);
      root._timer = setTimeout(tick, steps[i].hold);
    }
    root._timer = setTimeout(tick, steps[0].hold);
  }

  function bindEnergyPills(root) {
    if (root.getAttribute("data-demo") !== "energy") return;
    if (root._energyBound) return;
    root._energyBound = true;
    root.querySelectorAll("[data-pill]").forEach(function (pill) {
      pill.setAttribute("role", "button");
      pill.setAttribute("tabindex", "0");
      function choose() {
        var energy = pill.getAttribute("data-pill");
        if (!energy) return;
        root._energyManual = true;
        root._userPaused = true;
        clearAllDemoTimers(root);
        clearFocusDemoTaps(root);
        /* Zelfde energie: geen layout-thrash, alleen pauzeren. */
        if (
          root.getAttribute("data-energy") === energy &&
          root.getAttribute("data-state") !== "micro"
        ) {
          return;
        }
        root.setAttribute("data-energy", energy);
        /* rAF: class-flips na paint, minder stutter bij klik. */
        root._raf = requestAnimationFrame(function () {
          root._raf = null;
          setDemoState(root, "propose");
        });
        try {
          if (window.posthog && typeof window.posthog.capture === "function") {
            window.posthog.capture("landing_energy_demo_tapped", {
              energy: energy,
              page_path: window.location.pathname || "/v2/",
            });
          }
        } catch (e) {}
      }
      pill.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        choose();
      });
      pill.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          choose();
        }
      });
    });
  }

  function playTasksDemo(root) {
    /* Static propose: blijf op 3 taken, geen auto-rotate. */
    root._userPaused = false;
    setDemoState(root, "t3");
  }

  function clearFocusDemoTaps(root) {
    root.querySelectorAll(".focus-demo-tap").forEach(function (el) {
      el.classList.remove("focus-demo-tap");
    });
  }

  /** Zachte tap-pulse zonder sync reflow (offsetWidth). */
  function pulseFocusTap(root, tapKey, thenFn) {
    var el = tapKey
      ? root.querySelector('[data-focus-tap="' + tapKey + '"]')
      : null;
    clearFocusDemoTaps(root);
    if (root._tapTimer) {
      clearTimeout(root._tapTimer);
      root._tapTimer = null;
    }
    if (root._raf) {
      cancelAnimationFrame(root._raf);
      root._raf = null;
    }
    if (!el) {
      thenFn();
      return;
    }
    root._raf = requestAnimationFrame(function () {
      root._raf = null;
      if (!demoStillActive(root)) return;
      el.classList.add("focus-demo-tap");
      root._tapTimer = setTimeout(function () {
        root._tapTimer = null;
        el.classList.remove("focus-demo-tap");
        if (!demoStillActive(root)) return;
        thenFn();
      }, 720);
    });
  }

  function playFocusDemo(root) {
    /*
     * Narratief met zichtbare taps:
     * Start → micro-check → Pauze → Verder → Iets langer → Afronden → Ik ben klaar
     */
    var firstMicro = root.querySelector('[data-focus-micro="1"]');
    var firstChk = firstMicro && firstMicro.querySelector(".focus-micro-chk");
    var firstLbl = firstMicro && firstMicro.querySelector("span:last-child");
    function resetMicro() {
      if (!firstMicro) return;
      firstMicro.classList.remove("is-checked");
      if (firstChk) {
        firstChk.classList.remove("is-done");
        firstChk.textContent = "";
      }
      if (firstLbl) firstLbl.classList.remove("is-done");
    }
    function markMicroDone() {
      if (!firstMicro) return;
      firstMicro.classList.add("is-checked");
      if (firstChk) {
        firstChk.classList.add("is-done");
        firstChk.textContent = "✓";
      }
      if (firstLbl) firstLbl.classList.add("is-done");
    }
    var steps = [
      {
        tap: "start",
        after: function () {
          resetMicro();
          root.classList.remove("is-focus-extended");
          setDemoState(root, "run");
        },
        hold: 2400,
      },
      {
        tap: "micro",
        after: function () {
          markMicroDone();
        },
        hold: 2200,
      },
      {
        tap: "pause-resume",
        after: function () {
          setDemoState(root, "pause");
        },
        hold: 2800,
      },
      {
        tap: "pause-resume",
        after: function () {
          setDemoState(root, "run");
        },
        hold: 2400,
      },
      {
        tap: "extend",
        after: function () {
          root.classList.add("is-focus-extended");
        },
        hold: 2600,
      },
      {
        tap: "finish",
        after: function () {
          root.classList.remove("is-focus-extended");
          setDemoState(root, "done");
        },
        hold: 3200,
      },
      {
        tap: "done",
        after: function () {
          resetMicro();
          root.classList.remove("is-focus-extended");
          setDemoState(root, "ready");
        },
        hold: 2800,
      },
    ];
    var i = 0;
    root._userPaused = false;
    clearAllDemoTimers(root);
    clearFocusDemoTaps(root);
    root.classList.remove("is-focus-extended");
    bindDemoInteraction(root);
    setDemoState(root, "ready");
    resetMicro();

    function runStep() {
      if (!demoStillActive(root)) return;
      var step = steps[i];
      i = (i + 1) % steps.length;
      pulseFocusTap(root, step.tap, function () {
        if (!demoStillActive(root)) return;
        step.after();
        root._timer = setTimeout(runStep, step.hold);
      });
    }
    root._timer = setTimeout(runStep, 2400);
  }

  function playCycleDemo(root) {
    /* Voorstel (uit) → opt-in → cyclus aan (ring + fase) → loop */
    var sequence = ["off", "optin", "on"];
    var waits = { off: 3800, optin: 4400, on: 5000 };
    var i = 0;
    root._userPaused = false;
    clearAllDemoTimers(root);
    bindDemoInteraction(root);
    setDemoState(root, "off");
    function tick() {
      if (!demoStillActive(root)) return;
      i = (i + 1) % sequence.length;
      var state = sequence[i];
      setDemoState(root, state);
      root._timer = setTimeout(tick, waits[state] || 4000);
    }
    root._timer = setTimeout(tick, 2800);
  }

  function clearDumpDemoTaps(root) {
    root.querySelectorAll(".dump-demo-tap").forEach(function (el) {
      el.classList.remove("dump-demo-tap");
    });
  }

  /** Tap/pulse op dump-mic zonder sync reflow. */
  function pulseDumpTap(root, tapKey, thenFn) {
    var el = tapKey
      ? root.querySelector('[data-dump-tap="' + tapKey + '"]')
      : null;
    clearDumpDemoTaps(root);
    if (root._tapTimer) {
      clearTimeout(root._tapTimer);
      root._tapTimer = null;
    }
    if (root._raf) {
      cancelAnimationFrame(root._raf);
      root._raf = null;
    }
    if (!el) {
      thenFn();
      return;
    }
    root._raf = requestAnimationFrame(function () {
      root._raf = null;
      if (!demoStillActive(root)) return;
      el.classList.add("dump-demo-tap");
      root._tapTimer = setTimeout(function () {
        root._tapTimer = null;
        el.classList.remove("dump-demo-tap");
        if (!demoStillActive(root)) return;
        thenFn();
      }, 720);
    });
  }

  function playDumpDemo(root) {
    /*
     * Voice-dump zoals DumpV2Client: mic tikken → Luisteren → direct bewaard
     * (spraak commit zonder Bewaren). Mic blijft altijd zichtbaar.
     */
    var steps = [
      {
        tap: "mic",
        after: function () {
          setDemoState(root, "speaking");
        },
        hold: 3600,
      },
      {
        tap: null,
        after: function () {
          setDemoState(root, "saved");
        },
        hold: 4200,
      },
      {
        tap: null,
        after: function () {
          setDemoState(root, "idle");
        },
        hold: 2800,
      },
    ];
    var i = 0;
    root._userPaused = false;
    clearAllDemoTimers(root);
    clearDumpDemoTaps(root);
    bindDemoInteraction(root);
    setDemoState(root, "idle");

    function runStep() {
      if (!demoStillActive(root)) return;
      var step = steps[i];
      i = (i + 1) % steps.length;
      pulseDumpTap(root, step.tap, function () {
        if (!demoStillActive(root)) return;
        step.after();
        root._timer = setTimeout(runStep, step.hold);
      });
    }
    root._timer = setTimeout(runStep, 2400);
  }

  var PLAYERS = {
    home: playHomeDemo,
    energy: playEnergyDemo,
    tasks: playTasksDemo,
    focus: playFocusDemo,
    cycle: playCycleDemo,
    dump: playDumpDemo,
  };

  function stopDemo(root) {
    root.classList.remove("is-playing");
    root._energyManual = false;
    root._userPaused = false;
    clearAllDemoTimers(root);
    var fallback = root.getAttribute("data-demo-default") || "pick";
    setDemoState(root, fallback);
    if (root.getAttribute("data-demo") === "energy") {
      root.setAttribute("data-energy", "low");
      setDemoState(root, fallback === "pick" ? "propose" : fallback);
    }
    if (root.getAttribute("data-demo") === "cycle") {
      setDemoState(root, fallback || "off");
    }
    if (root.getAttribute("data-demo") === "dump") {
      clearDumpDemoTaps(root);
      setDemoState(root, fallback || "idle");
    }
    if (root.getAttribute("data-demo") === "focus") {
      clearFocusDemoTaps(root);
      root.classList.remove("is-focus-extended");
      var firstMicro = root.querySelector('[data-focus-micro="1"]');
      var firstChk = firstMicro && firstMicro.querySelector(".focus-micro-chk");
      var firstLbl = firstMicro && firstMicro.querySelector("span:last-child");
      if (firstMicro) firstMicro.classList.remove("is-checked");
      if (firstChk) {
        firstChk.classList.remove("is-done");
        firstChk.textContent = "";
      }
      if (firstLbl) firstLbl.classList.remove("is-done");
    }
  }

  function initDemos() {
    var demos = document.querySelectorAll("[data-demo]");
    if (!demos.length) return;
    if (reduce) {
      demos.forEach(function (d) {
        bindEnergyPills(d);
        setDemoState(d, d.getAttribute("data-demo-default") || "pick");
      });
      return;
    }
    if (!("IntersectionObserver" in window)) {
      demos.forEach(function (d) {
        bindEnergyPills(d);
        var kind = d.getAttribute("data-demo");
        d.classList.add("is-playing");
        if (PLAYERS[kind]) PLAYERS[kind](d);
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var root = entry.target;
          var kind = root.getAttribute("data-demo");
          if (entry.isIntersecting) {
            if (root.classList.contains("is-playing")) return;
            root.classList.add("is-playing");
            if (PLAYERS[kind]) PLAYERS[kind](root);
          } else {
            stopDemo(root);
          }
        });
      },
      { threshold: 0.28 },
    );
    demos.forEach(function (d) {
      bindEnergyPills(d);
      io.observe(d);
    });
  }

  function initStickyCta() {
    var bar = document.getElementById("stickyCta");
    var hero = document.getElementById("top");
    if (!bar || !hero || !window.matchMedia) return;
    var mobile = window.matchMedia("(max-width:920px)");
    function setVisible(on) {
      if (!mobile.matches) {
        bar.hidden = true;
        bar.classList.remove("is-on");
        document.body.classList.remove("has-sticky-cta");
        return;
      }
      bar.hidden = !on;
      bar.classList.toggle("is-on", on);
      document.body.classList.toggle("has-sticky-cta", on);
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          var entry = entries[0];
          if (!entry) return;
          setVisible(mobile.matches && !entry.isIntersecting);
        },
        { rootMargin: "-68px 0px 0px 0px", threshold: 0 },
      );
      io.observe(hero);
      mobile.addEventListener("change", function () {
        if (!mobile.matches) setVisible(false);
      });
    }
  }

  var WHY_ICONS = {
    brain:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M7 3.5a2.2 2.2 0 0 0-2.1 2.8A2.3 2.3 0 0 0 3.5 8.4c0 1.3.9 2.3 2.1 2.5v1.6c0 .8.6 1.5 1.4 1.5h.5M11 3.5a2.2 2.2 0 0 1 2.1 2.8A2.3 2.3 0 0 1 14.5 8.4c0 1.3-.9 2.3-2.1 2.5v1.6c0 .8-.6 1.5-1.4 1.5h-.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9 3.2v11.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    plan:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="3.5" y="4" width="11" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M6 2.8v2.4M12 2.8v2.4M3.5 7.5h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    meaning:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M6.2 9.2c.6-1.4 1.6-2.2 2.8-2.2s2.2.8 2.8 2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    private:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="5" y="8" width="8" height="6.5" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 8V6.2a2.5 2.5 0 0 1 5 0V8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    pause:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="5" y="4" width="2.4" height="10" rx="1" fill="currentColor"/><rect x="10.6" y="4" width="2.4" height="10" rx="1" fill="currentColor"/></svg>',
    clock:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M9 5.5V9l2.4 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function initWhySheet() {
    var sheet = document.getElementById("whySheet");
    if (!sheet) return;
    var eyebrowEl = document.getElementById("whySheetEyebrow");
    var titleEl = document.getElementById("whySheetTitle");
    var rowsEl = document.getElementById("whySheetRows");
    var closeBtn = document.getElementById("whySheetClose");
    var backdrop = document.getElementById("whySheetBackdrop");
    var openKey = null;
    var openBtn = null;
    var prevOverflow = "";

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function pack() {
      var lang = window.currentLang || "nl";
      var dict = (window.V2_I18N && window.V2_I18N[lang]) || (window.V2_I18N && window.V2_I18N.nl) || {};
      return dict;
    }

    function fill(key) {
      var dict = pack();
      var why = dict.why && dict.why[key];
      if (!why || !eyebrowEl || !titleEl || !rowsEl) return false;
      eyebrowEl.textContent = why.eyebrow || "";
      titleEl.textContent = why.title || "";
      rowsEl.innerHTML = (why.rows || [])
        .map(function (row) {
          var icon = WHY_ICONS[row.icon] || WHY_ICONS.meaning;
          return (
            '<li class="why-sheet__row">' +
            '<span class="why-sheet__row-icon" aria-hidden="true">' +
            icon +
            "</span>" +
            '<div class="why-sheet__row-copy"><strong>' +
            escapeHtml(row.title || "") +
            "</strong><p>" +
            escapeHtml(row.body || "") +
            "</p></div></li>"
          );
        })
        .join("");
      if (closeBtn && dict.why_gotit) closeBtn.textContent = dict.why_gotit;
      return true;
    }

    function close() {
      if (sheet.hidden) return;
      sheet.hidden = true;
      document.body.style.overflow = prevOverflow;
      if (openBtn) {
        openBtn.classList.remove("is-open");
        openBtn = null;
      }
      openKey = null;
    }

    function open(key, btn) {
      if (!fill(key)) return;
      openKey = key;
      if (openBtn) openBtn.classList.remove("is-open");
      openBtn = btn || null;
      if (openBtn) openBtn.classList.add("is-open");
      if (sheet.hidden) {
        prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      sheet.hidden = false;
      if (closeBtn) closeBtn.focus();
    }

    document.querySelectorAll("[data-why]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-why");
        if (!key) return;
        if (!sheet.hidden && openKey === key) {
          close();
          return;
        }
        open(key, btn);
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    window.refreshWhySheet = function () {
      if (!sheet.hidden && openKey) fill(openKey);
    };
  }

  ready(function () {
    initNav();
    initReveal();
    initDemos();
    initStickyCta();
    initWhySheet();
  });
})();
