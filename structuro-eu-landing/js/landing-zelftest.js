(function () {
  'use strict';

  var REASONS = [
    {
      tag: 'EXECUTIEF',
      title: 'Taakinitiatie',
      short: 'Ik weet w\u00e1t ik moet doen, ik begin alleen niet.',
      body: 'Weten wat je moet doen is niet hetzelfde als beginnen. Structuro maakt de eerste stap zo klein dat je brein geen weerstand hoeft te overwinnen.',
      contentId: 'zelftest_taakinitiatie',
    },
    {
      tag: 'COGNITIEF',
      title: 'Werkgeheugen-overload',
      short: 'Mijn hoofd zit vol, en een lange lijst maakt het erger.',
      body: 'Een lange to-do lijst vreet werkgeheugen. Structuro toont maximaal drie taken, zodat je hoofd ruimte houdt om te d\u00f3\u00e9n in plaats van te onthouden.',
      contentId: 'zelftest_werkgeheugen',
    },
    {
      tag: 'DOPAMINE',
      title: 'Energie en motivatie',
      short: 'De ene dag vlieg ik, de andere kom ik niet vooruit.',
      body: 'ADHD-breinen hebben wisselende dopamine. Daarom start je dagstart met energie, niet met een vaste takenlijst die je overbelast.',
      contentId: 'zelftest_energie',
    },
    {
      tag: 'TIJD',
      title: 'Tijdblindheid',
      short: 'Ik voel tijd niet, een dag heeft geen begin of eind.',
      body: 'Als je geen intern klokje hebt, helpt een dagelijkse loop met afsluiting. Klaar is klaar, zonder schuld over wat je niet deed.',
      contentId: 'zelftest_tijdblindheid',
    },
    {
      tag: 'CYCLUS',
      title: 'Hormonen en focus',
      short: 'Sommige weken werkt mijn brein gewoon anders.',
      body: 'Oestrogeen en progesteron sturen dopamine mee. Structuro past je workload aan op je cyclusfase, zonder je te vergelijken met gisteren.',
      contentId: 'zelftest_cyclus',
    },
    {
      tag: 'RUST',
      title: 'Burn-out preventie',
      short: 'Te veel keuzes per dag en ik ben op.',
      body: 'Chronische overprikkeling en schuld eten energie op. Minder keuzes per dag betekent minder beslismoeheid en meer herstel.',
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

  var mount = document.getElementById('landingZelftestMount');
  var stickyHost = document.getElementById('landingZelftestSticky');
  if (!mount || !stickyHost) return;

  var picked = {};
  var stickyEl;
  var dotsEl;
  var stickyTitleEl;
  var stickySubEl;
  var stickyCtaEl;
  var rowsEl;
  var lastPrimaryReason = null;

  function countPicked() {
    var n = 0;
    for (var k in picked) {
      if (picked[k]) n++;
    }
    return n;
  }

  function message(count) {
    if (count === 0) {
      return {
        t: 'Kies wat op jou van toepassing is',
        s: 'Je ziet per punt wat Structuro ermee doet.',
      };
    }
    if (count <= 2) {
      return { t: count + ' van 6 herkenbaar', s: 'Precies hiervoor is Structuro gebouwd.' };
    }
    if (count <= 4) {
      return {
        t: count + ' van 6 herkenbaar',
        s: 'Dit zijn stuk voor stuk de knelpunten die Structuro aanpakt.',
      };
    }
    return {
      t: count + ' van 6 herkenbaar',
      s: 'Meerdere punten? Dat is normaal bij ADHD.',
    };
  }

  function signupBridgeUrl(contentId) {
    if (typeof window.structuroSignupBridgeUrl === 'function') {
      return window.structuroSignupBridgeUrl(contentId);
    }
    return (
      'https://www.structuro.ai/start?utm_source=structuro_eu&utm_medium=organic&utm_campaign=website&utm_content=' +
      (contentId || 'zelftest_sticky') +
      '&campaign=weten&hero=A'
    );
  }

  function primaryReasonIndex() {
    if (lastPrimaryReason !== null && picked[lastPrimaryReason]) {
      return lastPrimaryReason;
    }
    for (var i = 0; i < REASONS.length; i++) {
      if (picked[i]) return i;
    }
    return null;
  }

  function stickyCtaLabel() {
    var lang = window.currentLang || 'nl';
    if (lang === 'en') return 'Start Structuro free';
    return 'Start Structuro gratis';
  }

  function stickyContentId() {
    var idx = primaryReasonIndex();
    if (idx === null) return 'zelftest_sticky';
    return REASONS[idx].contentId;
  }

  function syncSticky() {
    var count = countPicked();
    var msg = message(count);
    stickyEl.classList.toggle('is-filled', count > 0);
    stickyTitleEl.textContent = msg.t;
    stickySubEl.textContent = msg.s;

    if (stickyCtaEl) {
      stickyCtaEl.hidden = count === 0;
      stickyCtaEl.textContent = stickyCtaLabel();
      stickyCtaEl.href = signupBridgeUrl(stickyContentId());
      stickyCtaEl.setAttribute('data-ph-cta', stickyContentId());
    }

    var dots = dotsEl.querySelectorAll('.zt-dot');
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('is-on', !!picked[i]);
      dots[i].classList.toggle('is-idle-dark', count > 0 && !picked[i]);
    }
  }

  function syncRow(k) {
    var row = rowsEl.querySelector('[data-zt-row="' + k + '"]');
    if (!row) return;
    var on = !!picked[k];
    row.classList.toggle('is-on', on);
    var btn = row.querySelector('.zt-row-btn');
    var hint = row.querySelector('.zt-row-hint');
    var panelWrap = row.querySelector('.zt-row-panel-wrap');
    if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (hint) {
      hint.hidden = !on;
      hint.textContent = on ? 'Ja, dit ben ik' : '';
    }
    if (panelWrap) panelWrap.classList.toggle('is-open', on);
  }

  function toggle(k) {
    picked[k] = !picked[k];
    if (picked[k]) lastPrimaryReason = k;
    capturePh('zelftest_recognition_toggled', {
      card_index: k,
      card_id: REASONS[k].contentId,
      recognized: picked[k],
      recognition_count: countPicked(),
      page_path: window.location.pathname || '/',
    });
    syncRow(k);
    syncSticky();
  }

  function build() {
    stickyHost.innerHTML = '';
    mount.innerHTML = '';

    stickyEl = document.createElement('div');
    stickyEl.className = 'zt-sticky';

    dotsEl = document.createElement('div');
    dotsEl.className = 'zt-dots';
    for (var d = 0; d < REASONS.length; d++) {
      var dot = document.createElement('span');
      dot.className = 'zt-dot';
      dotsEl.appendChild(dot);
    }
    stickyEl.appendChild(dotsEl);

    var stickyCopy = document.createElement('div');
    stickyCopy.className = 'zt-sticky-copy';
    stickyTitleEl = document.createElement('div');
    stickyTitleEl.className = 'zt-sticky-title';
    stickySubEl = document.createElement('div');
    stickySubEl.className = 'zt-sticky-sub';
    stickyCopy.appendChild(stickyTitleEl);
    stickyCopy.appendChild(stickySubEl);
    stickyEl.appendChild(stickyCopy);

    stickyCtaEl = document.createElement('a');
    stickyCtaEl.className = 'zt-sticky-cta';
    stickyCtaEl.href = signupBridgeUrl('zelftest_sticky');
    stickyCtaEl.setAttribute('data-ph-cta', 'zelftest_sticky');
    stickyCtaEl.setAttribute('data-event', 'zelftest_sticky_cta_click');
    stickyCtaEl.textContent = stickyCtaLabel();
    stickyCtaEl.hidden = true;
    stickyCtaEl.addEventListener('click', function () {
      capturePh('zelftest_cta_clicked', {
        cta_id: stickyContentId(),
        recognition_count: countPicked(),
        page_path: window.location.pathname || '/',
      });
    });
    stickyEl.appendChild(stickyCtaEl);

    stickyHost.appendChild(stickyEl);

    rowsEl = document.createElement('div');
    rowsEl.className = 'zt-rows';

    REASONS.forEach(function (r, k) {
      var row = document.createElement('div');
      row.className = 'zt-row';
      row.setAttribute('data-zt-row', String(k));

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zt-row-btn';
      btn.setAttribute('aria-expanded', 'false');

      var check = document.createElement('span');
      check.className = 'zt-check';
      check.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      btn.appendChild(check);

      var short = document.createElement('span');
      short.className = 'zt-row-short';
      short.textContent = r.short;
      btn.appendChild(short);

      var hint = document.createElement('span');
      hint.className = 'zt-row-hint';
      hint.hidden = true;
      btn.appendChild(hint);

      btn.addEventListener('click', function () {
        toggle(k);
      });
      row.appendChild(btn);

      var panelWrap = document.createElement('div');
      panelWrap.className = 'zt-row-panel-wrap';
      var panel = document.createElement('div');
      panel.className = 'zt-row-panel';
      var inner = document.createElement('div');
      inner.className = 'zt-row-panel-inner';
      inner.innerHTML =
        '<div class="zt-panel-tag">STRUCTURO \u00b7 ' +
        r.tag +
        '</div>' +
        '<div class="zt-panel-title">' +
        r.title +
        '</div>' +
        '<p class="zt-panel-body">' +
        r.body +
        '</p>';
      panel.appendChild(inner);
      panelWrap.appendChild(panel);
      row.appendChild(panelWrap);

      rowsEl.appendChild(row);
    });

    mount.appendChild(rowsEl);
    syncSticky();
  }

  build();

  window.refreshZelftestCopy = function () {
    if (stickyCtaEl) stickyCtaEl.textContent = stickyCtaLabel();
  };
})();
