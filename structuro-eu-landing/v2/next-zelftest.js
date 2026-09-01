(function () {
  'use strict';

  var REASONS = [
    {
      tag: { nl: 'EXECUTIEF', en: 'EXECUTIVE' },
      title: { nl: 'Taakinitiatie', en: 'Task initiation' },
      short: {
        nl: 'Ik weet wat ik moet doen, ik begin alleen niet.',
        en: 'I know what I need to do. I just don\'t start.',
      },
      body: {
        nl: 'Weten wat je moet doen is niet hetzelfde als beginnen. Structuro maakt de eerste stap zo klein dat je brein geen weerstand hoeft te overwinnen.',
        en: 'Knowing what to do is not the same as starting. Structuro makes the first step small enough that your brain doesn\'t have to fight resistance.',
      },
      moreHref: '/niet-kunnen-beginnen-adhd/',
      contentId: 'zelftest_taakinitiatie',
    },
    {
      tag: { nl: 'COGNITIEF', en: 'COGNITIVE' },
      title: { nl: 'Werkgeheugen-overload', en: 'Working memory overload' },
      short: {
        nl: 'Mijn hoofd zit vol, en een lange lijst maakt het erger.',
        en: 'My head is full, and a long list makes it worse.',
      },
      body: {
        nl: 'Een lange to-do lijst vreet werkgeheugen. Structuro toont maximaal drie taken. Dat is een ontwerpkeuze: minder op het scherm tegelijk.',
        en: 'A long to-do list eats working memory. Structuro shows at most three tasks. That is a design choice: less on screen at once.',
      },
      moreHref: '/takenlijst-te-lang-adhd/',
      contentId: 'zelftest_werkgeheugen',
    },
    {
      tag: { nl: 'DOPAMINE', en: 'DOPAMINE' },
      title: { nl: 'Energie en motivatie', en: 'Energy and motivation' },
      short: {
        nl: 'De ene dag vlieg ik, de andere kom ik niet vooruit.',
        en: 'One day I fly, the next I get nowhere.',
      },
      body: {
        nl: 'ADHD-breinen hebben wisselende dopamine. Daarom start je dagstart met energie, niet met een vaste takenlijst die je overbelast.',
        en: 'ADHD brains have shifting dopamine. That\'s why day start begins with energy, not a fixed task list that overloads you.',
      },
      moreHref: '/energie-first/',
      contentId: 'zelftest_energie',
    },
    {
      tag: { nl: 'TIJD', en: 'TIME' },
      title: { nl: 'Tijdblindheid', en: 'Time blindness' },
      short: {
        nl: 'Ik voel tijd niet, een dag heeft geen begin of eind.',
        en: 'I don\'t feel time. A day has no beginning or end.',
      },
      body: {
        nl: 'Als je geen intern klokje hebt, helpt een dagelijkse loop met afsluiting. Klaar is klaar, zonder schuld over wat je niet deed.',
        en: 'If you don\'t have an internal clock, a daily loop with closure helps. Done is done, without guilt over what you didn\'t do.',
      },
      moreHref: '/tijdblindheid-adhd/',
      contentId: 'zelftest_tijdblindheid',
    },
    {
      tag: { nl: 'CYCLUS', en: 'CYCLE' },
      title: { nl: 'Energie over de maand', en: 'Energy across the month' },
      short: {
        nl: 'Sommige weken werkt mijn brein anders.',
        en: 'Some weeks my brain works differently.',
      },
      body: {
        nl: 'Sommige weken voelt starten anders. Cyclus meenemen is optioneel: stille context naast je energie. Geen diagnose, geen sturing.',
        en: 'Some weeks starting feels different. Including your cycle is optional: quiet context next to your energy. No diagnosis, no steering.',
      },
      moreHref: '/cyclus/',
      contentId: 'zelftest_cyclus',
    },
    {
      tag: { nl: 'RUST', en: 'REST' },
      title: { nl: 'Burn-out preventie', en: 'Burnout prevention' },
      short: {
        nl: 'Te veel keuzes per dag en ik ben op.',
        en: 'Too many choices a day and I\'m done.',
      },
      body: {
        nl: 'Chronische overprikkeling en schuld eten energie op. Minder keuzes per dag betekent minder beslismoeheid en meer herstel.',
        en: 'Chronic overstimulation and guilt drain energy. Fewer choices per day means less decision fatigue and more recovery.',
      },
      moreHref: '/adhd-keuzestress/',
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

  function moreLabel() {
    return lang() === 'en' ? 'Read more' : 'Meer lezen';
  }

  var mount = document.getElementById('landingZelftestMount');
  if (!mount) return;

  var picked = {};
  var rowsEl;

  function isMobileAcc() {
    return true;
  }

  function countPicked() {
    var n = 0;
    for (var i = 0; i < REASONS.length; i++) {
      if (picked[i]) n++;
    }
    return n;
  }

  function panelHtml(r) {
    var more =
      r.moreHref
        ? '<a class="zt-panel-more" href="' +
          r.moreHref +
          '" data-ph-cta="' +
          r.contentId +
          '_meer">' +
          moreLabel() +
          '</a>'
        : '';
    return (
      '<p class="zt-panel-body">' +
      pick(r.body) +
      '</p>' +
      more
    );
  }

  function syncRow(k) {
    if (!rowsEl) return;
    var row = rowsEl.querySelector('[data-zt-row="' + k + '"]');
    if (!row) return;
    var on = !!picked[k];
    row.classList.toggle('is-on', on);
    var btn = row.querySelector('.zt-row-btn');
    var panelWrap = row.querySelector('.zt-row-panel-wrap');
    if (btn) {
      if (isMobileAcc()) {
        btn.removeAttribute('aria-pressed');
      } else {
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    if (panelWrap) panelWrap.classList.toggle('is-open', on);
  }

  function applyCopy() {
    if (!rowsEl) return;
    REASONS.forEach(function (r, k) {
      var row = rowsEl.querySelector('[data-zt-row="' + k + '"]');
      if (!row) return;
      var short = row.querySelector('.zt-row-short');
      if (short) short.textContent = pick(r.short);
      var inner = row.querySelector('.zt-row-panel-inner');
      if (inner) inner.innerHTML = panelHtml(r);
    });
  }

  function toggle(k, fromUser) {
    var nextOn = !picked[k];
    if (isMobileAcc() && nextOn) {
      for (var i = 0; i < REASONS.length; i++) {
        if (i !== k && picked[i]) {
          picked[i] = false;
          syncRow(i);
        }
      }
    }
    picked[k] = nextOn;
    if (fromUser) {
      capturePh('zelftest_recognition_toggled', {
        card_index: k,
        card_id: REASONS[k].contentId,
        recognized: picked[k],
        recognition_count: countPicked(),
        page_path: window.location.pathname || '/',
      });
    }
    syncRow(k);
  }

  function build() {
    mount.innerHTML = '';
    rowsEl = document.createElement('div');
    rowsEl.className = 'zt-rows';

    REASONS.forEach(function (r, k) {
      var row = document.createElement('div');
      row.className = 'zt-row';
      row.setAttribute('data-zt-row', String(k));

      var panelId = 'zt-panel-' + k;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zt-row-btn';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', panelId);
      if (!isMobileAcc()) btn.setAttribute('aria-pressed', 'false');

      var check = document.createElement('span');
      check.className = 'zt-check';
      check.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      btn.appendChild(check);

      var short = document.createElement('span');
      short.className = 'zt-row-short';
      short.textContent = pick(r.short);
      btn.appendChild(short);

      var icon = document.createElement('span');
      icon.className = 'zt-toggle';
      icon.setAttribute('aria-hidden', 'true');
      btn.appendChild(icon);

      btn.addEventListener('click', function () {
        toggle(k, true);
      });
      row.appendChild(btn);

      var panelWrap = document.createElement('div');
      panelWrap.className = 'zt-row-panel-wrap';
      panelWrap.id = panelId;
      var panel = document.createElement('div');
      panel.className = 'zt-row-panel';
      var inner = document.createElement('div');
      inner.className = 'zt-row-panel-inner';
      inner.innerHTML = panelHtml(r);
      panel.appendChild(inner);
      panelWrap.appendChild(panel);
      row.appendChild(panelWrap);

      rowsEl.appendChild(row);
    });

    mount.appendChild(rowsEl);
    if (isMobileAcc()) {
      toggle(0, false);
    }
  }

  build();

  window.refreshZelftestCopy = function () {
    applyCopy();
  };
})();
