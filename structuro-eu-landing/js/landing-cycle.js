(function () {
  'use strict';
  var CX = 180,
    CY = 180,
    OUTER_R = 152,
    INNER_R = 88,
    GAP = 2.5;
  var NS = 'http://www.w3.org/2000/svg';

  var PHASES = [
    {
      key: 'menstrual',
      startAngle: GAP,
      endAngle: 90 - GAP,
      color: '#EF4444',
      lightColor: '#FEF2F2',
      gradId: 'grad0',
      glowId: 'segGlow0',
      nl: { name: 'Menstruatie', days: 'Dag 1–5', sub: 'Lage dopamine, lage energie', str: 'Structuro: minder taken, meer rust' },
      en: { name: 'Menstrual', days: 'Day 1–5', sub: 'Low dopamine, low energy', str: 'Structuro: fewer tasks, more rest' },
      nlInfo: {
        adhd:
          'Oestrogeen en progesteron zijn op hun laagst. Dopamine-aanmaak daalt mee. Voor iemand met ADHD, die sowieso minder dopamine heeft, is dit vaak de zwaarste week van de cyclus.',
        voel:
          'Taken lijken onmogelijk groot. Emoties zijn moeilijker te reguleren, impulscontrole kan bijna afwezig voelen. Niet omdat je lui bent: je neurochemie zit er vaak gewoon niet in.',
        str: 'Maximaal 1 taak, zo klein mogelijk omschreven. Geen druk op afronding. Structuro telt rust ook als een goede dag.',
      },
      enInfo: {
        adhd:
          'Estrogen and progesterone are at their lowest. Dopamine production drops with them. For someone with ADHD who already has lower dopamine, this is often the hardest week of the cycle.',
        voel:
          'Tasks can feel impossibly large. Emotions may be harder to regulate, impulse control nearly absent. Not because you are lazy: your neurochemistry often just is not there.',
        str: 'Maximum 1 task, described as small as possible. No pressure to complete. Structuro counts rest as a good day too.',
      },
    },
    {
      key: 'follicular',
      startAngle: 90 + GAP,
      endAngle: 180 - GAP,
      color: '#16A34A',
      lightColor: '#F0FDF4',
      gradId: 'grad1',
      glowId: 'segGlow1',
      nl: { name: 'Folliculair', days: 'Dag 6–13', sub: 'Stijgende oestrogeen, herstellende focus', str: 'Structuro: gewone capaciteit' },
      en: { name: 'Follicular', days: 'Day 6–13', sub: 'Rising estrogen, focus returns', str: 'Structuro: regular capacity' },
      nlInfo: {
        adhd:
          'Stijgend oestrogeen trekt dopamine mee omhoog. Werkgeheugen en taakinitiatie verbeteren bij veel mensen merkbaar. Je brein begint weer te “werken”.',
        voel:
          'Meer energie, ideeën kunnen makkelijker komen, taken voelen haalbaarder. Dingen die vorige week zwaar waren, lukken nu vaak gewoon.',
        str: 'Gewone capaciteit, 2 à 3 taken zijn voor veel mensen haalbaar. Goede fase om taken aan te pakken die je al een tijdje uitstelt.',
      },
      enInfo: {
        adhd:
          'Rising estrogen brings dopamine with it. Working memory and task initiation often improve noticeably. Your brain starts “working” again.',
        voel:
          'More energy, ideas may come more easily, tasks can feel more manageable. Things that felt heavy last week often work out now.',
        str: 'Regular capacity, 2 or 3 tasks are manageable for many people. Good phase to tackle things you have been putting off.',
      },
    },
    {
      key: 'ovulation',
      startAngle: 180 + GAP,
      endAngle: 270 - GAP,
      color: '#D97706',
      lightColor: '#FFFBEB',
      gradId: 'grad2',
      glowId: 'segGlow2',
      nl: { name: 'Ovulatie', days: 'Dag 14', sub: 'Piek dopamine, hoogste helderheid', str: 'Structuro: ruimte voor zware taken' },
      en: { name: 'Ovulation', days: 'Day 14', sub: 'Peak dopamine, highest clarity', str: 'Structuro: room for hard tasks' },
      nlInfo: {
        adhd:
          'Oestrogeen piekt, dopamine en serotonine pieken mee. Executiefuncties zoals planning en focus zijn voor veel mensen op hun sterkst.',
        voel:
          'Vaak de beste dag van de maand. Taken die normaal wilskracht kosten, kunnen vanzelf gaan. Hoofd voelt helder, energie stabieler dan de rest van de cyclus.',
        str: 'Ruimte voor de zwaarste taak op je lijst. Plan lastige gesprekken of complexe taken op of rondom deze dag.',
      },
      enInfo: {
        adhd:
          'Estrogen peaks, and dopamine and serotonin peak with it. Executive functions like planning and focus are at their strongest for many people.',
        voel:
          'Often the best day of the month. Tasks that normally drain willpower can flow easily. Mind feels clear, energy more stable than the rest of the cycle.',
        str: 'Room for the hardest task on your list. Schedule difficult conversations or complex work on or around this day.',
      },
    },
    {
      key: 'luteal',
      startAngle: 270 + GAP,
      endAngle: 360 - GAP,
      color: '#7C3AED',
      lightColor: '#F5F3FF',
      gradId: 'grad3',
      glowId: 'segGlow3',
      nl: { name: 'Luteaal', days: 'Dag 15–28', sub: 'Dalende oestrogeen, brain fog', str: 'Structuro: minder forceren, suggesties op maat' },
      en: { name: 'Luteal', days: 'Day 15–28', sub: 'Falling estrogen, brain fog', str: 'Structuro: less forcing, tailored suggestions' },
      nlInfo: {
        adhd:
          'Dalende oestrogeen vermindert de dopamine-buffering. PMS en ADHD kunnen elkaar versterken: prikkelbaarheid, rejection sensitivity en brain fog stapelen vaak op.',
        voel:
          'Dingen die je normaal aankan, kunnen je nu overweldigen. Bekende taken voelen soms ineens vreemd. Je raakt sneller gefrustreerd, ook over jezelf.',
        str: 'Taken terugschalen naar wat écht haalbaar is. Structuro geeft suggesties die bij deze fase passen. Jezelf forceren werkt bij velen averechts.',
      },
      enInfo: {
        adhd:
          'Falling estrogen reduces dopamine buffering. PMS and ADHD can amplify each other: irritability, rejection sensitivity and brain fog often stack up.',
        voel:
          'Things you normally handle can overwhelm you now. Familiar tasks may suddenly feel strange. You might get frustrated faster, yourself included.',
        str: "Scale back to what is truly manageable. Structuro gives suggestions suited to this phase. Forcing yourself often backfires.",
      },
    },
  ];

  function p2c(r, deg) {
    var rad = ((deg - 90) * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  }

  function arcPath(s, e, ro, ri) {
    var os = p2c(ro, s),
      oe = p2c(ro, e),
      ie = p2c(ri, e),
      is_ = p2c(ri, s);
    var laf = e - s > 180 ? 1 : 0;
    return (
      'M' +
      os.x.toFixed(2) +
      ',' +
      os.y.toFixed(2) +
      ' A' +
      ro +
      ',' +
      ro +
      ' 0 ' +
      laf +
      ',1 ' +
      oe.x.toFixed(2) +
      ',' +
      oe.y.toFixed(2) +
      ' L' +
      ie.x.toFixed(2) +
      ',' +
      ie.y.toFixed(2) +
      ' A' +
      ri +
      ',' +
      ri +
      ' 0 ' +
      laf +
      ',0 ' +
      is_.x.toFixed(2) +
      ',' +
      is_.y.toFixed(2) +
      'Z'
    );
  }

  var segGroup = document.getElementById('cycleSegments');
  var infoEl = document.getElementById('cycleInfo');
  if (!segGroup || !infoEl) return;

  var segPaths = [],
    cards = [],
    activeIdx = 0,
    manualIdx = null;

  PHASES.forEach(function (ph, i) {
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', arcPath(ph.startAngle, ph.endAngle, OUTER_R, INNER_R));
    path.setAttribute('fill', 'url(#' + ph.gradId + ')');
    path.setAttribute('opacity', '0.82');
    path.setAttribute('stroke', 'white');
    path.setAttribute('stroke-width', '2');
    path.style.cursor = 'pointer';
    path.style.transition = 'opacity 0.3s, transform 0.3s';
    path.style.transformOrigin = CX + 'px ' + CY + 'px';
    path.addEventListener('mouseenter', function () {
      setActive(i, true);
    });
    path.addEventListener('mouseleave', function () {
      if (manualIdx !== i) setActive(activeIdx, false);
    });
    path.addEventListener('click', function () {
      manualIdx = manualIdx === i ? null : i;
      setActive(i, manualIdx === i);
      try {
        if (window.posthog) posthog.capture('cycle_phase_clicked', { phase: ph.key });
      } catch (e_) {}
    });
    segGroup.appendChild(path);
    segPaths.push(path);
  });

  PHASES.forEach(function (ph, i) {
    var card = document.createElement('div');
    card.className = 'cycle-phase-card';
    card.style.setProperty('--phase-color', ph.color);
    card.style.setProperty('--phase-light', ph.lightColor);
    card.innerHTML =
      '<div class="cycle-phase-header">' +
      '<div class="cycle-phase-dot"></div>' +
      '<span class="cycle-phase-name"></span>' +
      '<span class="cycle-phase-days"></span>' +
      '<button type="button" class="cycle-info-btn" aria-label="Meer info" aria-expanded="false" title="Meer info">ⓘ</button>' +
      '</div>' +
      '<div class="cycle-phase-sub"></div>' +
      '<div class="cycle-phase-structuro"></div>' +
      '<div class="cycle-phase-detail" hidden>' +
      '<div class="cycle-detail-block"><div class="cycle-detail-label cycle-dl-adhd"></div><div class="cycle-detail-text cycle-dt-adhd"></div></div>' +
      '<div class="cycle-detail-block"><div class="cycle-detail-label cycle-dl-voel"></div><div class="cycle-detail-text cycle-dt-voel"></div></div>' +
      '<div class="cycle-detail-block"><div class="cycle-detail-label cycle-dl-str"></div><div class="cycle-detail-text cycle-dt-str"></div></div>' +
      '<div class="cycle-detail-disclaimer cycle-dt-disc"></div>' +
      '</div>';
    card.addEventListener('click', function () {
      manualIdx = manualIdx === i ? null : i;
      setActive(i, manualIdx === i);
      try {
        if (window.posthog) posthog.capture('cycle_phase_clicked', { phase: ph.key });
      } catch (e_) {}
    });
    card.querySelector('.cycle-info-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      var detail = card.querySelector('.cycle-phase-detail');
      var isOpen = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      detail.hidden = isOpen;
      if (!isOpen) updateDetailText(card, i);
    });
    infoEl.appendChild(card);
    cards.push(card);
  });

  function updateDetailText(card, idx) {
    var lang = window.currentLang || 'nl';
    var info = lang === 'en' ? PHASES[idx].enInfo : PHASES[idx].nlInfo;
    var lbl =
      lang === 'en'
        ? ['ADHD + phase', 'Often experienced', 'In Structuro']
        : ['ADHD + fase', 'Vaak voorkomend', 'In Structuro'];
    var disc =
      lang === 'en'
        ? 'Every cycle is different. You know your own pattern best.'
        : 'Elke cyclus is anders. Jij kent jouw patroon het best.';
    card.querySelector('.cycle-dl-adhd').textContent = lbl[0];
    card.querySelector('.cycle-dl-voel').textContent = lbl[1];
    card.querySelector('.cycle-dl-str').textContent = lbl[2];
    card.querySelector('.cycle-dt-adhd').textContent = info.adhd;
    card.querySelector('.cycle-dt-voel').textContent = info.voel;
    card.querySelector('.cycle-dt-str').textContent = info.str;
    card.querySelector('.cycle-dt-disc').textContent = disc;
  }

  window.updateCycleText = function (lang) {
    lang = lang || window.currentLang || 'nl';
    PHASES.forEach(function (ph, i) {
      var d = lang === 'en' ? ph.en : ph.nl;
      var card = cards[i];
      if (!card) return;
      card.querySelector('.cycle-phase-name').textContent = d.name;
      card.querySelector('.cycle-phase-days').textContent = d.days;
      card.querySelector('.cycle-phase-sub').textContent = d.sub;
      card.querySelector('.cycle-phase-structuro').textContent = d.str;
      var detail = card.querySelector('.cycle-phase-detail');
      if (detail && !detail.hidden) updateDetailText(card, i);
    });
    var c2 = document.getElementById('cycleCenter2');
    if (c2) c2.textContent = lang === 'en' ? '28 days' : '28 dagen';
  };

  function setActive(idx, highlight) {
    activeIdx = idx;
    segPaths.forEach(function (p, i) {
      if (i === idx) {
        p.setAttribute('opacity', highlight ? '1' : '0.92');
        if (highlight) {
          p.setAttribute('filter', 'url(#' + PHASES[i].glowId + ')');
          p.style.transform = 'scale(1.05)';
        } else {
          p.removeAttribute('filter');
          p.style.transform = '';
        }
      } else {
        p.setAttribute('opacity', highlight ? '0.5' : '0.78');
        p.removeAttribute('filter');
        p.style.transform = '';
      }
    });
    cards.forEach(function (c, i) {
      c.classList.toggle('active', i === idx);
    });
    var c1 = document.getElementById('cycleCenter1');
    if (c1) {
      var lang = window.currentLang || 'nl';
      c1.textContent = lang === 'en' ? PHASES[idx].en.name : PHASES[idx].nl.name;
    }
  }

  var animRunning = false,
    animDeg = PHASES[0].startAngle + 1;
  var lastTs = null,
    animReq = null;
  var CYCLE_MS = 11000;

  function updateIndicator(deg) {
    var pos = p2c(OUTER_R + 17, deg);
    var el = document.getElementById('cycleIndicator');
    if (el) el.setAttribute('transform', 'translate(' + pos.x.toFixed(1) + ',' + pos.y.toFixed(1) + ')');
  }

  function degToPhase(deg) {
    var d = ((deg % 360) + 360) % 360;
    for (var i = 0; i < PHASES.length; i++) {
      if (d >= PHASES[i].startAngle - 1 && d <= PHASES[i].endAngle + 1) return i;
    }
    return Math.round(d / 90) % 4;
  }

  function animFrame(ts) {
    if (!animRunning) return;
    if (!lastTs) lastTs = ts;
    var dt = ts - lastTs;
    lastTs = ts;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animDeg += (dt / CYCLE_MS) * 360;
      if (animDeg >= 360) animDeg -= 360;
    }
    updateIndicator(animDeg);
    if (manualIdx === null) {
      var phIdx = degToPhase(animDeg);
      if (phIdx !== activeIdx) setActive(phIdx, false);
    }
    animReq = requestAnimationFrame(animFrame);
  }

  function startAnim() {
    if (animRunning) return;
    animRunning = true;
    lastTs = null;
    animReq = requestAnimationFrame(animFrame);
  }
  function stopAnim() {
    animRunning = false;
    if (animReq) {
      cancelAnimationFrame(animReq);
      animReq = null;
    }
  }

  var sectionEl = document.getElementById('voor-vrouwen');
  var sectionTracked = false;
  if (sectionEl && window.IntersectionObserver) {
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            startAnim();
            if (!sectionTracked) {
              sectionTracked = true;
              try {
                if (window.posthog) posthog.capture('section_viewed', { section: 'voor_vrouwen' });
              } catch (_) {}
            }
          } else {
            stopAnim();
          }
        });
      },
      { threshold: 0.2 }
    ).observe(sectionEl);
  }

  var waaromEl = document.getElementById('waarom-nodig');
  var waaromTracked = false;
  if (waaromEl && window.IntersectionObserver) {
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !waaromTracked) {
            waaromTracked = true;
            try {
              if (window.posthog) posthog.capture('section_viewed', { section: 'waarom_nodig' });
            } catch (_) {}
          }
        });
      },
      { threshold: 0.5 }
    ).observe(waaromEl);
  }

  function init() {
    var lang = window.currentLang || localStorage.getItem('structuro_lang') || 'nl';
    window.updateCycleText(lang);
    updateIndicator(animDeg);
    setActive(0, false);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
