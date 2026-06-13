(function () {
  'use strict';

  var QUOTES = [
    {
      name: 'Lisa',
      age: 31,
      initial: 'L',
      theme: 'Schuldgevoel',
      role: 'Tester \u00b7 ADHD sinds haar twintigste',
      quote:
        'Eerlijk? Ik sloot voor het eerst in maanden een dag af zonder dat schuldgevoel om half tien. Alleen d\u00e1t was het al waard.',
    },
    {
      name: 'Sven',
      age: 34,
      initial: 'S',
      theme: 'Burn-out',
      role: 'Tester \u00b7 werkte 50 uur per week',
      quote:
        'Ik hing al maanden op de rand van een burn-out. E\u00e9n taak per dag klinkt belachelijk, maar het haalde de druk weg. Ik kom eindelijk weer boven water.',
    },
    {
      name: 'Sanne',
      age: 36,
      initial: 'S',
      theme: 'Cyclus',
      role: 'Tester \u00b7 moeder van twee',
      quote:
        'In mijn luteale fase was ik altijd knock-out. Nu past Structuro m\u2019n dag aan m\u2019n cyclus aan, en eindelijk voelt dat niet meer als falen.',
    },
  ];

  var mount = document.getElementById('landingTestimonialsMount');
  if (!mount) return;

  var active = 0;
  var tabsEl;
  var quoteEl;
  var nameEl;
  var roleEl;
  var initialEl;

  function build() {
    mount.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'vt-root';

    tabsEl = document.createElement('div');
    tabsEl.className = 'vt-tabs';
    tabsEl.setAttribute('role', 'tablist');
    tabsEl.setAttribute('aria-label', 'Thema testimonials');
    QUOTES.forEach(function (q, k) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vt-tab';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', k === active ? 'true' : 'false');
      btn.textContent = q.theme;
      btn.addEventListener('click', function () {
        if (active === k) return;
        active = k;
        sync();
      });
      tabsEl.appendChild(btn);
    });
    root.appendChild(tabsEl);

    var card = document.createElement('div');
    card.className = 'vt-card';

    var mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mark.setAttribute('width', '38');
    mark.setAttribute('height', '30');
    mark.setAttribute('viewBox', '0 0 40 32');
    mark.setAttribute('fill', 'none');
    mark.setAttribute('aria-hidden', 'true');
    mark.className.baseVal = 'vt-quote-mark';
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute(
      'd',
      'M0 32V18C0 8 6 1.5 16 0l2 5C12 7 9 10 9 14h7v18H0Zm22 0V18C22 8 28 1.5 38 0l2 5c-6 2-9 5-9 9h7v18H22Z'
    );
    path.setAttribute('fill', '#C9D8F8');
    mark.appendChild(path);
    card.appendChild(mark);

    quoteEl = document.createElement('p');
    quoteEl.className = 'vt-quote-text';
    card.appendChild(quoteEl);

    var footer = document.createElement('div');
    footer.className = 'vt-footer';

    initialEl = document.createElement('span');
    initialEl.className = 'vt-avatar';
    initialEl.setAttribute('aria-hidden', 'true');
    footer.appendChild(initialEl);

    var meta = document.createElement('div');
    nameEl = document.createElement('div');
    nameEl.className = 'vt-name';
    roleEl = document.createElement('div');
    roleEl.className = 'vt-role';
    meta.appendChild(nameEl);
    meta.appendChild(roleEl);
    footer.appendChild(meta);
    card.appendChild(footer);

    root.appendChild(card);
    mount.appendChild(root);
    sync();
  }

  function sync() {
    var q = QUOTES[active];
    if (!q) return;

    var tabs = tabsEl.querySelectorAll('.vt-tab');
    for (var i = 0; i < tabs.length; i++) {
      var on = i === active;
      tabs[i].classList.toggle('is-active', on);
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }

    quoteEl.textContent = q.quote;
    initialEl.textContent = q.initial;
    nameEl.textContent = q.name + ', ' + q.age;
    roleEl.textContent = q.role;
  }

  build();
})();
