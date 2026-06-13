(function () {
  'use strict';

  var MAX = { low: 1, normal: 2, high: 3 };
  var ENERGY_COLOR = { low: '#10B981', normal: '#3B6BF7', high: '#8B5CF6' };
  var DEMO_CYCLE = { day: 14, length: 28, phase: 'ovulation', color: '#F59E0B' };

  var TASK_POOL = {
    nl: [
      { id: 't1', title: '10 min inbox scannen', minutes: 10 },
      { id: 't2', title: 'E-mail beantwoorden', minutes: 25 },
      { id: 't3', title: 'Boodschappenlijst maken', minutes: 15 },
      { id: 't4', title: 'Rapport afronden', minutes: 45 },
      { id: 't5', title: '10 min opruimen', minutes: 10 },
      { id: 't6', title: 'Belasting betalen', minutes: 20 },
    ],
    en: [
      { id: 't1', title: '10 min inbox scan', minutes: 10 },
      { id: 't2', title: 'Reply to emails', minutes: 25 },
      { id: 't3', title: 'Grocery list', minutes: 15 },
      { id: 't4', title: 'Finish report', minutes: 45 },
      { id: 't5', title: '10 min tidy up', minutes: 10 },
      { id: 't6', title: 'Pay taxes', minutes: 20 },
    ],
  };

  var COPY = {
    nl: {
      greeting: 'Goedemorgen',
      hints: {
        energy: 'Kies je energie. Tik op Cyclus rechtsboven voor je fase vandaag.',
        choice: 'Stap 2: laat Structuro voorstellen of swipe zelf.',
        suggested: 'Stap 3: haal weg wat niet past. Maximaal afhankelijk van je energie.',
        swipe: 'Stap 3: links overslaan, rechts houden. Stop als je genoeg hebt.',
        done: 'Dagstart opgeslagen. Zo eindigt de flow in de app.',
        home: 'Dit is je dashboard: één actieblok. De rest wacht.',
      },
      cyclePhase: 'Ovulatie',
      cycleDay: 'Dag 14/28',
      cycleBio: 'Veel mensen ervaren meer helderheid.',
      cycleTip:
        'Voel je je helder en energiek? Hoog kan passen. Voel je je toch rustiger? Middel of laag is prima.',
      matchMatch: 'Past bij je fase',
      matchSoftHigher: 'Hoger dan je fase aangeeft',
      matchSoftLower: 'Lager dan je fase aangeeft',
      matchStrong: 'Afwijkend van fasepatroon',
      suggestSubLow: 'Past bij lage energie. Max 1 taak.',
      suggestSubNormal: 'Past bij normale energie. Max 2 taken.',
      suggestSubHigh: 'Past bij hoge energie. Max 3 taken.',
      swipeSub: 'Swipe door je taken. Houd wat vandaag past.',
      noneSelected: 'Niks geselecteerd.',
      selectionMeta: function (n, cap, mins) {
        return n + '/' + cap + ' taken, ' + mins + ' min';
      },
      swipeMeta: function (kept, cap) {
        return kept + '/' + cap + ' plekken gevuld';
      },
      doneSummary: function (n, mins) {
        if (n === 0) return 'Geen taken vandaag, ook een keuze.';
        return n + (n === 1 ? ' taak' : ' taken') + ' · ' + mins + ' min totaal.';
      },
      heroLabel: 'Nu aan zet',
      today: 'Vandaag',
      heroSlots: function (n, cap) {
        return cap === 1 ? '1 taak vandaag' : n + ' van ' + cap + ' taken, 1 aan zet';
      },
      micro: 'Eerste stap: open je inbox',
      cta: 'Start focus',
      reset: 'Opnieuw proberen',
      swipeEmpty: 'Geen taken meer in de rij.',
    },
    en: {
      greeting: 'Good morning',
      hints: {
        energy: 'Pick your energy. Tap Cycle top-right for today\'s phase.',
        choice: 'Step 2: let Structuro suggest or swipe yourself.',
        suggested: 'Step 3: remove what does not fit. Max depends on your energy.',
        swipe: 'Step 3: skip left, keep right. Stop when you have enough.',
        done: 'Day start saved. This is how the flow ends in the app.',
        home: 'This is your dashboard: one action block. The rest waits.',
      },
      cyclePhase: 'Ovulation',
      cycleDay: 'Day 14/28',
      cycleBio: 'Many people experience more clarity.',
      cycleTip:
        'Feeling clear and energetic? High may fit. Feeling calmer? Medium or low is fine too.',
      matchMatch: 'Matches your phase',
      matchSoftHigher: 'Higher than your phase suggests',
      matchSoftLower: 'Lower than your phase suggests',
      matchStrong: 'Unusual for this phase',
      suggestSubLow: 'Fits low energy. Max 1 task.',
      suggestSubNormal: 'Fits normal energy. Max 2 tasks.',
      suggestSubHigh: 'Fits high energy. Max 3 tasks.',
      swipeSub: 'Swipe through your tasks. Keep what fits today.',
      noneSelected: 'Nothing selected.',
      selectionMeta: function (n, cap, mins) {
        return n + '/' + cap + ' tasks, ' + mins + ' min';
      },
      swipeMeta: function (kept, cap) {
        return kept + '/' + cap + ' slots filled';
      },
      doneSummary: function (n, mins) {
        if (n === 0) return 'No tasks today, also a choice.';
        return n + (n === 1 ? ' task' : ' tasks') + ' · ' + mins + ' min total.';
      },
      heroLabel: 'Up next',
      today: 'Today',
      heroSlots: function (n, cap) {
        return cap === 1 ? '1 task today' : n + ' of ' + cap + ' tasks, 1 up next';
      },
      micro: 'First step: open your inbox',
      cta: 'Start focus',
      reset: 'Try again',
      swipeEmpty: 'No more tasks in the queue.',
    },
  };

  var STEPS = ['energy', 'choice', 'tasks', 'done', 'home'];
  var PHASE_FOR_STEP = {
    energy: 'energy',
    choice: 'choice',
    tasks: null,
    done: 'done',
    home: 'home',
  };

  function lang() {
    return window.currentLang || 'nl';
  }

  function t() {
    return COPY[lang()] || COPY.nl;
  }

  function tasks() {
    return TASK_POOL[lang()] || TASK_POOL.nl;
  }

  function capture(event, props) {
    try {
      if (window.posthog && typeof window.posthog.capture === 'function') {
        window.posthog.capture(event, props || {});
      }
    } catch (_) {}
  }

  function batterySvg(level, filled, color) {
    var muted = '#ABB3C5';
    var frame = filled > 0 ? color : muted;
    var bars = '';
    for (var i = 0; i < 3; i++) {
      var on = i < filled;
      bars +=
        '<rect x="' + (3.5 + i * 6.2) + '" y="4.5" width="4.6" height="7" rx="1.2" fill="' +
        (on ? color : muted) +
        '"/>';
    }
    return (
      '<svg width="22" height="13" viewBox="0 0 28 16" fill="none" aria-hidden="true">' +
      '<rect x="1" y="2" width="22" height="12" rx="3" stroke="' + frame + '" stroke-width="1.5" fill="none"/>' +
      '<rect x="24" y="6" width="3" height="4" rx="1.2" fill="' + frame + '"/>' +
      bars +
      '</svg>'
    );
  }

  function energyToMedium(level) {
    if (level === 'normal') return 'medium';
    return level;
  }

  function getEnergyPhaseMatch(chosen) {
    var suggested = 'high';
    var rank = { low: 0, medium: 1, high: 2 };
    var chosenRank = rank[chosen] ?? 1;
    var suggestedRank = rank[suggested];
    var diff = chosenRank - suggestedRank;
    if (diff === 0) return { match: 'match' };
    if (Math.abs(diff) === 1) {
      return { match: 'soft', direction: diff > 0 ? 'higher' : 'lower' };
    }
    return { match: 'strong', direction: diff > 0 ? 'higher' : 'lower' };
  }

  function suggestSubForEnergy(energy) {
    var c = t();
    if (energy === 'low') return c.suggestSubLow;
    if (energy === 'high') return c.suggestSubHigh;
    return c.suggestSubNormal;
  }

  function defaultSuggestions(energy) {
    var cap = MAX[energy] || 2;
    return tasks().slice(0, cap);
  }

  function swipeQueueAll() {
    return tasks().slice();
  }

  function totalMinutes(list) {
    return list.reduce(function (sum, task) {
      return sum + task.minutes;
    }, 0);
  }

  function init() {
    var root = document.getElementById('liveDemo');
    if (!root) return;

    var els = {
      progress: document.getElementById('liveDemoProgress'),
      back: document.getElementById('liveDemoBack'),
      hint: document.getElementById('liveDemoHint'),
      greeting: document.getElementById('liveDemoGreeting'),
      battery: document.getElementById('liveDemoBatteryCore'),
      cycleBtn: document.getElementById('liveDemoCycleBtn'),
      cycleCard: document.getElementById('liveDemoCycleCard'),
      cyclePhase: document.getElementById('liveDemoCyclePhase'),
      cycleDay: document.getElementById('liveDemoCycleDay'),
      cycleBio: document.getElementById('liveDemoCycleBio'),
      cycleTip: document.getElementById('liveDemoCycleTip'),
      energyMatch: document.getElementById('liveDemoEnergyMatch'),
      phaseEnergy: document.getElementById('liveDemoPhaseEnergy'),
      phaseChoice: document.getElementById('liveDemoPhaseChoice'),
      phaseSuggested: document.getElementById('liveDemoPhaseSuggested'),
      phaseSwipe: document.getElementById('liveDemoPhaseSwipe'),
      phaseDone: document.getElementById('liveDemoPhaseDone'),
      phaseHome: document.getElementById('liveDemoPhaseHome'),
      suggestSub: document.getElementById('liveDemoSuggestSub'),
      taskList: document.getElementById('liveDemoTaskList'),
      selectionMeta: document.getElementById('liveDemoSelectionMeta'),
      accept: document.getElementById('liveDemoAccept'),
      switchSwipe: document.getElementById('liveDemoSwitchSwipe'),
      swipeSub: document.getElementById('liveDemoSwipeSub'),
      swipeCard: document.getElementById('liveDemoSwipeCard'),
      swipeMeta: document.getElementById('liveDemoSwipeMeta'),
      swipeDone: document.getElementById('liveDemoSwipeDone'),
      doneSummary: document.getElementById('liveDemoDoneSummary'),
      doneList: document.getElementById('liveDemoDoneList'),
      dashboard: document.getElementById('liveDemoDashboard'),
      heroTitle: document.getElementById('liveDemoHeroTitle'),
      heroSlots: document.getElementById('liveDemoHeroSlots'),
      heroLabel: document.getElementById('liveDemoHeroLabel'),
      todayLabel: document.getElementById('liveDemoTodayLabel'),
      micro: document.getElementById('liveDemoMicro'),
      cta: document.getElementById('liveDemoCta'),
      reset: document.getElementById('liveDemoReset'),
      restart: document.getElementById('liveDemoRestart'),
    };

    var state = {
      step: 'energy',
      taskMode: 'suggested',
      energy: null,
      choice: null,
      cycleOpen: false,
      selectedIds: [],
      keptTasks: [],
      swipeQueue: [],
      swipeIndex: 0,
      advanceTimer: null,
    };

    function renderBatteryIcons() {
      root.querySelectorAll('.live-demo-battery-icon').forEach(function (el) {
        var level = parseInt(el.getAttribute('data-battery-level') || '1', 10);
        var filled = parseInt(el.getAttribute('data-battery-filled') || String(level), 10);
        var color = el.getAttribute('data-battery-color') || '#3B6BF7';
        el.innerHTML = batterySvg(level, filled, color);
      });
    }

    function placeDemo() {
      var mountHero = document.getElementById('liveDemoMountHero');
      var mountHeroMobile = document.getElementById('liveDemoMountHeroMobile');
      var mountLoop = document.getElementById('liveDemoMountLoop');
      if (!mountLoop) return;
      var desktop = window.matchMedia('(min-width: 901px)').matches;
      var target = desktop ? mountHero : (mountHeroMobile || mountLoop);
      if (!target) return;
      target.appendChild(root);
      if (desktop || mountHeroMobile) {
        root.classList.add('live-demo--in-phone');
        root.classList.remove('live-demo--flat');
      } else {
        root.classList.remove('live-demo--in-phone');
        root.classList.add('live-demo--flat');
      }
    }

    function syncCyclePulse() {
      if (!els.cycleBtn) return;
      var seen = false;
      try {
        seen = sessionStorage.getItem('structuro_live_demo_cycle_seen') === '1';
      } catch (_) {}
      if (state.cycleOpen || seen) {
        els.cycleBtn.classList.remove('live-demo-cycle-btn--pulse');
      } else {
        els.cycleBtn.classList.add('live-demo-cycle-btn--pulse');
      }
    }


    function cap() {
      return MAX[state.energy] || 2;
    }

    function setProgress() {
      if (!els.progress) return;
      var current = STEPS.indexOf(state.step);
      els.progress.querySelectorAll('[data-step-dot]').forEach(function (dot) {
        var idx = STEPS.indexOf(dot.getAttribute('data-step-dot'));
        dot.classList.remove('active', 'done');
        if (idx < current) dot.classList.add('done');
        else if (idx === current) dot.classList.add('active');
      });
    }

    function hideAllPhases() {
      [
        els.phaseEnergy,
        els.phaseChoice,
        els.phaseSuggested,
        els.phaseSwipe,
        els.phaseDone,
        els.phaseHome,
      ].forEach(function (el) {
        if (el) el.hidden = true;
      });
    }

    function showPhase(name) {
      hideAllPhases();
      if (name === 'energy' && els.phaseEnergy) els.phaseEnergy.hidden = false;
      if (name === 'choice' && els.phaseChoice) els.phaseChoice.hidden = false;
      if (name === 'suggested' && els.phaseSuggested) els.phaseSuggested.hidden = false;
      if (name === 'swipe' && els.phaseSwipe) els.phaseSwipe.hidden = false;
      if (name === 'done' && els.phaseDone) els.phaseDone.hidden = false;
      if (name === 'home' && els.phaseHome) els.phaseHome.hidden = false;
    }

    function showHintForStep() {
      var c = t();
      var key = state.step === 'tasks' ? state.taskMode : state.step;
      if (els.hint) els.hint.textContent = c.hints[key] || c.hints.energy;
    }

    function updateBack() {
      if (!els.back) return;
      els.back.hidden = state.step === 'energy' || state.step === 'home';
    }

    function goTo(step, taskMode) {
      if (state.advanceTimer) {
        clearTimeout(state.advanceTimer);
        state.advanceTimer = null;
      }
      state.step = step;
      if (taskMode) state.taskMode = taskMode;
      if (step === 'energy') showPhase('energy');
      if (step === 'choice') showPhase('choice');
      if (step === 'tasks') showPhase(state.taskMode === 'swipe' ? 'swipe' : 'suggested');
      if (step === 'done') showPhase('done');
      if (step === 'home') showPhase('home');
      setProgress();
      updateBack();
      showHintForStep();
    }

    function renderCycleCard() {
      var c = t();
      if (els.cyclePhase) els.cyclePhase.textContent = c.cyclePhase;
      if (els.cycleDay) els.cycleDay.textContent = c.cycleDay;
      if (els.cycleBio) els.cycleBio.textContent = c.cycleBio;
      if (els.cycleTip) els.cycleTip.textContent = c.cycleTip;
      if (els.cycleCard) els.cycleCard.hidden = !state.cycleOpen;
      if (els.cycleBtn) els.cycleBtn.setAttribute('aria-expanded', state.cycleOpen ? 'true' : 'false');
      syncCyclePulse();
    }

    function renderEnergyMatch() {
      if (!els.energyMatch || !state.energy) {
        if (els.energyMatch) els.energyMatch.hidden = true;
        return;
      }
      var match = getEnergyPhaseMatch(energyToMedium(state.energy));
      var c = t();
      var label = c.matchMatch;
      var cls = 'live-demo-match--match';
      if (match.match === 'soft') {
        label = match.direction === 'higher' ? c.matchSoftHigher : c.matchSoftLower;
        cls = 'live-demo-match--soft';
      } else if (match.match === 'strong') {
        label = c.matchStrong;
        cls = 'live-demo-match--strong';
      }
      els.energyMatch.textContent = label;
      els.energyMatch.className = 'live-demo-match ' + cls;
      els.energyMatch.hidden = false;
    }

    function renderSuggested() {
      var pool = defaultSuggestions(state.energy);
      var c = t();
      if (els.suggestSub) els.suggestSub.textContent = suggestSubForEnergy(state.energy);
      if (!els.taskList) return;
      els.taskList.innerHTML = '';
      pool.forEach(function (task) {
        var on = state.selectedIds.indexOf(task.id) !== -1;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'live-demo-task-row' + (on ? ' on' : ' off');
        btn.setAttribute('data-task-id', task.id);
        btn.innerHTML =
          '<span class="live-demo-task-check" aria-hidden="true">' +
          (on ? '✓' : '') +
          '</span><span class="live-demo-task-title"></span><span class="live-demo-task-mins"></span>';
        btn.querySelector('.live-demo-task-title').textContent = task.title;
        btn.querySelector('.live-demo-task-mins').textContent = task.minutes + 'm';
        btn.addEventListener('click', function () {
          toggleSuggested(task.id, pool);
        });
        els.taskList.appendChild(btn);
      });
      updateSuggestedMeta(pool);
    }

    function toggleSuggested(id, pool) {
      var capN = cap();
      var idx = state.selectedIds.indexOf(id);
      if (idx !== -1) {
        state.selectedIds.splice(idx, 1);
      } else if (state.selectedIds.length < capN) {
        state.selectedIds.push(id);
      }
      renderSuggested();
    }

    function updateSuggestedMeta(pool) {
      var c = t();
      var selected = pool.filter(function (task) {
        return state.selectedIds.indexOf(task.id) !== -1;
      });
      var mins = totalMinutes(selected);
      if (els.selectionMeta) {
        els.selectionMeta.textContent =
          selected.length === 0
            ? c.noneSelected
            : c.selectionMeta(selected.length, cap(), mins);
      }
      if (els.accept) els.accept.disabled = selected.length === 0;
    }

    function initSuggestedSelection() {
      state.selectedIds = defaultSuggestions(state.energy).map(function (t) {
        return t.id;
      });
      renderSuggested();
    }

    function renderSwipeCard() {
      var c = t();
      if (els.swipeSub) els.swipeSub.textContent = c.swipeSub;
      if (!els.swipeCard) return;
      var task = state.swipeQueue[state.swipeIndex];
      if (!task) {
        els.swipeCard.innerHTML =
          '<p class="live-demo-swipe-title">' + c.swipeEmpty + '</p>';
        return;
      }
      els.swipeCard.innerHTML =
        '<p class="live-demo-swipe-title"></p><p class="live-demo-swipe-mins"></p>';
      els.swipeCard.querySelector('.live-demo-swipe-title').textContent = task.title;
      els.swipeCard.querySelector('.live-demo-swipe-mins').textContent = task.minutes + ' min';
      updateSwipeMeta();
    }

    function updateSwipeMeta() {
      var c = t();
      if (els.swipeMeta) {
        els.swipeMeta.textContent = c.swipeMeta(state.keptTasks.length, cap());
      }
      if (els.swipeDone) {
        els.swipeDone.disabled = state.keptTasks.length === 0 && state.swipeIndex < state.swipeQueue.length;
      }
    }

    function initSwipe() {
      state.swipeQueue = swipeQueueAll();
      state.swipeIndex = 0;
      state.keptTasks = [];
      renderSwipeCard();
    }

    function swipeAction(keep) {
      var task = state.swipeQueue[state.swipeIndex];
      if (!task) return;
      if (keep && state.keptTasks.length < cap()) {
        state.keptTasks.push(task);
      }
      state.swipeIndex += 1;
      if (state.keptTasks.length >= cap()) {
        finishTasks(state.keptTasks);
        return;
      }
      if (state.swipeIndex >= state.swipeQueue.length) {
        finishTasks(state.keptTasks);
        return;
      }
      renderSwipeCard();
    }

    function finishTasks(picked) {
      state.keptTasks = picked.slice();
      renderDone();
      goTo('done');
      capture('live_demo_completed', {
        level: state.energy,
        max_tasks: cap(),
        task_count: picked.length,
        mode: state.taskMode,
      });
    }

    function renderDone() {
      var c = t();
      var n = state.keptTasks.length;
      var mins = totalMinutes(state.keptTasks);
      if (els.doneSummary) els.doneSummary.textContent = c.doneSummary(n, mins);
      if (!els.doneList) return;
      els.doneList.innerHTML = '';
      state.keptTasks.forEach(function (task) {
        var row = document.createElement('div');
        row.className = 'live-demo-done-item';
        row.innerHTML = '<span></span><span style="margin-left:auto;font-size:11px;color:#94A3B8"></span>';
        row.querySelector('span').textContent = task.title;
        row.querySelector('span:last-child').textContent = task.minutes + 'm';
        els.doneList.appendChild(row);
      });
      els.doneList.hidden = n === 0;
    }

    function renderHome() {
      var c = t();
      var first = state.keptTasks[0];
      if (els.heroTitle) els.heroTitle.textContent = first ? first.title : '';
      if (els.heroSlots) els.heroSlots.textContent = c.heroSlots(state.keptTasks.length, cap());
      if (els.heroLabel) els.heroLabel.textContent = c.heroLabel;
      if (els.todayLabel) els.todayLabel.textContent = c.today;
      if (els.micro) els.micro.textContent = c.micro;
      if (els.cta) els.cta.textContent = c.cta;
    }

    function pickEnergy(level) {
      state.energy = level;
      var color = ENERGY_COLOR[level] || ENERGY_COLOR.normal;
      if (els.battery) {
        els.battery.style.background =
          'radial-gradient(circle at 35% 30%,' + color + '88,' + color + '22 55%,transparent 75%)';
      }
      root.querySelectorAll('[data-live-energy]').forEach(function (b) {
        var on = b.getAttribute('data-live-energy') === level;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        var icon = b.querySelector('.live-demo-battery-icon');
        if (icon) {
          var lvl = parseInt(icon.getAttribute('data-battery-level') || '1', 10);
          var c = icon.getAttribute('data-battery-color') || '#3B6BF7';
          icon.innerHTML = batterySvg(lvl, on ? lvl : 0, on ? c : '#ABB3C5');
        }
      });
      renderEnergyMatch();
      capture('live_demo_energy', { level: level });
      state.advanceTimer = setTimeout(function () {
        goTo('choice');
      }, 520);
    }

    function pickChoice(choice) {
      state.choice = choice;
      capture('live_demo_choice', { choice: choice });
      if (choice === 'structuro') {
        state.taskMode = 'suggested';
        initSuggestedSelection();
        goTo('tasks', 'suggested');
      } else {
        state.taskMode = 'swipe';
        initSwipe();
        goTo('tasks', 'swipe');
      }
    }

    function acceptSuggested() {
      var pool = defaultSuggestions(state.energy);
      var picked = pool.filter(function (task) {
        return state.selectedIds.indexOf(task.id) !== -1;
      });
      finishTasks(picked);
    }

    function reset() {
      if (state.advanceTimer) clearTimeout(state.advanceTimer);
      state = {
        step: 'energy',
        taskMode: 'suggested',
        energy: null,
        choice: null,
        cycleOpen: false,
        selectedIds: [],
        keptTasks: [],
        swipeQueue: [],
        swipeIndex: 0,
        advanceTimer: null,
      };
      if (els.battery) {
        els.battery.style.background =
          'radial-gradient(circle at 35% 30%,rgba(245,158,11,.55),rgba(245,158,11,.15) 55%,transparent 75%)';
      }
      root.querySelectorAll('[data-live-energy]').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      if (els.energyMatch) els.energyMatch.hidden = true;
      renderCycleCard();
      goTo('energy');
    }

    function back() {
      if (state.step === 'choice') goTo('energy');
      else if (state.step === 'tasks') goTo('choice');
      else if (state.step === 'done') goTo('tasks', state.taskMode);
    }

    root.querySelectorAll('[data-live-energy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        pickEnergy(btn.getAttribute('data-live-energy'));
      });
    });

    root.querySelectorAll('[data-live-choice]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        pickChoice(btn.getAttribute('data-live-choice'));
      });
    });

    if (els.cycleBtn) {
      els.cycleBtn.addEventListener('click', function () {
        state.cycleOpen = !state.cycleOpen;
        try {
          sessionStorage.setItem('structuro_live_demo_cycle_seen', '1');
        } catch (_) {}
        syncCyclePulse();
        renderCycleCard();
        capture('live_demo_cycle_toggle', { open: state.cycleOpen });
      });
    }

    if (els.accept) els.accept.addEventListener('click', acceptSuggested);
    if (els.switchSwipe) {
      els.switchSwipe.addEventListener('click', function () {
        state.taskMode = 'swipe';
        initSwipe();
        goTo('tasks', 'swipe');
      });
    }

    root.querySelectorAll('[data-swipe]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        swipeAction(btn.getAttribute('data-swipe') === 'keep');
      });
    });

    if (els.swipeDone) {
      els.swipeDone.addEventListener('click', function () {
        finishTasks(state.keptTasks);
      });
    }

    if (els.dashboard) {
      els.dashboard.addEventListener('click', function () {
        renderHome();
        goTo('home');
        capture('live_demo_dashboard', {});
      });
    }

    if (els.back) els.back.addEventListener('click', back);
    if (els.reset) {
      els.reset.addEventListener('click', function () {
        reset();
        capture('live_demo_reset', {});
      });
    }
    if (els.restart) {
      els.restart.addEventListener('click', function () {
        reset();
        capture('live_demo_restart', {});
      });
    }

    window.refreshLiveDemoCopy = function () {
      var c = t();
      if (els.greeting) els.greeting.textContent = c.greeting;
      if (els.reset) els.reset.textContent = c.reset;
      renderCycleCard();
      renderBatteryIcons();
      syncCyclePulse();
      renderEnergyMatch();
      if (state.step === 'tasks' && state.taskMode === 'suggested') renderSuggested();
      if (state.step === 'tasks' && state.taskMode === 'swipe') renderSwipeCard();
      if (state.step === 'done') renderDone();
      if (state.step === 'home') renderHome();
      showHintForStep();
    };

    placeDemo();
    renderBatteryIcons();
    syncCyclePulse();
    window.addEventListener('resize', function () {
      placeDemo();
    });
    reset();
    window.refreshLiveDemoCopy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
