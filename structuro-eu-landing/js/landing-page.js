// Hero phone slideshow (desktop + mobile in sync)
let heroIdx = 0;
const heroSlidesDesktop = document.querySelectorAll('.hero-slide-desktop');
const heroDotsDesktop = document.querySelectorAll('.hero-dot-desktop');
const heroSlidesMobile = document.querySelectorAll('.hero-slide-mobile');
const heroDotsMobile = document.querySelectorAll('.hero-dot-mobile');
const heroSlideCount = Math.max(heroSlidesDesktop.length, heroSlidesMobile.length, 1);

function setHeroSlideAt(idx) {
  heroIdx = ((idx % heroSlideCount) + heroSlideCount) % heroSlideCount;
  heroSlidesDesktop.forEach((el, i) => el.classList.toggle('active', i === heroIdx));
  heroDotsDesktop.forEach((el, i) => el.classList.toggle('active', i === heroIdx));
  heroSlidesMobile.forEach((el, i) => el.classList.toggle('active', i === heroIdx));
  heroDotsMobile.forEach((el, i) => el.classList.toggle('active', i === heroIdx));
}

function goHeroSlide(n) { setHeroSlideAt(n); }
function goHeroSlideMobile(n) { setHeroSlideAt(n); }

if (heroSlidesMobile.length > 0) {
  setInterval(() => {
    if (window.matchMedia('(min-width: 901px)').matches) return;
    setHeroSlideAt(heroIdx + 1);
  }, 6000);
}

const navEl = document.getElementById('nav');
const onScroll = () => navEl.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Scroll reveal — fade only
const makeObserver = (threshold = 0.12) => new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io3d.unobserve(e.target);
    }
  });
}, { threshold });

const io3d = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io3d.unobserve(e.target);
    }
  });
}, { threshold: 0.10 });

// Generic sections
document.querySelectorAll('.reveal').forEach(el => io3d.observe(el));

// Mobiel: telefoon direct zichtbaar (geen wachten op scroll-reveal)
(function () {
  var mobilePhone = document.getElementById('heroPhoneMobile');
  if (mobilePhone && window.matchMedia('(max-width: 900px)').matches) {
    mobilePhone.classList.add('visible');
  }
})();

// Touch swipe op mobiele hero-slides
(function () {
  var slidesEl = document.getElementById('heroSlidesMobile');
  if (!slidesEl || !window.matchMedia('(max-width: 900px)').matches) return;
  var startX = 0;
  var tracking = false;
  slidesEl.addEventListener('touchstart', function (e) {
    if (!e.touches || !e.touches[0]) return;
    startX = e.touches[0].clientX;
    tracking = true;
  }, { passive: true });
  slidesEl.addEventListener('touchend', function (e) {
    if (!tracking) return;
    tracking = false;
    var endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : startX;
    var dx = endX - startX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setHeroSlideAt(heroIdx + 1);
    else setHeroSlideAt(heroIdx - 1);
  }, { passive: true });
})();

// Staggered children — observe each individually
const childObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      childObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.10 });

document.querySelectorAll('.step, .pricing-merged-card, .faq-item, .trust-grid > div').forEach(el => {
  childObserver.observe(el);
});

