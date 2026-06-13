(function () {
  'use strict';

  var ENERGY_META = {
    nl: {
      low: { tasks: '1 taak', hint: 'Met lage energie kiest Structuro één taak, zo klein mogelijk.' },
      normal: { tasks: '2 taken', hint: 'Met normale energie stel je 2 taken voor vandaag voor.' },
      high: { tasks: '3 taken', hint: 'Met hoge energie kies je maximaal 3 taken voor vandaag.' },
      prompt: 'Tik op een energieniveau in de telefoon.',
    },
    en: {
      low: { tasks: '1 task', hint: 'With low energy, Structuro picks one task, as small as possible.' },
      normal: { tasks: '2 tasks', hint: 'With normal energy, you choose 2 tasks for today.' },
      high: { tasks: '3 tasks', hint: 'With high energy, you pick up to 3 tasks for today.' },
      prompt: 'Tap an energy level on the phone.',
    },
  };

  function capturePreview(event, props) {
    try {
      if (window.posthog && typeof window.posthog.capture === 'function') {
        window.posthog.capture(event, props || {});
      }
    } catch (_) {}
  }

  function initCarousel() {
    var track = document.getElementById('phonesCarouselTrack');
    var dots = document.querySelectorAll('.phones-carousel-dot');
    if (!track || !dots.length) return;

    var slideEls = track.querySelectorAll('.phones-carousel-slide');
    var activeIdx = 0;
    var ticking = false;

    function setActiveDot(idx) {
      activeIdx = idx;
      dots.forEach(function (dot, i) {
        dot.classList.toggle('active', i === idx);
        dot.setAttribute('aria-current', i === idx ? 'true' : 'false');
      });
    }

    function indexFromScroll() {
      var slides = Array.prototype.slice.call(slideEls);
      if (!slides.length) return 0;
      var center = track.scrollLeft + track.clientWidth / 2;
      var best = 0;
      var bestDist = Infinity;
      slides.forEach(function (slide, i) {
        var mid = slide.offsetLeft + slide.offsetWidth / 2;
        var dist = Math.abs(center - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          var idx = indexFromScroll();
          if (idx !== activeIdx) setActiveDot(idx);
        });
      }
    }

    track.addEventListener('scroll', onScroll, { passive: true });

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var idx = parseInt(dot.getAttribute('data-slide'), 10);
        var target = slideEls[idx];
        if (!target) return;
        var left = target.offsetLeft - (track.clientWidth - target.offsetWidth) / 2;
        track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
        setActiveDot(idx);
      });
    });

    setActiveDot(0);
  }

  function initInteractiveEnergy() {
    var root = document.getElementById('previewEnergyInteractive');
    if (!root) return;

    var btns = root.querySelectorAll('[data-preview-energy]');
    var hintEl = document.getElementById('previewEnergyHint');
    var step2Hint = document.getElementById('previewStep2Dynamic');
    var selected = null;

    function lang() {
      return window.currentLang || 'nl';
    }

    function meta(level) {
      var copy = ENERGY_META[lang()] || ENERGY_META.nl;
      return copy[level] || copy.low;
    }

    function promptText() {
      var copy = ENERGY_META[lang()] || ENERGY_META.nl;
      return copy.prompt;
    }

    function refreshHints() {
      if (hintEl) {
        hintEl.textContent = selected ? meta(selected).hint : promptText();
      }
      if (step2Hint) {
        step2Hint.textContent = selected
          ? meta(selected).tasks
          : (lang() === 'en' ? 'Up to 3 tasks' : 'Max 3 taken');
      }
    }

    btns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var level = btn.getAttribute('data-preview-energy');
        btns.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        selected = level;
        refreshHints();
        capturePreview('preview_energy_selected', { level: level, surface: 'dagstart_preview' });
      });
    });

    window.refreshPreviewEnergyCopy = refreshHints;
    refreshHints();
  }

  function boot() {
    initCarousel();
    initInteractiveEnergy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
