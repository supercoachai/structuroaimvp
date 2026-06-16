(function () {
  'use strict';

  var QUOTES = [
    {
      name: 'Lisa',
      age: 31,
      initial: 'L',
      role: 'Tester \u00b7 ADHD sinds haar twintigste',
      quote:
        'Eerlijk? Ik sloot voor het eerst in maanden een dag af zonder dat schuldgevoel om half tien. Alleen d\u00e1t was het al waard.',
    },
    {
      name: 'Sven',
      age: 34,
      initial: 'S',
      role: 'Tester \u00b7 werkte 50 uur per week',
      quote:
        'Ik hing al maanden op de rand van een burn-out. E\u00e9n taak per dag klinkt belachelijk, maar het haalde de druk weg. Ik kom eindelijk weer boven water.',
    },
    {
      name: 'Sanne',
      age: 36,
      initial: 'S',
      role: 'Tester \u00b7 moeder van twee',
      quote:
        'In mijn luteale fase was ik altijd knock-out. Nu past Structuro m\u2019n dag aan m\u2019n cyclus aan, en eindelijk voelt dat niet meer als falen.',
    },
  ];

  var mount = document.getElementById('landingTestimonialsMount');
  if (!mount) return;

  var active = 0;
  var quoteEl;
  var nameEl;
  var roleEl;
  var initialEl;
  var prevBtn;
  var nextBtn;

  function build() {
    mount.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'vt-root';

    var carousel = document.createElement('div');
    carousel.className = 'vt-carousel';

    prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'vt-nav vt-nav--prev';
    prevBtn.setAttribute('aria-label', 'Vorige testimonial');
    prevBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>';
    prevBtn.addEventListener('click', function () {
      if (active > 0) {
        active -= 1;
        sync();
      }
    });

    nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'vt-nav vt-nav--next';
    nextBtn.setAttribute('aria-label', 'Volgende testimonial');
    nextBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';
    nextBtn.addEventListener('click', function () {
      if (active < QUOTES.length - 1) {
        active += 1;
        sync();
      }
    });

    var frame = document.createElement('div');
    frame.className = 'vt-frame';

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

    frame.appendChild(card);
    carousel.appendChild(prevBtn);
    carousel.appendChild(frame);
    carousel.appendChild(nextBtn);
    root.appendChild(carousel);
    mount.appendChild(root);
    sync();
  }

  function sync() {
    var q = QUOTES[active];
    if (!q) return;

    quoteEl.textContent = q.quote;
    initialEl.textContent = q.initial;
    nameEl.textContent = q.name + ', ' + q.age;
    roleEl.textContent = q.role;

    if (prevBtn) prevBtn.disabled = active === 0;
    if (nextBtn) nextBtn.disabled = active === QUOTES.length - 1;
  }

  build();
})();