// ── i18n ──────────────────────────────────────────────────────────
const TRANSLATIONS = {
  nl: {
    nav_how: 'Hoe het werkt', nav_waarom: 'Waarom', nav_vrouwen: 'Cyclus', nav_why: 'Waarom anders', nav_price: 'Prijs',
    nav_login: 'Inloggen', nav_cta: 'Start gratis proefperiode',
    cta_try: 'Start gratis proefperiode',
    payment_trust_label: 'Veilig betalen via Stripe',
    hero_eyebrow: 'Voor ADHD-breinen die niet beginnen',
    hero_h1: 'Je weet wat je<br/>moet doen.<br/>Je <span class="stuck">begint</span> alleen niet.',
    hero_positioning: 'Al je taken blijven in Structuro staan.<span class="hero-positioning-gap" aria-hidden="true"></span>Dagstart kiest er maximaal drie voor vandaag.',
    hero_cta_note: 'Geen download. Zet op je homescreen als app.',
    hero_recognition: 'Herken je dit? Tik aan wat klopt →',
    media_eyebrow: 'Gezien in',
    peer_eyebrow: 'Wat anderen zeggen',
    badge1_title: 'Energie bepaalt workload', badge1_sub: 'Geen one-size-fits-all',
    badge2_title: 'Maximaal 3 taken per dag', badge2_sub: 'Bewust klein gehouden',
    trust_stat1_num: '100+',
    trust_stat1: "Gebouwd met ADHD'ers",
    trust_stat2_num: '95%',
    trust_stat2: 'herkende burn-out in interviews',
    trust_stat3_num: '0',
    trust_stat3: 'streaks, badges of achterstallig-meldingen',
    phones_eyebrow: 'Zo werkt je eerste dag',
    phones_h2: 'Drie stappen. Negentig seconden. Dan doen.',
    phones_lede: 'Geen account nodig om te begrijpen hoe Structuro anders is.',
    phone_step1_h: 'Hoe vol is je batterij?',
    phone_step1_p: 'Eerst je energie. Dan past Structuro de dag aan wat je brein aankan.',
    phone_step2_h: 'Kies max 3 taken',
    phone_step2_p: 'Structuro stelt voor, of jij kiest zelf. Geen eindeloze lijst.',
    phone_step3_h: 'Begin met één stap',
    phone_step3_p: 'Focus-modus met timer en microstappen. Klein genoeg om te starten.',
    phones_swipe_hint: 'Swipe door de stappen',
    hero_phone_mobile_eyebrow: 'Zo ziet Structuro eruit',
    hero_phone_mobile_lede: 'Kies je energie en probeer de dagstart.',
    loop_eyebrow: 'De dagelijkse loop', loop_h2: 'Geen overzicht. Een ritme.',
    loop_lede: 'Drie momenten per dag. Open, doen, afsluiten. Meer hoeft niet.',
    step1_sub: 'Energie check', step1_h3: 'Hoe vol is je batterij?',
    step1_p: 'Eerst energie. Dan past de dag zich aan.',
    step2_sub: 'Max 3 taken', step2_h3: 'Niet meer dan je brein aankan.',
    step2_p: '1 tot 3 taken vandaag. De rest blijft staan, zonder schuld.',
    step3_sub: 'Afsluiten', step3_h3: 'Klaar is klaar.',
    step3_p: 'Twee minuten. Leeg hoofd voor morgen.',
    live_demo_label: 'Probeer de volledige dagstart',
    live_demo_topbar: 'Dagstart',
    live_demo_energy_title: 'Hoe is je energie?',
    live_demo_choice_eyebrow: 'Vandaag',
    live_demo_choice_title: 'Wie kiest je taken?',
    live_demo_choice_sub: 'Structuro voor je laten denken, of liever zelf swipen?',
    live_demo_choice_structuro: 'Structuro kiest',
    live_demo_choice_structuro_sub: 'Suggesties op basis van energie',
    live_demo_choice_self: 'Zelf swipen',
    live_demo_choice_self_sub: 'Links weg, rechts houden',
    live_demo_suggest_eyebrow: 'Voor jou',
    live_demo_suggest_title: 'Dit stelt Structuro voor.',
    live_demo_switch_swipe: 'liever swipen',
    live_demo_accept: 'Start mijn dag →',
    live_demo_swipe_eyebrow: 'Vandaag',
    live_demo_swipe_title: 'Swipe wat past',
    live_demo_swipe_hint_skip: '← Niet vandaag',
    live_demo_swipe_hint_keep: 'Vandaag →',
    live_demo_swipe_done: 'Klaar →',
    live_demo_done_title: 'Dagstart afgerond.',
    live_demo_dashboard: 'Naar dashboard →',
    live_demo_reset: 'Opnieuw proberen',
    live_demo_restart: '↻ Demo opnieuw doorlopen',
    live_demo_cycle_label: 'Cyclus',
    live_demo_cycle_tracker: 'Cyclus tracker',
    live_demo_cycle_tracker_lede: 'Structuro houdt je cyclusfase bij en helpt je inschatten hoeveel je vandaag aankunt.',
    live_demo_cycle_more: 'Lees hoe cyclus en ADHD samenkomen →',
    energy_low: 'Laag', energy_normal: 'Normaal', energy_high: 'Hoog',
    verhalen_prompt: 'Wat levert het op dat Structuro anders werkt?',
    quote1_text: 'Eerlijk? Ik sloot voor het eerst in maanden een dag af zonder dat schuldgevoel om half tien. Alleen dát was het al waard.',
    quote1_name: 'Lisa, 31',
    quote1_sub: 'Tester · ADHD sinds haar twintigste',
    quote2_text: 'Ik hing al maanden op de rand van een burn-out. Eén taak per dag klinkt belachelijk, maar het haalde de druk weg. Ik kom eindelijk weer boven water.',
    quote2_name: 'Sven, 34',
    quote2_sub: 'Tester · werkte 50 uur per week',
    quote3_text: 'In mijn luteale fase was ik altijd knock-out. Nu past Structuro m\'n dag aan m\'n cyclus aan, en eindelijk voelt dat niet meer als falen.',
    quote3_name: 'Sanne, 36',
    quote3_sub: 'Tester · moeder van twee',
    psych_eyebrow: 'Waarom dit werkt',
    psych_h2: 'Welke hiervan ben jij?',
    psych_lede: 'Tik aan wat je herkent. Je krijgt precies het antwoord dat erbij hoort, en niets meer.',
    psych_tag1: 'Executief', psych_h3_1: 'Taakinitiatie',
    psych_p1: 'Weten wat je moet doen is niet hetzelfde als beginnen. Structuro maakt de eerste stap zo klein dat je brein geen weerstand hoeft te overwinnen.',
    psych_tag2: 'Cognitief', psych_h3_2: 'Werkgeheugen-overload',
    psych_p2: 'Een lange to-do lijst vreet werkgeheugen. Structuro toont maximaal drie taken, zodat je hoofd ruimte houdt om te doen in plaats van te onthouden.',
    psych_tag3: 'Dopamine', psych_h3_3: 'Energie en motivatie',
    psych_p3: 'ADHD-breinen hebben wisselende dopamine. Daarom start je dagstart met energie, niet met een vaste takenlijst die je overbelast.',
    psych_tag4: 'Tijd', psych_h3_4: 'Tijdblindheid',
    psych_p4: 'Als je geen intern klokje hebt, helpt een dagelijkse loop met afsluiting. Klaar is klaar, zonder schuld over wat je niet deed.',
    psych_tag5: 'Cyclus', psych_h3_5: 'Hormonen en focus',
    psych_p5: 'Oestrogeen en progesteron sturen dopamine mee. Structuro past je workload aan op je cyclusfase, zonder je te vergelijken met gisteren.',
    psych_tag6: 'Rust', psych_h3_6: 'Burn-out preventie',
    psych_p6: 'Chronische overprikkeling en schuld eten energie op. Minder keuzes per dag betekent minder beslismoeheid en meer herstel.',
    empathy_eyebrow: 'Klinkt dit bekend?',
    empathy_p1: 'Je hebt een to-do lijst van 47 items die je al drie weken niet aanraakt. Je weet precies wat je moet doen. Maar je begint niet.',
    empathy_p2: 'En aan het einde van de dag voel je je schuldig, niet omdat je lui bent, maar omdat je brein gewoon niet meewerkte.',
    waarom_sub: "Van de 50 ADHD'ers die we voor Structuro persoonlijk interviewden, vertelde 95% over burn-out: doorgemaakt, lopend, of net op de rand.",
    empathy_p4: 'Structuro lost geen burn-out op, maar het geeft je één werkbare dag tegelijk zonder het gevoel dat je de rest ook al had moeten doen.',
    vrouwen_eyebrow: 'Voor vrouwen',
    vrouwen_teaser_h2: 'Werkt mee met je cyclus',
    vrouwen_teaser_lede: 'Structuro past je dag aan op je fase. Geen algoritme dat voor je beslist.',
    vrouwen_teaser_link: 'Lees hoe cyclus en ADHD samenkomen',
    manifesto_eyebrow: 'Waarom anders', manifesto_h2: 'Geen weekplanner. Geen planboard. Bewust.',
    manifesto_p: 'Alles wat je ziet, bezet ruimte in je hoofd. Structuro verbergt de chaos zodat jij de rust hebt om te starten.',
    manifesto_not_title: 'Wat je niet vindt',
    manifesto_not1: 'Eindeloze takenlijsten', manifesto_not2: 'Kanban-borden',
    manifesto_not3: 'Streaks, levels, productiviteits-XP', manifesto_not4: 'Weekplanners vol vakjes',
    manifesto_not5: '"Achterstallig" als verwijt',
    manifesto_not6: 'Geen MS To Do, geen Todoist, geen Notion. Dat probeerde je al. Het lukte niet.',
    manifesto_yes_title: 'Wat je wel vindt',
    manifesto_yes1: 'Één taak die er nu toe doet',
    manifesto_yes2: 'De eerste stap zo klein dat je geen excuus hebt',
    manifesto_yes3: 'Een afsluitritueel dat je hoofd leegt',
    founder_beat1_label: 'De maker',
    founder_beat1_h: 'Ik ben Niels. Ik heb ADHD. En ik bouw <span class="brand-accent">Structuro</span>.',
    founder_beat2_label: 'De clash',
    founder_beat2_h: 'Trots op mijn brein.',
    founder_beat2_p1: 'En vanochtend liep ik <em>vast</em> op één mail.',
    founder_beat2_p2: '<strong>Allebei waar.</strong> Op dezelfde dag.',
    founder_beat3_label: 'De conclusie',
    founder_beat3_h: 'Elk brein is <em>mooi</em>. Maar niet elk systeem past.',
    founder_beat3_p: 'Daarom bouwen wij Structuro, voor het brein dat je al hebt.',
    founder_label_maker: 'De maker',
    founder_label_clash: 'De clash',
    founder_label_conclusion: 'De conclusie',
    founder_role: 'Niels, founder met ADHD',
    pricing_eyebrow: 'Prijs', pricing_h2: 'Eerlijk. Eén prijs.',
    pricing_lede: '3 dagen gratis uitproberen. Daarna €12,99 per maand.',
    pricing_yearly_prompt: 'Liever jaarlijks?',
    pricing_yearly_link: '€119/jaar, bijna 3 maanden gratis →',
    money_back_title: 'Werkt het niet? Geld terug, geen vragen.',
    price_trial_badge: '3 dagen gratis',
    price_monthly_label: 'Maandelijks', price_monthly_period: '/ maand',
    price_monthly_sub: '3 dagen gratis · daarna pas betalen',
    price_feat1: 'Eén dagelijkse loop, geen systeem om bij te houden', price_feat2: 'Micro-stappen die het blokkeren doorbreken',
    price_feat3: 'Taken gefilterd op jouw energie van vandaag', price_feat4: 'Afgestemd op het ADHD-brein, inclusief de vrouwelijke cyclus',
    price_feat5: 'Eindelijk rust in je hoofd. Elke dag opnieuw.',
    price_available: 'Start je eerste dag',
    price_trust_line: '3 dagen gratis · 14 dagen niet goed, geld terug · Opzegbaar via Instellingen',
    pricing_compare_lead: 'Goedkoper dan wat je vergeten bent op te zeggen:',
    pricing_compare_line1: 'Sportschool',
    pricing_compare_line2: 'Streaming',
    pricing_compare_line3: 'Software',
    pricing_compare_amount1: '€30',
    pricing_compare_amount2: '€13',
    pricing_compare_amount3: '€15',
    pricing_cancel_title: 'Wij helpen je opzeggen.',
    pricing_cancel_body: 'Je eerste taak kan een abonnement opzeggen zijn: in mini-stappen.',
    price_best_badge: 'Beste deal',
    price_yearly_label: 'Jaarlijks', price_yearly_period: '/ jaar',
    price_yearly_sub: '€9,92/mnd effectief',
    price_yearly_save: '24% korting',
    price_yearly_feat1: 'Alles uit het maandabonnement',
    price_yearly_feat2: 'Bijna 3 maanden gratis effectief',
    price_yearly_feat3: 'Prijs staat vast, ook als Structuro groeit',
    price_yearly_feat4: 'Eén jaarlijkse keuze, één ding minder om aan te denken',
    price_yearly_feat5: 'Als eerste toegang tot nieuwe functies, jij test wat anderen nog niet zien',
    faq_eyebrow: 'Vragen die je waarschijnlijk hebt', faq_h2: 'Eerlijke antwoorden.',
    faq1_q: 'Hoe werken proefperiode en geld-terug-garantie?',
    faq1_a: 'Je proefperiode duurt 3 dagen, gratis. Daarna betaal je pas als je doorgaat. Niet tevreden na je eerste betaling? Mail binnen 14 dagen naar info@structuro.eu met onderwerp \'Geld terug\'. Je hoort binnen één werkdag terug. Het bedrag staat meestal binnen 5 tot 10 werkdagen op je rekening.',
    faq2_q: 'Werkt dit ook als ik niet elke dag iets doe?',
    faq2_a: 'Ja. De app past zich aan jou aan, niet andersom. Sla een dag over, sla een week over, de app houdt geen score bij. Wanneer je terugkomt, begin je opnieuw met een schoon scherm.',
    faq3_q: 'Werkt dit als ik geen ADHD-diagnose heb?',
    faq3_a: 'Ja. Structuro is gebouwd voor ADHD-breinen, maar HSP, autisme of gewoon executie-issues werken ook. Als je vastloopt op beginnen, diagnose of niet, is dit voor jou.',
    faq4_q: 'Waarom geen klassieke planner of integraties?',
    faq4_a: 'Bewust weggelaten. Elke extra tool en elke losse melding is mentale ruis. Structuro houdt het bij vandaag beginnen, focussen en afsluiten.',
    faq5_q: 'Wat als ik mijn account wil verwijderen?',
    faq5_a: 'Ga naar Instellingen → Account → Verwijderen. Alle data wordt binnen 24 uur gewist. Geen formulieren, geen exit-vragenlijst.',
    faq6_q: 'Hoe gaan jullie om met mijn gegevens?',
    faq6_a: 'Servers in EU (Stockholm). Geen verkoop aan derden. Volledige privacy policy: <a href="/privacy/" style="color:var(--story-accent);">structuro.eu/privacy</a>.',
    faq7_q: 'Wat als het niet voor mij werkt?',
    faq7_a: 'Niet tevreden binnen 14 dagen? Mail info@structuro.eu met onderwerp \'Geld terug\'. Je hoort binnen één werkdag terug. Daarna kun je altijd opzeggen via Instellingen, zonder exit-vragenlijst.',
    faq8_q: 'Werkt dit als ik medicatie gebruik?',
    faq8_a: 'Ja. Structuro is geen vervanging voor behandeling, maar een executie-interface naast medicatie. Veel gebruikers combineren beide: medicatie helpt focussen, Structuro helpt beginnen en afsluiten.',
    faq9_q: 'Wat zie ik als ik de eerste keer inlog?',
    faq9_a: 'Je start met een korte onboarding. Structuro laat je in een paar stappen zien hoe energie, focuspunten en microstappen werken. Pas daarna land je op home voor je dagstart.',
    footer_eyebrow: 'Tot slot',
    footer_h2: 'Je brein verdient rust.<br/>Niet meer systemen.',
    footer_body: 'Je hoeft het niet elke dag perfect te doen. De app past zich aan jou aan, niet andersom. Beginnen is genoeg.',
    footer_cta_btn: 'Start je eerste dag',
    strip_live: 'Nu live',
    strip_refund: '14 dagen geld terug via mail',
    strip_stripe: 'Veilig betalen via Stripe',
    footer_made: 'Gemaakt in Nederland',
    footer_privacy: 'Privacy policy', footer_terms: 'Algemene voorwaarden',
  },
  en: {
    nav_how: 'How it works', nav_waarom: 'Why', nav_vrouwen: 'Cycle', nav_why: 'Why different', nav_price: 'Pricing',
    nav_login: 'Log in', nav_cta: 'Start free trial',
    cta_try: 'Start free trial',
    payment_trust_label: 'Secure checkout with Stripe',
    hero_eyebrow: 'For ADHD brains that don\u2019t start',
    hero_h1: 'You know what you<br/>need to do.<br/>You just don\'t <span class="stuck">start</span>.',
    hero_positioning: 'All your tasks stay in Structuro.<span class="hero-positioning-gap" aria-hidden="true"></span>Day start picks up to three for today.',
    hero_cta_note: 'No download. Add to your home screen like an app.',
    hero_recognition: 'Sound familiar? Tap what fits →',
    media_eyebrow: 'As seen in',
    peer_eyebrow: 'What others say',
    badge1_title: 'Energy drives your workload', badge1_sub: 'No one-size-fits-all',
    badge2_title: 'Max 3 tasks per day', badge2_sub: 'Intentionally small',
    trust_stat1_num: '100+',
    trust_stat1: 'Built with people with ADHD',
    trust_stat2_num: '95%',
    trust_stat2: 'recognized burnout in interviews',
    trust_stat3_num: '0',
    trust_stat3: 'streaks, badges, or overdue reminders',
    phones_eyebrow: 'How your first day works',
    phones_h2: 'Three steps. Ninety seconds. Then do.',
    phones_lede: 'No account needed to understand how Structuro is different.',
    phone_step1_h: 'How full is your battery?',
    phone_step1_p: 'Energy first. Then Structuro shapes the day to what your brain can handle.',
    phone_step2_h: 'Pick up to 3 tasks',
    phone_step2_p: 'Structuro suggests, or you choose yourself. No endless list.',
    phone_step3_h: 'Start with one step',
    phone_step3_p: 'Focus mode with timer and micro steps. Small enough to begin.',
    phones_swipe_hint: 'Swipe through the steps',
    hero_phone_mobile_eyebrow: 'This is what Structuro looks like',
    hero_phone_mobile_lede: 'Pick your energy and try the day start.',
    loop_eyebrow: 'The daily loop', loop_h2: 'No overview. A rhythm.',
    loop_lede: 'Three moments a day. Open, do, close. That\'s all it takes.',
    step1_sub: 'Energy check', step1_h3: 'How full is your battery?',
    step1_p: 'Energy first. Then the day adapts.',
    step2_sub: 'Max 3 tasks', step2_h3: 'No more than your brain can handle.',
    step2_p: '1 to 3 tasks today. The rest stays put, guilt-free.',
    step3_sub: 'Close out', step3_h3: 'Done is done.',
    step3_p: 'Two minutes. Clear head for tomorrow.',
    live_demo_label: 'Try the full day start',
    live_demo_topbar: 'Day start',
    live_demo_energy_title: 'How is your energy?',
    live_demo_choice_eyebrow: 'Today',
    live_demo_choice_title: 'Who picks your tasks?',
    live_demo_choice_sub: 'Let Structuro suggest, or swipe yourself?',
    live_demo_choice_structuro: 'Structuro picks',
    live_demo_choice_structuro_sub: 'Suggestions based on energy',
    live_demo_choice_self: 'Swipe yourself',
    live_demo_choice_self_sub: 'Left skip, right keep',
    live_demo_suggest_eyebrow: 'For you',
    live_demo_suggest_title: 'Structuro suggests this.',
    live_demo_switch_swipe: 'prefer swiping',
    live_demo_accept: 'Start my day →',
    live_demo_swipe_eyebrow: 'Today',
    live_demo_swipe_title: 'Swipe what fits',
    live_demo_swipe_hint_skip: '← Not today',
    live_demo_swipe_hint_keep: 'Today →',
    live_demo_swipe_done: 'Done →',
    live_demo_done_title: 'Day start complete.',
    live_demo_dashboard: 'Go to dashboard →',
    live_demo_reset: 'Try again',
    live_demo_restart: '↻ Restart the demo',
    live_demo_cycle_label: 'Cycle',
    live_demo_cycle_tracker: 'Cycle tracker',
    live_demo_cycle_tracker_lede: 'Structuro tracks your cycle phase and helps you gauge how much you can handle today.',
    live_demo_cycle_more: 'Read how cycle and ADHD connect →',
    energy_low: 'Low', energy_normal: 'Normal', energy_high: 'High',
    verhalen_prompt: 'What does Structuro do differently for you?',
    quote1_text: 'Honestly? For the first time in months I closed a day without that guilt at half past nine. That alone was worth it.',
    quote1_name: 'Lisa, 31',
    quote1_sub: 'Tester · ADHD since her twenties',
    quote2_text: 'I had been on the edge of burnout for months. One task a day sounds ridiculous, but it took the pressure off. I\'m finally coming up for air again.',
    quote2_name: 'Sven, 34',
    quote2_sub: 'Tester · worked 50 hours a week',
    quote3_text: 'In my luteal phase I was always wiped out. Now Structuro adapts my day to my cycle, and it finally doesn\'t feel like failing.',
    quote3_name: 'Sanne, 36',
    quote3_sub: 'Tester · mother of two',
    psych_eyebrow: 'Why this works',
    psych_h2: 'Which of these is you?',
    psych_lede: 'Tap what you recognise. You get exactly the answer that fits, and nothing more.',
    psych_tag1: 'Executive', psych_h3_1: 'Task initiation',
    psych_p1: 'Knowing what to do is not the same as starting. Structuro makes the first step small enough that your brain doesn\'t have to fight resistance.',
    psych_tag2: 'Cognitive', psych_h3_2: 'Working memory overload',
    psych_p2: 'A long to-do list eats working memory. Structuro shows at most three tasks, so your head has room to do instead of remember.',
    psych_tag3: 'Dopamine', psych_h3_3: 'Energy and motivation',
    psych_p3: 'ADHD brains have shifting dopamine. That\'s why day start begins with energy, not a fixed task list that overloads you.',
    psych_tag4: 'Time', psych_h3_4: 'Time blindness',
    psych_p4: 'If you don\'t have an internal clock, a daily loop with closure helps. Done is done, without guilt over what you didn\'t do.',
    psych_tag5: 'Cycle', psych_h3_5: 'Hormones and focus',
    psych_p5: 'Estrogen and progesterone steer dopamine too. Structuro adapts your workload to your cycle phase, without comparing you to yesterday.',
    psych_tag6: 'Rest', psych_h3_6: 'Burnout prevention',
    psych_p6: 'Chronic overstimulation and guilt drain energy. Fewer choices per day means less decision fatigue and more recovery.',
    empathy_eyebrow: 'Sound familiar?',
    empathy_p1: 'You have a to-do list of 47 items you haven\'t touched in three weeks. You know exactly what to do. But you don\'t start.',
    empathy_p2: 'And at the end of the day you feel guilty, not because you\'re lazy, but because your brain just wouldn\'t cooperate.',
    waarom_sub: 'Of the 50 people with ADHD we personally interviewed for Structuro, 95% talked about burnout: past, ongoing, or right on the edge.',
    empathy_p4: 'Structuro doesn\'t fix burnout, but it gives you one workable day at a time, without the feeling that you should have done the rest already.',
    vrouwen_eyebrow: 'For women',
    vrouwen_teaser_h2: 'Works with your cycle',
    vrouwen_teaser_lede: 'Structuro adapts your day to your phase. No algorithm deciding for you.',
    vrouwen_teaser_link: 'Read how cycle and ADHD connect',
    manifesto_eyebrow: 'Why different', manifesto_h2: 'No classic planner. No board. On purpose.',
    manifesto_p: 'Everything you see takes up space in your head. Structuro hides the chaos so you have the calm to start.',
    manifesto_not_title: 'What you won\'t find',
    manifesto_not1: 'Endless task lists', manifesto_not2: 'Kanban boards',
    manifesto_not3: 'Streaks, levels, productivity XP', manifesto_not4: 'Planners packed with dozens of slots',
    manifesto_not5: '"Overdue" as an accusation',
    manifesto_not6: 'No MS To Do, no Todoist, no Notion. You tried that. It did not work.',
    manifesto_yes_title: 'What you will find',
    manifesto_yes1: 'One task that matters right now',
    manifesto_yes2: 'A first step so small you have no excuse',
    manifesto_yes3: 'A closing ritual that clears your head',
    founder_beat1_label: 'The maker',
    founder_beat1_h: 'I\'m Niels. I have ADHD. And I build <span class="brand-accent">Structuro</span>.',
    founder_beat2_label: 'The clash',
    founder_beat2_h: 'Proud of my brain.',
    founder_beat2_p1: 'And this morning I got <em>stuck</em> on one email.',
    founder_beat2_p2: '<strong>Both true.</strong> On the same day.',
    founder_beat3_label: 'The conclusion',
    founder_beat3_h: 'Every brain is <em>beautiful</em>. But not every system fits.',
    founder_beat3_p: 'That\'s why we build Structuro, for the brain you already have.',
    founder_label_maker: 'The maker',
    founder_label_clash: 'The clash',
    founder_label_conclusion: 'The conclusion',
    founder_role: 'Niels, founder with ADHD',
    pricing_eyebrow: 'Pricing', pricing_h2: 'Fair. One price.',
    pricing_lede: '3 days free to try. Then €12.99 per month.',
    pricing_yearly_prompt: 'Prefer yearly?',
    pricing_yearly_link: '€119/year, almost 3 months free →',
    money_back_title: 'Not working? Full refund, no questions.',
    price_trial_badge: '3 days free',
    price_monthly_label: 'Monthly', price_monthly_period: '/ month',
    price_monthly_sub: '3 days free · pay only if you continue',
    price_feat1: 'One daily loop, no system to maintain', price_feat2: 'Micro-steps that break through what\'s blocking you',
    price_feat3: 'Tasks filtered to your energy today', price_feat4: 'Tuned for the ADHD brain, including the female cycle',
    price_feat5: 'Finally quiet in your head. Every day anew.',
    price_available: 'Start your first day',
    price_trust_line: '3-day free trial · 14-day money-back guarantee · Cancel in Settings',
    pricing_compare_lead: 'Cheaper than what you forgot to cancel:',
    pricing_compare_line1: 'Gym',
    pricing_compare_line2: 'Streaming',
    pricing_compare_line3: 'Software',
    pricing_compare_amount1: '€30',
    pricing_compare_amount2: '€13',
    pricing_compare_amount3: '€15',
    pricing_cancel_title: 'We help you cancel.',
    pricing_cancel_body: 'Your first task can be cancelling a subscription: in micro-steps.',
    price_best_badge: 'Best deal',
    price_yearly_label: 'Yearly', price_yearly_period: '/ year',
    price_yearly_sub: '€9.92/mo effective',
    price_yearly_save: '24% off',
    price_yearly_feat1: 'Everything in monthly',
    price_yearly_feat2: 'Almost 3 months free effectively',
    price_yearly_feat3: 'Price locked in, even as Structuro grows',
    price_yearly_feat4: 'One yearly choice, one less thing on your mind',
    price_yearly_feat5: 'Early access to new features, you test what others don\'t see yet',
    faq_eyebrow: 'Questions you probably have', faq_h2: 'Honest answers.',
    faq1_q: 'How do the free trial and money-back guarantee work?',
    faq1_a: 'Your trial lasts 3 days, free. You only pay if you continue after that. Not satisfied after your first payment? Email info@structuro.eu within 14 days with subject \'Refund\'. You hear back within one business day. The amount usually returns within 5 to 10 business days.',
    faq2_q: 'Does this work if I don\'t use it every day?',
    faq2_a: 'Yes. The app adapts to you, not the other way around. Skip a day, skip a week, the app keeps no score. When you come back, you start fresh.',
    faq3_q: 'Does this work without an ADHD diagnosis?',
    faq3_a: 'Yes. Structuro is built for ADHD brains, but HSP, autism, or plain executive function issues work too. If you get stuck on starting, with or without a diagnosis, this is for you.',
    faq4_q: 'Why no classic planner or integrations?',
    faq4_a: 'Left out on purpose. Every extra tool and stray notification is mental noise. Structuro sticks to starting today, focusing, and closing your day.',
    faq5_q: 'What if I want to delete my account?',
    faq5_a: 'Go to Settings → Account → Delete. All data is erased within 24 hours. No forms, no exit survey.',
    faq6_q: 'How do you handle my data?',
    faq6_a: 'Servers in the EU (Stockholm). No third-party sales. Full privacy policy: <a href="/privacy/" style="color:var(--story-accent);">structuro.eu/privacy</a>.',
    faq7_q: 'What if it doesn\'t work for me?',
    faq7_a: 'Not satisfied within 14 days? Email info@structuro.eu with subject \'Refund\'. You hear back within one business day. You can always cancel later in Settings, with no exit survey.',
    faq8_q: 'Does this work if I take medication?',
    faq8_a: 'Yes. Structuro is not a replacement for treatment, but an execution interface alongside medication. Many users combine both: medication helps focus, Structuro helps you start and close your day.',
    faq9_q: 'What do I see when I log in for the first time?',
    faq9_a: 'You start with a short onboarding. Structuro walks you through energy, focus points, and micro-steps in a few screens. Only then do you land on home for your day start.',
    footer_eyebrow: 'Finally',
    footer_h2: 'Your brain deserves rest.<br/>Not more systems.',
    footer_body: 'You don\'t have to get it perfect every day. The app adapts to you, not the other way around. Starting is enough.',
    footer_cta_btn: 'Start your first day',
    strip_live: 'Live now',
    strip_refund: '14-day refund via email',
    strip_stripe: 'Secure checkout with Stripe',
    footer_made: 'Made in the Netherlands',
    footer_privacy: 'Privacy policy', footer_terms: 'Terms & conditions',
  }
};

