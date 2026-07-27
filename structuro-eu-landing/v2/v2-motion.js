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

  function setDemoState(root, state) {
    root.setAttribute("data-state", state);
    root.querySelectorAll("[data-pill]").forEach(function (el) {
      el.classList.toggle(
        "is-active",
        el.getAttribute("data-pill") === root.getAttribute("data-energy"),
      );
    });
    syncEnergyTitle(root);
    if (root.getAttribute("data-demo") === "cycle") {
      var sheet = root.querySelector(".cycle-sheet--discover");
      if (sheet) sheet.setAttribute("aria-hidden", state === "sheet" ? "false" : "true");
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

  function playHomeDemo(root) {
    /* Static hero: één rustige taak, geen auto-rotate. */
    var titleEl = root.querySelector("[data-home-title]");
    var countEl = root.querySelector("[data-home-count]");
    var key = "phone_task2";
    setDemoState(root, "t2");
    if (countEl) countEl.textContent = "1/1";
    if (titleEl) {
      var dict = dictForLang();
      titleEl.textContent = dict[key] || titleEl.textContent;
      titleEl.setAttribute("data-i18n", key);
    }
  }

  function playEnergyDemo(root) {
    /* idle → energie kiezen → voorstellen verschijnen (merged zoals app). */
    var sequence = [
      { energy: "low", state: "idle" },
      { energy: "low", state: "pick" },
      { energy: "ok", state: "propose" },
      { energy: "high", state: "propose" },
      { energy: "low", state: "propose" },
    ];
    var i = 1; /* pick + low als eerste paint met 1 voorstel */
    root.setAttribute("data-energy", "low");
    setDemoState(root, "pick");
    function tick() {
      if (!root.classList.contains("is-playing")) return;
      i = (i + 1) % sequence.length;
      root.setAttribute("data-energy", sequence[i].energy);
      setDemoState(root, sequence[i].state);
      var wait =
        sequence[i].state === "idle"
          ? 1500
          : sequence[i].state === "pick"
            ? 1600
            : 2000;
      root._timer = setTimeout(tick, wait);
    }
    root._timer = setTimeout(tick, 1800);
  }

  function playTasksDemo(root) {
    /* Static propose: blijf op 3 taken, geen auto-rotate. */
    setDemoState(root, "t3");
  }

  function playFocusDemo(root) {
    /* ready → run → pause → run → done (checkmark), zoals huidige focus-flow */
    var sequence = ["ready", "run", "pause", "run", "done"];
    var i = 0;
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
    setDemoState(root, "ready");
    resetMicro();
    function tick() {
      if (!root.classList.contains("is-playing")) return;
      i = (i + 1) % sequence.length;
      var state = sequence[i];
      setDemoState(root, state);
      if (state === "ready" || state === "done") resetMicro();
      if (state === "run") {
        resetMicro();
        root._microTimer = setTimeout(function () {
          if (!root.classList.contains("is-playing")) return;
          if (root.getAttribute("data-state") === "run") markMicroDone();
        }, 900);
      }
      var wait =
        state === "run" || state === "pause"
          ? 2200
          : state === "done"
            ? 2000
            : 1600;
      root._timer = setTimeout(tick, wait);
    }
    root._timer = setTimeout(tick, 1800);
  }

  function playCycleDemo(root) {
    /* Peeker zichtbaar → discovery-sheet open (inzicht, geen sturing) → weer dicht */
    var sequence = ["hint", "sheet", "hint"];
    var i = 0;
    setDemoState(root, "hint");
    function tick() {
      if (!root.classList.contains("is-playing")) return;
      i = (i + 1) % sequence.length;
      setDemoState(root, sequence[i]);
      var wait = sequence[i] === "sheet" ? 3800 : 2000;
      root._timer = setTimeout(tick, wait);
    }
    root._timer = setTimeout(tick, 1600);
  }

  var PLAYERS = {
    home: playHomeDemo,
    energy: playEnergyDemo,
    tasks: playTasksDemo,
    focus: playFocusDemo,
    cycle: playCycleDemo,
  };

  function stopDemo(root) {
    root.classList.remove("is-playing");
    if (root._timer) {
      clearTimeout(root._timer);
      root._timer = null;
    }
    if (root._microTimer) {
      clearTimeout(root._microTimer);
      root._microTimer = null;
    }
    var fallback = root.getAttribute("data-demo-default") || "pick";
    setDemoState(root, fallback);
    if (root.getAttribute("data-demo") === "energy") {
      root.setAttribute("data-energy", "low");
      setDemoState(root, fallback);
    }
    if (root.getAttribute("data-demo") === "cycle") {
      setDemoState(root, fallback || "hint");
    }
    if (root.getAttribute("data-demo") === "focus") {
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
        setDemoState(d, d.getAttribute("data-demo-default") || "pick");
      });
      return;
    }
    if (!("IntersectionObserver" in window)) {
      demos.forEach(function (d) {
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
