(function () {
  'use strict';

  var REASONS = [
    {
      tag: { nl: 'EXECUTIEF', en: 'EXECUTIVE' },
      title: { nl: 'Taakinitiatie', en: 'Task initiation' },
      short: {
        nl: 'Ik weet wát ik moet doen, ik begin alleen niet.',
        en: 'I know what I need to do. I just don\'t start.',
      },
      contentId: 'zelftest_taakinitiatie',
    },
    {
      tag: { nl: 'COGNITIEF', en: 'COGNITIVE' },
      title: { nl: 'Werkgeheugen-overload', en: 'Working memory overload' },
      short: {
        nl: 'Mijn hoofd zit vol, en een lange lijst maakt het erger.',
        en: 'My head is full, and a long list makes it worse.',
      },
      contentId: 'zelftest_werkgeheugen',
    },
    {
      tag: { nl: 'DOPAMINE', en: 'DOPAMINE' },
      title: { nl: 'Energie en motivatie', en: 'Energy and motivation' },
      short: {
        nl: 'De ene dag vlieg ik, de andere kom ik niet vooruit.',
        en: 'One day I fly, the next I get nowhere.',
      },
      contentId: 'zelftest_energie',
    },
    {
      tag: { nl: 'TIJD', en: 'TIME' },
      title: { nl: 'Tijdblindheid', en: 'Time blindness' },
      short: {
        nl: 'Ik voel tijd niet, een dag heeft geen begin of eind.',
        en: 'I don\'t feel time. A day has no beginning or end.',
      },
      contentId: 'zelftest_tijdblindheid',
    },
    {
      tag: { nl: 'CYCLUS', en: 'CYCLE' },
      title: { nl: 'Energie over de maand', en: 'Energy across the month' },
      short: {
        nl: 'Sommige weken werkt mijn brein anders.',
        en: 'Some weeks my brain works differently.',
      },
      contentId: 'zelftest_cyclus',
    },
    {
      tag: { nl: 'RUST', en: 'REST' },
      title: { nl: 'Burn-out preventie', en: 'Burnout prevention' },
      short: {
        nl: 'Te veel keuzes per dag en ik ben op.',
        en: 'Too many choices a day and I\'m done.',
      },
      contentId: 'zelftest_keuzestress',
    },
  ];

  function capturePh(event, props) {
    try {
      if (window.posthog && typeof window.posthog.capture === 'function') {
        window.posthog.capture(event, props || {}, { send_instantly: true });
      }
    } catch (e) {}
  }

  function lang() {
    return (window.currentLang || 'nl') === 'en' ? 'en' : 'nl';
  }

  function pick(field) {
    var L = lang();
    return field[L] || field.nl;
  }

  var mount = document.getElementById('landingZelftestMount');
  if (!mount) return;

  var picked = {};
  var rowsEl;

  function toggle(k) {
    picked[k] = !picked[k];
    capturePh('zelftest_recognition_toggled', {
      card_index: k,
      card_id: REASONS[k].contentId,
      recognized: picked[k],
      recognition_count: countPicked(),
      page_path: window.location.pathname || '/',
    });
    syncRow(k);
  }

  function countPicked() {
    var n = 0;
    for (var i = 0; i < REASONS.length; i++) {
      if (picked[i]) n++;
    }
    return n;
  }

  function syncRow(k) {
    var row = rowsEl.querySelector('[data-zt-row="' + k + '"]');
    if (!row) return;
    var on = !!picked[k];
    row.classList.toggle('is-on', on);
    var btn = row.querySelector('.zt-row-btn');
    if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function applyCopy() {
    if (!rowsEl) return;
    REASONS.forEach(function (r, k) {
      var row = rowsEl.querySelector('[data-zt-row="' + k + '"]');
      if (!row) return;
      var short = row.querySelector('.zt-row-short');
      if (short) short.textContent = pick(r.short);
    });
  }

  function build() {
    mount.innerHTML = '';
    rowsEl = document.createElement('div');
    rowsEl.className = 'zt-rows';

    REASONS.forEach(function (r, k) {
      var row = document.createElement('div');
      row.className = 'zt-row';
      row.setAttribute('data-zt-row', String(k));

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zt-row-btn';
      btn.setAttribute('aria-pressed', 'false');

      var check = document.createElement('span');
      check.className = 'zt-check';
      check.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      btn.appendChild(check);

      var short = document.createElement('span');
      short.className = 'zt-row-short';
      short.textContent = pick(r.short);
      btn.appendChild(short);

      btn.addEventListener('click', function () {
        toggle(k);
      });
      row.appendChild(btn);
      rowsEl.appendChild(row);
    });

    mount.appendChild(rowsEl);
  }

  build();

  window.refreshZelftestCopy = function () {
    applyCopy();
  };
})();
