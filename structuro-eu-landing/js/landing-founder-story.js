/**
 * Founder story — 3-beat swipe carousel (De maker → De clash → De conclusie).
 * Mobiel: swipe. Desktop: pijltjes + dots. Geen auto-advance.
 */
(function () {
  var root = document.getElementById("founderStory");
  if (!root) return;

  var track = root.querySelector("[data-founder-track]");
  var slides = root.querySelectorAll("[data-founder-slide]");
  var dots = root.querySelectorAll("[data-founder-dot]");
  var prevBtn = root.querySelector("[data-founder-prev]");
  var nextBtn = root.querySelector("[data-founder-next]");
  var labelEl = root.querySelector("[data-founder-label]");
  var count = slides.length;
  var index = 0;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var stackMq = window.matchMedia("(max-width: 720px)");

  function isStacked() {
    return reducedMotion || stackMq.matches;
  }

  function readLabels() {
    return [
      root.getAttribute("data-label-maker") || "De maker",
      root.getAttribute("data-label-clash") || "De clash",
      root.getAttribute("data-label-conclusion") || "De conclusie",
    ];
  }

  var labels = readLabels();

  function clamp(i) {
    if (i < 0) return 0;
    if (i >= count) return count - 1;
    return i;
  }

  function setIndex(next) {
    index = clamp(next);
    if (track && !isStacked()) {
      track.style.transform = "translateX(-" + index * 100 + "%)";
    } else if (track) {
      track.style.transform = "none";
    }
    slides.forEach(function (slide, i) {
      var active = i === index;
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      if (active) slide.removeAttribute("tabindex");
      else slide.setAttribute("tabindex", "-1");
    });
    dots.forEach(function (dot, i) {
      var active = i === index;
      dot.classList.toggle("active", active);
      if (active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    if (labelEl) labelEl.textContent = labels[index] || "";
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === count - 1;
    root.setAttribute("data-founder-index", String(index));
  }

  function step(delta) {
    setIndex(index + delta);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      step(-1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      step(1);
    });
  }

  dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      var target = parseInt(dot.getAttribute("data-founder-dot") || "0", 10);
      setIndex(target);
    });
  });

  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    }
  });

  if (!isStacked() && track) {
    var startX = 0;
    var tracking = false;
    var viewport = root.querySelector("[data-founder-viewport]");
    var target = viewport || root;

    target.addEventListener(
      "touchstart",
      function (e) {
        if (!e.touches || !e.touches[0]) return;
        startX = e.touches[0].clientX;
        tracking = true;
      },
      { passive: true }
    );

    target.addEventListener(
      "touchend",
      function (e) {
        if (!tracking) return;
        tracking = false;
        var endX =
          e.changedTouches && e.changedTouches[0]
            ? e.changedTouches[0].clientX
            : startX;
        var dx = endX - startX;
        if (Math.abs(dx) < 44) return;
        if (dx < 0) step(1);
        else step(-1);
      },
      { passive: true }
    );
  }

  setIndex(0);

  if (stackMq.addEventListener) {
    stackMq.addEventListener("change", function () {
      setIndex(index);
    });
  }

  window.refreshFounderStoryLabels = function () {
    labels = readLabels();
    setIndex(index);
  };
})();
