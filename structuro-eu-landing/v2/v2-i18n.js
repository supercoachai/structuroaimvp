/**
 * Client-side NL/EN for structuro.eu/v2.
 * Flag clicks switch copy on the page; they do not navigate to the app.
 */
(function () {
  var STORAGE_KEY = "structuro_lang";

  var T = {
    nl: {
      meta_title: "Structuro, rust voor je ADHD-brein",
      meta_desc:
        "Structuro kiest maximaal drie dingen voor vandaag. Jij bevestigt, en begint. Voor ADHD-breinen die niet beginnen.",
      nav_why: "Waarom",
      nav_how: "Hoe het werkt",
      nav_price: "Prijs",
      nav_faq: "FAQ",
      nav_login: "Inloggen",
      nav_cta: "Start 3 dagen gratis",
      lang_label: "Taal",
      menu: "Menu",
      hero_eyebrow: "Voor ADHD-breinen die niet beginnen",
      hero_h1: 'Je weet wat je moet doen.<br>Je <span class="it">begint</span> alleen niet.',
      hero_support:
        "Structuro kiest maximaal drie dingen voor vandaag. Jij bevestigt, en begint.",
      hero_secondary: "Bekijk hoe het werkt",
      hero_note: "3 dagen gratis. 14 dagen niet goed, geld terug. Stoppen kan altijd.",
      trust_aria: "Wat Structuro niet is",
      trust_1: "Geen planner",
      trust_2: "Elke dag fris, zonder schuld",
      trust_3: "Privacy in de EU",
      phone_stop: "Stoppen",
      phone_energy: "Kies je energie.",
      phone_low: "Laag",
      phone_ok: "Genoeg",
      phone_high: "Hoog",
      phone_feasible: "Twee dingen zijn haalbaar.",
      phone_suggest: "Structuro stelt voor:",
      phone_task1: "Aan dat ene project beginnen",
      phone_task2: "Eén glas water pakken",
      phone_confirm: "Dit is goed",
      phone_edit: "Zelf aanpassen",
      herken_eyebrow: "Waarom dit werkt",
      herken_h2: "Welke herken jij?",
      herken_support: "Tik aan wat klopt. Je ziet per punt wat Structuro ermee doet.",
      herken_cta: "Start Structuro gratis",
      herken_msg_few_s: "Precies hiervoor is Structuro gebouwd.",
      herken_msg_mid_s: "Dit zijn stuk voor stuk de knelpunten die Structuro aanpakt.",
      herken_msg_many_s: "Meerdere punten? Dat is normaal bij ADHD.",
      herken_of: "van",
      herken_recognizable: "herkenbaar",
      proof_eyebrow: "Wat anderen zeggen",
      proof_h2: "Herkenning, geen beloftes.",
      quote1:
        "ADHD is niet dat je niet weet wat je moet doen. Het is dat je niet kan starten. Eén taak voor me neerleggen, geen lijst van twintig, en ik begin.",
      quote1_role: "app developer",
      quote2:
        "Alles voelt even urgent en ik schat de tijd verkeerd in. Drie taken per dag. Meer krijg ik toch niet gedaan, maar nu voelt het haalbaar.",
      quote2_role: "zelfstandig professional",
      quote3:
        "Ik zit vast in mijn hoofd en kan er niet uit. De dagstart vraagt niet wat ik allemaal moet. Alleen wat de eerste stap is vandaag.",
      quote3_role: "ondernemer",
      loop_eyebrow: "De dagelijkse loop",
      loop_h2: "Geen overzicht. Een ritme.",
      loop_support: "Drie momenten per dag. Meer hoeft niet.",
      loop_1_n: "01 · Open",
      loop_1_b: "Hoe vol is je batterij?",
      loop_1_p: "Eerst energie. Dan past de dag zich aan.",
      loop_2_n: "02 · Doen",
      loop_2_b: "Niet meer dan je brein aankan.",
      loop_2_p: "Eén tot drie taken vandaag. De rest blijft staan, zonder schuld.",
      loop_3_n: "03 · Afsluiten",
      loop_3_b: "Klaar is klaar.",
      loop_3_p: "Twee minuten. Leeg hoofd voor morgen.",
      loop_link: "Lees hoe cyclus en ADHD samenkomen →",
      price_eyebrow: "Prijs",
      price_h2: "Eerlijk. Eén prijs.",
      price_period: "/maand",
      price_trial: "3 dagen gratis, daarna pas betalen.",
      price_feat1: "Geen lijst die groeit terwijl jij stilstaat",
      price_feat2: "Een eerste stap klein genoeg om echt te beginnen",
      price_feat3: "Je dag past zich aan hoe vol je batterij vandaag is",
      price_note_before: "14 dagen niet goed, geld terug. Liever jaarlijks?",
      price_yearly: "€119 per jaar",
      price_math: "Goedkoper dan wat je vergeet op te zeggen (€58 per maand)",
      price_math_1: "Vergeten sportschool",
      price_math_2: "Ongebruikte streaming",
      price_math_3: "Apps die je nooit opent",
      faq_eyebrow: "Vragen die je waarschijnlijk hebt",
      faq_h2: "Eerlijke antwoorden.",
      faq_planner_q: "Waarom geen klassieke planner of integraties?",
      faq_planner_a:
        "Klassieke planners gaan uit van overzicht en discipline. Structuro gaat uit van executie: één eerste stap, aangepast aan je energie. Minder systeem, meer beginnen.",
      faq_day_q: "Werkt dit ook als ik niet elke dag iets doe?",
      faq_day_a:
        "Ja. Er zijn geen streaks, badges of achterstallig-meldingen. Een dag overslaan is geen falen, morgen begint gewoon opnieuw.",
      faq_refund_q: "Hoe werken proefperiode en geld-terug-garantie?",
      faq_refund_a:
        "Je start met 3 dagen gratis, zonder verplichting. Daarna betaal je €12,99 per maand. Niet goed binnen 14 dagen? Je krijgt je geld terug, zonder gedoe.",
      faq_privacy_q: "Hoe gaan jullie om met mijn gegevens?",
      faq_privacy_a:
        "Je gegevens blijven van jou, opgeslagen binnen de EU. We verkopen niets door en je kunt alles op elk moment verwijderen.",
      faq_first_q: "Wat zie ik als ik de eerste keer inlog?",
      faq_first_a:
        "Eén vraag: hoe is je energie? Daarna stelt Structuro maximaal drie dingen voor. Jij bevestigt, en je dag is begonnen. Geen setup, geen lege lijsten.",
      faq_cycle_q: "Hoe komen cyclus en ADHD samen?",
      faq_cycle_a:
        'Sommige weken voelt je brein anders. Structuro houdt optioneel rekening met je cyclusfase: zachtere voorstellen in zwaardere weken, geen druk om meer te doen. Je zet het zelf aan in de app. Meer lezen? <a href="/cyclus/">Bekijk de cyclus-pagina</a>.',
      press_label: "Gezien in",
      press_quote: "“Eindelijk iets dat niet uitgaat van een neurotypisch brein.”",
      story_eyebrow: "Het verhaal achter Structuro",
      story_h2: 'Ik ben Niels. Ik heb ADHD. En ik bouw <span class="it">Structuro</span>.',
      story_p1:
        "Trots op mijn brein. En vanochtend liep ik vast op één mail. Allebei waar, op dezelfde dag.",
      story_p2:
        "Elke planner die ik probeerde ging uit van een brein dat ik niet heb. Dus bouwde ik, samen met honderd ADHD'ers, iets dat uitgaat van het brein dat je al hebt.",
      story_quote: 'Elk brein is <em>mooi</em>. Maar niet elk systeem past.',
      story_role: "Niels, founder met ADHD",
      story_alt: "Niels, maker van Structuro",
      slot_h2: 'Je brein verdient rust.<br>Niet meer <span class="it">systemen</span>.',
      slot_support:
        "Je hoeft het niet elke dag perfect te doen. De app past zich aan jou aan, niet andersom. Beginnen is genoeg.",
      sticky_note: "14 dagen niet goed, geld terug",
      footer_made: "Gemaakt in Nederland",
      footer_privacy: "Privacy policy",
      footer_terms: "Algemene voorwaarden",
      footer_cookies: "Cookies",
      hk0_tag: "EXECUTIEF",
      hk0_title: "Taakinitiatie",
      hk0_short: "Ik weet wát ik moet doen, ik begin alleen niet.",
      hk0_body:
        "Weten wat je moet doen is niet hetzelfde als beginnen. Structuro maakt de eerste stap zo klein dat je brein geen weerstand hoeft te overwinnen.",
      hk1_tag: "COGNITIEF",
      hk1_title: "Werkgeheugen-overload",
      hk1_short: "Mijn hoofd zit vol, en een lange lijst maakt het erger.",
      hk1_body:
        "Een lange to-do lijst vreet werkgeheugen. Structuro toont maximaal drie taken, zodat je hoofd ruimte houdt om te dóén in plaats van te onthouden.",
      hk2_tag: "DOPAMINE",
      hk2_title: "Energie en motivatie",
      hk2_short: "De ene dag vlieg ik, de andere kom ik niet vooruit.",
      hk2_body:
        "ADHD-breinen hebben wisselende dopamine. Daarom start je dagstart met energie, niet met een vaste takenlijst die je overbelast.",
      hk3_tag: "TIJD",
      hk3_title: "Tijdblindheid",
      hk3_short: "Ik voel tijd niet, een dag heeft geen begin of eind.",
      hk3_body:
        "Als je geen intern klokje hebt, helpt een dagelijkse loop met afsluiting. Klaar is klaar, zonder schuld over wat je niet deed.",
      hk4_tag: "CYCLUS",
      hk4_title: "Hormonen en focus",
      hk4_short: "Sommige weken werkt mijn brein gewoon anders.",
      hk4_body:
        "Oestrogeen en progesteron sturen dopamine mee. Structuro past je workload aan op je cyclusfase, zonder je te vergelijken met gisteren.",
      hk5_tag: "RUST",
      hk5_title: "Burn-out preventie",
      hk5_short: "Te veel keuzes per dag en ik ben op.",
      hk5_body:
        "Chronische overprikkeling en schuld eten energie op. Minder keuzes per dag betekent minder beslismoeheid en meer herstel.",
      hk_yes: "Ja, dit ben ik",
    },
    en: {
      meta_title: "Structuro, calm for your ADHD brain",
      meta_desc:
        "Structuro picks up to three things for today. You confirm, and start. For ADHD brains that don't begin.",
      nav_why: "Why",
      nav_how: "How it works",
      nav_price: "Pricing",
      nav_faq: "FAQ",
      nav_login: "Log in",
      nav_cta: "Start 3 days free",
      lang_label: "Language",
      menu: "Menu",
      hero_eyebrow: "For ADHD brains that don't start",
      hero_h1: 'You know what to do.<br>You just don\'t <span class="it">start</span>.',
      hero_support:
        "Structuro picks up to three things for today. You confirm, and begin.",
      hero_secondary: "See how it works",
      hero_note: "3 days free. 14-day money-back. Cancel anytime.",
      trust_aria: "What Structuro is not",
      trust_1: "Not a planner",
      trust_2: "Fresh start every day, no guilt",
      trust_3: "Privacy in the EU",
      phone_stop: "Stop",
      phone_energy: "Choose your energy.",
      phone_low: "Low",
      phone_ok: "Enough",
      phone_high: "High",
      phone_feasible: "Two things are doable.",
      phone_suggest: "Structuro suggests:",
      phone_task1: "Start that one project",
      phone_task2: "Get a glass of water",
      phone_confirm: "This looks good",
      phone_edit: "Adjust myself",
      herken_eyebrow: "Why this works",
      herken_h2: "Which feel familiar?",
      herken_support: "Tap what fits. You'll see what Structuro does with each one.",
      herken_cta: "Start Structuro free",
      herken_msg_few_s: "This is exactly what Structuro was built for.",
      herken_msg_mid_s: "These are the exact bottlenecks Structuro addresses.",
      herken_msg_many_s: "Multiple points? That's normal with ADHD.",
      herken_of: "of",
      herken_recognizable: "familiar",
      proof_eyebrow: "What others say",
      proof_h2: "Recognition, not promises.",
      quote1:
        "ADHD isn't not knowing what to do. It's not being able to start. Put one task in front of me, not a list of twenty, and I begin.",
      quote1_role: "app developer",
      quote2:
        "Everything feels equally urgent and I misjudge time. Three tasks a day. I won't get more done anyway, but now it feels doable.",
      quote2_role: "independent professional",
      quote3:
        "I'm stuck in my head and can't get out. The day start doesn't ask what I have to do. Only what the first step is today.",
      quote3_role: "founder",
      loop_eyebrow: "The daily loop",
      loop_h2: "Not an overview. A rhythm.",
      loop_support: "Three moments a day. That's enough.",
      loop_1_n: "01 · Open",
      loop_1_b: "How full is your battery?",
      loop_1_p: "Energy first. Then the day adapts.",
      loop_2_n: "02 · Do",
      loop_2_b: "No more than your brain can hold.",
      loop_2_p: "One to three tasks today. The rest stays, without guilt.",
      loop_3_n: "03 · Close",
      loop_3_b: "Done is done.",
      loop_3_p: "Two minutes. Clear head for tomorrow.",
      loop_link: "Read how cycle and ADHD meet →",
      price_eyebrow: "Pricing",
      price_h2: "Honest. One price.",
      price_period: "/month",
      price_trial: "3 days free, then you pay.",
      price_feat1: "No list that grows while you stand still",
      price_feat2: "A first step small enough to actually begin",
      price_feat3: "Your day adapts to how full your battery is today",
      price_note_before: "14-day money-back. Prefer yearly?",
      price_yearly: "€119 per year",
      price_math: "Cheaper than what you forget to cancel (€58 per month)",
      price_math_1: "Forgotten gym",
      price_math_2: "Unused streaming",
      price_math_3: "Apps you never open",
      faq_eyebrow: "Questions you probably have",
      faq_h2: "Straight answers.",
      faq_planner_q: "Why no classic planner or integrations?",
      faq_planner_a:
        "Classic planners assume overview and discipline. Structuro assumes execution: one first step, matched to your energy. Less system, more starting.",
      faq_day_q: "Does this work if I don't do something every day?",
      faq_day_a:
        "Yes. No streaks, badges, or overdue alerts. Skipping a day isn't failure. Tomorrow simply starts again.",
      faq_refund_q: "How do the trial and money-back guarantee work?",
      faq_refund_a:
        "You start with 3 days free, no commitment. Then €12.99 per month. Not a fit within 14 days? You get your money back, no hassle.",
      faq_privacy_q: "How do you handle my data?",
      faq_privacy_a:
        "Your data stays yours, stored in the EU. We don't sell it, and you can delete everything anytime.",
      faq_first_q: "What do I see the first time I sign in?",
      faq_first_a:
        "One question: how's your energy? Then Structuro suggests up to three things. You confirm, and your day has started. No setup, no empty lists.",
      faq_cycle_q: "How do cycle and ADHD come together?",
      faq_cycle_a:
        'Some weeks your brain feels different. Structuro can optionally account for your cycle phase: gentler suggestions in heavier weeks, no pressure to do more. You turn it on yourself. Want more? <a href="/cyclus/">See the cycle page</a>.',
      press_label: "As seen in",
      press_quote: "“Finally something that doesn't assume a neurotypical brain.”",
      story_eyebrow: "The story behind Structuro",
      story_h2: 'I\'m Niels. I have ADHD. And I build <span class="it">Structuro</span>.',
      story_p1:
        "Proud of my brain. And this morning I got stuck on one email. Both true, on the same day.",
      story_p2:
        "Every planner I tried assumed a brain I don't have. So I built, with a hundred ADHD'ers, something that starts from the brain you already have.",
      story_quote: "Every brain is <em>beautiful</em>. But not every system fits.",
      story_role: "Niels, founder with ADHD",
      story_alt: "Niels, maker of Structuro",
      slot_h2: 'Your brain deserves calm.<br>Not more <span class="it">systems</span>.',
      slot_support:
        "You don't have to get it perfect every day. The app adapts to you, not the other way around. Starting is enough.",
      sticky_note: "14-day money-back",
      footer_made: "Made in the Netherlands",
      footer_privacy: "Privacy policy",
      footer_terms: "Terms & conditions",
      footer_cookies: "Cookies",
      hk0_tag: "EXECUTIVE",
      hk0_title: "Task initiation",
      hk0_short: "I know what to do, I just don't start.",
      hk0_body:
        "Knowing what to do is not the same as starting. Structuro makes the first step small enough that your brain doesn't need to fight it.",
      hk1_tag: "COGNITIVE",
      hk1_title: "Working memory overload",
      hk1_short: "My head is full, and a long list makes it worse.",
      hk1_body:
        "A long to-do list eats working memory. Structuro shows at most three tasks, so your head has room to do instead of remember.",
      hk2_tag: "DOPAMINE",
      hk2_title: "Energy and motivation",
      hk2_short: "Some days I fly, other days I don't move.",
      hk2_body:
        "ADHD brains have shifting dopamine. That's why your day start begins with energy, not a fixed task list that overloads you.",
      hk3_tag: "TIME",
      hk3_title: "Time blindness",
      hk3_short: "I don't feel time. A day has no beginning or end.",
      hk3_body:
        "If you don't have an internal clock, a daily loop with closing helps. Done is done, without guilt about what you didn't do.",
      hk4_tag: "CYCLE",
      hk4_title: "Hormones and focus",
      hk4_short: "Some weeks my brain simply works differently.",
      hk4_body:
        "Estrogen and progesterone steer dopamine too. Structuro adapts your workload to your cycle phase, without comparing you to yesterday.",
      hk5_tag: "CALM",
      hk5_title: "Burnout prevention",
      hk5_short: "Too many choices a day and I'm done.",
      hk5_body:
        "Chronic overstimulation and guilt drain energy. Fewer choices per day means less decision fatigue and more recovery.",
      hk_yes: "Yes, this is me",
    },
  };

  function readInitialLang() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var fromUrl = (params.get("lang") || params.get("locale") || "").toLowerCase();
      if (fromUrl === "en" || fromUrl === "nl") return fromUrl;
    } catch (e) {}
    try {
      var stored = (localStorage.getItem(STORAGE_KEY) || "").toLowerCase();
      if (stored === "en" || stored === "nl") return stored;
    } catch (e2) {}
    return "nl";
  }

  var currentLang = readInitialLang();
  window.currentLang = currentLang;
  window.V2_I18N = T;

  function syncLangButtons(lang) {
    var nl = document.getElementById("btnNL");
    var en = document.getElementById("btnEN");
    if (nl) {
      nl.classList.toggle("on", lang === "nl");
      nl.setAttribute("aria-current", lang === "nl" ? "true" : "false");
    }
    if (en) {
      en.classList.toggle("on", lang === "en");
      en.setAttribute("aria-current", lang === "en" ? "true" : "false");
    }
  }

  function syncUrl(lang) {
    try {
      var url = new URL(window.location.href);
      if (lang === "en") url.searchParams.set("lang", "en");
      else url.searchParams.delete("lang");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function syncMeta(t) {
    if (t.meta_title) document.title = t.meta_title;
    var desc = document.querySelector('meta[name="description"]');
    if (desc && t.meta_desc) desc.setAttribute("content", t.meta_desc);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && t.meta_title) ogTitle.setAttribute("content", t.meta_title);
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && t.meta_desc) ogDesc.setAttribute("content", t.meta_desc);
  }

  function applyTranslations() {
    var t = T[currentLang] || T.nl;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key || t[key] === undefined) return;
      el.innerHTML = t[key];
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (!key || t[key] === undefined) return;
      el.setAttribute("aria-label", t[key]);
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-alt");
      if (!key || t[key] === undefined) return;
      el.setAttribute("alt", t[key]);
    });
    syncMeta(t);
    if (typeof window.refreshV2HerkenCopy === "function") {
      window.refreshV2HerkenCopy();
    }
    if (typeof window.applySignupBridgeLinks === "function") {
      window.applySignupBridgeLinks();
    } else if (typeof window.structuroSignupBridgeUrl === "function") {
      document.querySelectorAll("[data-signup-bridge]").forEach(function (el) {
        var content = el.getAttribute("data-signup-bridge") || "cta";
        el.setAttribute("href", window.structuroSignupBridgeUrl(content));
      });
    }
  }

  function setLang(lang) {
    if (lang !== "en" && lang !== "nl") return;
    currentLang = lang;
    window.currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
    document.documentElement.lang = lang;
    syncLangButtons(lang);
    syncUrl(lang);
    applyTranslations();
  }

  window.setLang = setLang;

  document.addEventListener("DOMContentLoaded", function () {
    setLang(currentLang);
  });
})();