let currentLang = localStorage.getItem('structuro_lang') || 'nl';
window.currentLang = currentLang;

function setLang(lang) {
  currentLang = lang;
  window.currentLang = lang;
  localStorage.setItem('structuro_lang', lang);
  applyTranslations();
  if (typeof window.refreshLandingDynamic === 'function') window.refreshLandingDynamic();
  if (typeof window.refreshPreviewEnergyCopy === 'function') window.refreshPreviewEnergyCopy();
  if (typeof window.refreshLiveDemoCopy === 'function') window.refreshLiveDemoCopy();
  if (typeof window.refreshFounderStoryLabels === 'function') window.refreshFounderStoryLabels();
  if (typeof window.refreshZelftestCopy === 'function') window.refreshZelftestCopy();
  document.getElementById('btnNL').classList.toggle('active', lang === 'nl');
  document.getElementById('btnEN').classList.toggle('active', lang === 'en');
  document.documentElement.lang = lang;
}

function applyTranslations() {
  const t = TRANSLATIONS[currentLang];
  // Regular text nodes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.hasAttribute('data-cta-dynamic')) return;
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.innerHTML = t[key];
  });
  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key] !== undefined) el.placeholder = t[key];
  });
  const founderStory = document.getElementById('founderStory');
  if (founderStory) {
    if (t.founder_label_maker) founderStory.setAttribute('data-label-maker', t.founder_label_maker);
    if (t.founder_label_clash) founderStory.setAttribute('data-label-clash', t.founder_label_clash);
    if (t.founder_label_conclusion) founderStory.setAttribute('data-label-conclusion', t.founder_label_conclusion);
  }
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  setLang(currentLang);
});
