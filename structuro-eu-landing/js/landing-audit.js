(function () {
  'use strict';

  function updateCtaCopy() {
    var lang = window.currentLang || 'nl';
    var fullText = lang === 'en' ? 'Start your first day' : 'Start je eerste dag';
    var navText = lang === 'en' ? 'Start free' : 'Start gratis';
    document.querySelectorAll('[data-cta-dynamic]').forEach(function (el) {
      el.textContent = el.closest('.nav-cta') ? navText : fullText;
    });
    document.querySelectorAll('.nav-cta').forEach(function (el) {
      el.setAttribute('aria-label', fullText);
    });
  }

  var ENERGY_COPY = {
    nl: {
      low: 'Met lage energie kiest Structuro één taak voor vandaag, omschreven zo klein mogelijk. We delen samen deze taak op in kleine stapjes.',
      normal: 'Met normale energie stel je 2 taken voor vandaag. Geen weekplan, geen schuld over wat je niet doet.',
      high: 'Met hoge energie kies je maximaal 3 taken. Ruimte voor het zwaarste op je lijst, zonder je brein te overladen.',
      prompt: 'Klik op een energieniveau en zie wat Structuro vandaag zou voorstellen.',
    },
    en: {
      low: 'With low energy, Structuro picks one task for today, described as small as possible. We break it down into small steps together.',
      normal: 'With normal energy, you choose 2 tasks for today. No week plan, no guilt about what you skip.',
      high: 'With high energy, you pick up to 3 tasks. Room for the hardest item on your list, without overloading your brain.',
      prompt: 'Click an energy level to see what Structuro would suggest today.',
    },
  };

  function initEnergyDemo() {
    var root = document.getElementById('energyDemo');
    if (!root) return;
    var result = document.getElementById('energyResult');
    var btns = root.querySelectorAll('[data-energy]');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        var level = btn.getAttribute('data-energy');
        var lang = window.currentLang || 'nl';
        var copy = ENERGY_COPY[lang] || ENERGY_COPY.nl;
        if (result) {
          result.textContent = copy[level] || copy.prompt;
          result.dataset.selected = '1';
          result.removeAttribute('data-i18n');
        }
        try {
          if (window.posthog) posthog.capture('energy_demo_clicked', { level: level });
        } catch (_) {}
      });
    });
  }

  window.refreshLandingDynamic = function () {
    updateCtaCopy();
    var lang = window.currentLang || 'nl';
    var copy = ENERGY_COPY[lang] || ENERGY_COPY.nl;
    var result = document.getElementById('energyResult');
    if (result && !result.dataset.selected) {
      result.textContent = copy.prompt;
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    updateCtaCopy();
    initEnergyDemo();
  });
})();
