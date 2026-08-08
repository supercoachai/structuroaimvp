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
      nl: { name: 'Menstruatie', days: 'Dag 1–5', sub: 'Lage energie, meer rust', str: 'Structuro: minder taken, meer rust' },
      en: { name: 'Menstrual', days: 'Day 1–5', sub: 'Low energy, more rest', str: 'Structuro: fewer tasks, more rest' },
      nlInfo: {
        adhd:
          'Voor veel mensen voelt deze fase zwaarder: starten kost meer, en kleine taken kunnen groot lijken. Dat zegt niets over karakter. Het zegt iets over capaciteit vandaag.',
        voel:
          'Taken lijken onmogelijk groot. Emoties zijn lastiger te dragen. Niet omdat je lui bent: je batterij is gewoon lager.',
        str: 'Maximaal 1 taak, zo klein mogelijk omschreven. Geen druk op afronding. Structuro telt rust ook als een goede dag.',
      },
      enInfo: {
        adhd:
          'For many people this phase feels heavier: starting costs more, and small tasks can look huge. That is not character. It is capacity today.',
        voel:
          'Tasks can feel impossibly large. Emotions may be harder to carry. Not because you are lazy: your battery is simply lower.',
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
      nl: { name: 'Folliculair', days: 'Dag 6–13', sub: 'Energie komt terug', str: 'Structuro: gewone capaciteit' },
      en: { name: 'Follicular', days: 'Day 6–13', sub: 'Energy returns', str: 'Structuro: regular capacity' },
      nlInfo: {
        adhd:
          'Bij veel mensen komt focus en starten in deze fase makkelijker terug. Wat vorige week zwaar voelde, kan nu weer doenlijk zijn.',
        voel:
          'Meer energie, ideeën kunnen makkelijker komen, taken voelen haalbaarder. Dingen die vorige week zwaar waren, lukken nu vaak gewoon.',
        str: 'Gewone capaciteit, 2 à 3 taken zijn voor veel mensen haalbaar. Goede fase om taken aan te pakken die je al een tijdje uitstelt.',
      },
      enInfo: {
        adhd:
          'For many people focus and starting come back more easily in this phase. What felt heavy last week can feel doable again.',
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
      nl: { name: 'Ovulatie', days: 'Dag 14', sub: 'Vaak meer helderheid', str: 'Structuro: ruimte voor zware taken' },
      en: { name: 'Ovulation', days: 'Day 14', sub: 'Often more clarity', str: 'Structuro: room for hard tasks' },
      nlInfo: {
        adhd:
          'Voor veel mensen voelt starten en focussen rond deze dag het makkelijkst. Gebruik die ruimte als die er is, zonder er een regel van te maken.',
        voel:
          'Vaak een van de helderste dagen. Taken die normaal wilskracht kosten, kunnen soepeler gaan. Energie voelt stabieler.',
        str: 'Ruimte voor de zwaarste taak op je lijst. Plan lastige gesprekken of complexe taken op of rondom deze dag.',
      },
      enInfo: {
        adhd:
          'For many people starting and focusing feel easiest around this day. Use that room when it is there, without turning it into a rule.',
        voel:
          'Often one of the clearest days. Tasks that normally drain willpower can flow more easily. Energy feels more stable.',
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
      nl: { name: 'Luteaal', days: 'Dag 15–28', sub: 'Meer frictie, minder forceren', str: 'Structuro: minder forceren, suggesties op maat' },
      en: { name: 'Luteal', days: 'Day 15–28', sub: 'More friction, less forcing', str: 'Structuro: less forcing, tailored suggestions' },
      nlInfo: {
        adhd:
          'In deze fase stapelen prikkels en frictie zich sneller op. Bekende taken kunnen zwaarder voelen. Dat is geen terugval; het is context.',
        voel:
          'Dingen die je normaal aankan, kunnen je nu overweldigen. Bekende taken voelen soms ineens vreemd. Je raakt sneller gefrustreerd, ook over jezelf.',
        str: 'Taken terugschalen naar wat écht haalbaar is. Structuro geeft suggesties die bij deze fase passen. Jezelf forceren werkt bij velen averechts.',
      },
      enInfo: {
        adhd:
          'In this phase friction and overload stack faster. Familiar tasks can feel heavier. That is not a relapse; it is context.',
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
