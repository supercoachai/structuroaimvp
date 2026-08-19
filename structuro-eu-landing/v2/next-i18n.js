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
        "Structuro begint bij lage energie met één eerste stap. Jij bevestigt, en begint. Voor ADHD-breinen die niet beginnen.",
      nav_how: "Dagstart",
      nav_why: "Herkenning",
      nav_reviews: "Reviews",
      nav_price: "Prijs",
      nav_faq: "FAQ",
      nav_login: "Inloggen",
      nav_cta: "Begin met één stap",
      hero_cta: "Begin met één stap",
      cta_reassure: "Gratis 7 dagen · geen creditcard · klaar in ~2 minuten",
      cta_chip_trial: "7 dagen gratis",
      cta_chip_card: "geen creditcard",
      cta_chip_time: "klaar in 2 minuten",
      cta_chips_label: "Trial in het kort",
      cta_privacy: "Je gegevens staan in de EU en worden nooit verkocht.",
      lang_label: "Taal",
      menu: "Menu",
      hero_eyebrow: "Voor ADHD-breinen die niet beginnen",
      hero_h1: 'Niet alles.<br><span class="it">Eén eerste stap.</span><br>Vandaag.',
      hero_secondary: "Welke hiervan ben jij?",
      intro_support:
        "Structuro is zo ontworpen dat je ADHD-brein niet tegen een planner hoeft te vechten. Geen lijst van twintig. Eén eerste stap die past bij hoe vol je batterij vandaag is.",
      hero_trust:
        "Al vijf apps geprobeerd en steeds afgehaakt? De meeste bewaren je lijst. Structuro helpt je starten: één taak, geen streak.",
      hero_proof:
        'Gebouwd met 100 ADHD\'ers · 50+ diepte-interviews. <a href="/onderzoek/">Bekijk het onderzoek</a>',
      hero_press: "Geschreven over in ED, AD en BD",
      hero_binary:
        "Andere apps bewaren je lijst. Structuro helpt je vandaag te starten.",
      founder_teaser_text:
        "Trots op mijn brein, maar soms gevloerd door één simpel mailtje. Elke planner ging uit van een brein dat ik niet heb. Dus bouwde ik, samen met honderd ADHD'ers, iets voor het brein dat je al hebt.",
      founder_teaser_link: "Lees mijn verhaal",
      psych_eyebrow: "Waarom dit werkt",
      psych_h2: "Welke hiervan ben jij?",
      psych_lede: "Kies wat herkenbaar is. Meer hoeft niet.",
      why_open_aria: "Waarom dit zo werkt",
      why_close_aria: "Uitleg sluiten",
      why_gotit: "Begrepen",
      why: {
        hero: {
          eyebrow: "Waarom dit zo werkt",
          title: "Eén eerste stap",
          rows: [
            {
              icon: "brain",
              title: "Waar het wringt",
              body: "Planners gaan uit van overzicht. ADHD botst op beginnen. Een volle lijst voelt veilig, maar blokkeert starten.",
            },
            {
              icon: "plan",
              title: "Wat Structuro doet",
              body: "Eerst één haalbare stap, niet een perfecte dag. Jij bevestigt. De rest mag wachten.",
            },
            {
              icon: "meaning",
              title: "Geen schuld",
              body: "Laag mag. Eén ding is genoeg. Dat is geen falen, wel beginnen.",
            },
          ],
        },
        energy: {
          eyebrow: "Waarom dit zo werkt",
          title: "Eerst energie",
          rows: [
            {
              icon: "brain",
              title: "Batterij wisselt",
              body: "Bij ADHD verschilt je energie per dag. Dezelfde lange to-do voelt dan altijd te groot.",
            },
            {
              icon: "plan",
              title: "Aangepast aantal",
              body: "Laag = één ding. Genoeg = twee. Hoog = drie. Zo past de dag bij jouw batterij.",
            },
            {
              icon: "meaning",
              title: "Beginnen telt",
              body: "Minder is geen falen. Het is de kortste weg naar een eerste stap.",
            },
          ],
        },
        propose: {
          eyebrow: "Waarom dit zo werkt",
          title: "Maximaal drie",
          rows: [
            {
              icon: "brain",
              title: "Keuzestress blokkeert",
              body: "Zelf bedenken wat je doet kost al energie. Dan blijft er weinig over om te starten.",
            },
            {
              icon: "plan",
              title: "Voorstellen, jij beslist",
              body: "Structuro stelt voor. Jij bevestigt of past aan. Bevestigen is lichter dan plannen.",
            },
            {
              icon: "private",
              title: "De rest blijft",
              body: "Wat je vandaag niet doet, verdwijnt niet met schuld. Het blijft staan tot er ruimte is.",
            },
          ],
        },
        focus: {
          eyebrow: "Waarom dit zo werkt",
          title: "Eén ding tegelijk",
          rows: [
            {
              icon: "clock",
              title: "Geen minutenjacht",
              body: "Kort, middel of lang. Grove tijd, zodat je in de taak blijft in plaats van op de klok.",
            },
            {
              icon: "plan",
              title: "Eén open ding",
              body: "Twintig open taken trekken aandacht weg. Hier is er één aan zet. Klaar is klaar.",
            },
            {
              icon: "pause",
              title: "Pauze mag",
              body: "Stoppen zonder schuld. Wat je deed telt, ook als je niet 'af' bent.",
            },
          ],
        },
        cycle: {
          eyebrow: "Waarom dit zo werkt",
          title: "Cyclus is optioneel",
          rows: [
            {
              icon: "meaning",
              title: "Context, geen druk",
              body: "Voor sommigen verschuift focus met de cyclus. Dat is informatie, geen verplichting.",
            },
            {
              icon: "plan",
              title: "Aan of uit",
              body: "Aan = fase stil naast je energie, als inzicht. Uit = alleen je dagstart. Nooit sturing.",
            },
            {
              icon: "private",
              title: "Jij kiest",
              body: "Geen verplichte setup. Zet het aan als het helpt, of sla over.",
            },
          ],
        },
        dump: {
          eyebrow: "Waarom dit zo werkt",
          title: "Eerst kwijt, dan kiezen",
          rows: [
            {
              icon: "brain",
              title: "Hoofd leegmaken",
              body: "Losse gedachten hoeven niet meteen taken te zijn. Typ of spreek ze in, zonder ordenen.",
            },
            {
              icon: "plan",
              title: "Later kiezen",
              body: "Maak er een taak van als het ertoe doet, of verwijder het. Jij blijft baas.",
            },
            {
              icon: "private",
              title: "Geen druk",
              body: "Geen minimum, geen schuld. Maximaal vijftien, zodat de lijst licht blijft.",
            },
          ],
        },
      },
      feat1_eyebrow: "Dagstart",
      feat1_h2: "Eerst energie. Dan pas taken.",
      feat1_p:
        "Je batterij bepaalt hoeveel past. Maximaal drie voorstellen. En de eerste stap is klein genoeg om echt te beginnen.",
      flow_beat1_title: "Energie eerst",
      flow_beat1_p: "Laag, genoeg of hoog. Het aantal dingen volgt jouw batterij.",
      flow_beat2_title: "Maximaal drie",
      flow_beat2_p: "Structuro stelt voor. Jij bevestigt. De rest blijft staan, zonder schuld.",
      flow_beat3_title: "Eerste stap klein",
      flow_beat3_p: "Niet het hele abonnement. Wel: mail of app openen.",
      phone_micro_label: "Eerste stap",
      phone_micro_sheet_eyebrow: "Eerste stap klein",
      feat2_eyebrow: "Voorstellen",
      feat2_h2: "Maximaal drie. Meer hoeft niet.",
      feat2_p:
        "Structuro stelt voor. Jij bevestigt of past aan. De rest blijft staan, zonder schuld.",
      feat3_eyebrow: "Focus",
      feat3_h2: "Eén ding tegelijk. Klaar is klaar.",
      feat3_p:
        "Geen dashboard vol keuzes. Kies een duur, laat Structuro mini-stappen voorstellen, werk één ding af. Pauze mag altijd.",
      feat4_eyebrow: "Optioneel",
      feat4_h2: "Cyclus meenemen? Jij kiest.",
      feat4_p:
        "Geen verplichte setup. Eenmalig aanzetten als het helpt: je fase verschijnt stil naast je energie. Inzicht, nooit sturing.",
      feat5_eyebrow: "Dump",
      feat5_h2: "Brein legen. Later kiezen.",
      feat5_p:
        "Leg losse gedachten vast, typ of spreek, zonder ze meteen te ordenen. Later maak je er een taak van, of je verwijdert ze. Geen minimum, geen schuld.",
      trio_eyebrow: "Hoe het werkt",
      trio_h2: "Drie dingen. Meer hoeft niet.",
      trio_swipe: "Veeg opzij voor Focus en Dump",
      cycle_strip:
        'Cyclus meenemen is optioneel. Jij kiest. <a href="/cyclus/">Meer over cyclus en ADHD</a>',
      phone_dump_eyebrow: "Extern geheugen",
      phone_dump_title: "Dump",
      phone_dump_lead: "Typ of spreek wat in je hoofd zit. Structuur hoeft niet.",
      phone_dump_ph: "Wat zit er in je hoofd?",
      phone_dump_typed: "Dat ene abonnement nog opzeggen",
      phone_dump_hint: "Typ of spreek. Later: maak taak of verwijderen.",
      phone_dump_listen: "Luisteren...",
      phone_dump_save: "Bewaren",
      phone_dump_foot:
        "Dump vrij. Maximaal 15. Maak er later een taak van, of verwijder.",
      phone_dump_task: "Maak taak",
      phone_dump_del: "Verwijderen",
      phone_stop: "Stoppen",
      phone_energy: "Hoe zit je energie?",
      phone_tap_hint: "Tik Laag, Genoeg of Hoog. Voorstellen volgen meteen.",
      phone_low: "Laag",
      phone_ok: "Genoeg",
      phone_high: "Hoog",
      phone_feasible_low: "Klein en zacht is prima vandaag.",
      phone_feasible_ok: "Twee dingen zijn haalbaar.",
      phone_feasible_high: "Drie dingen passen vandaag.",
      phone_suggest: "Structuro stelt voor:",
      phone_suggest_title: "Dit stelt Structuro voor.",
      phone_task1: "Project starten",
      phone_task2: "Abonnement opzeggen",
      phone_task3: "Inbox opruimen",
      phone_confirm: "Dit is goed",
      phone_edit: "Zelf aanpassen",
      phone_home_eyebrow: "Vandaag",
      phone_home_greeting: "Goedemorgen, Niels",
      phone_home_energy: "Energie",
      phone_home_energy_aria_low: "Energie: laag",
      phone_home_energy_aria_ok: "Energie: genoeg",
      phone_home_energy_aria_high: "Energie: hoog",
      phone_home_turn: "Nu aan de beurt",
      phone_home_micro1: "Mail of app openen",
      phone_home_micro2: "Bevestigingsmail vinden",
      phone_home_micro3: "Opzeggen aanklikken",
      phone_home_micro4: "Bevestigen en klaar",
      phone_home_focus: "Start focus",
      phone_home_other: "Andere taak",
      phone_home_loop: "De lus van vandaag",
      phone_home_dump: "Brein legen",
      phone_home_shutdown: "Dag afsluiten",
      phone_home_reassure: "Meer hoeft niet vandaag.",
      phone_focus_close: "Sluiten",
      phone_focus_paused: "Gepauzeerd",
      phone_focus_eyebrow: "Nu aan zet",
      phone_focus_choose: "Kies hoe lang",
      phone_focus_approx: "ongeveer",
      phone_focus_bucket: "15 min",
      phone_focus_estimate: "ongeveer 15 min",
      phone_focus_start: "Start focus",
      phone_focus_self: "Zelf tijd inschatten",
      phone_focus_kort: "Ongeveer 5 min",
      phone_focus_middel: "Ongeveer 15 min",
      phone_focus_lang: "Ongeveer 25 min",
      phone_focus_park: "Parkeer gedachte",
      phone_focus_park_ph: "Parkeer een gedachte…",
      phone_focus_park_save: "Bewaar",
      phone_focus_suggest_title: "Opsplitsen in kleine stappen?",
      phone_focus_suggest_lead: "Klein beginnen maakt starten makkelijker.",
      phone_focus_suggest_cta: "Ja, voorstellen",
      phone_focus_suggest_busy: "Bezig met nadenken…",
      phone_focus_suggest_skip: "Niet nu",
      phone_focus_pause: "Pauze",
      phone_focus_resume: "Verder",
      phone_focus_extend: "Iets langer",
      phone_focus_finish: "Afronden",
      phone_focus_done_cta: "Ik ben klaar",
      phone_focus_still: "Nog bezig",
      cycle_discover_eyebrow: "Eenmalig instellen",
      cycle_discover_hint: "Je cyclus meenemen?",
      cycle_discover_title: "Je cyclus meenemen?",
      cycle_discover_body:
        "Optioneel. Structuro toont je fase stil naast je energie: inzicht en een zachte reminder. Nooit sturing.",
      cycle_discover_toggle: "Cyclus meenemen",
      cycle_discover_toggle_off: "Uit · voorstellen alleen op energie",
      cycle_discover_why_title: "Waarom dit uitmaakt",
      cycle_discover_why:
        "Dezelfde taak kan in je lage dagen zwaarder voelen. Structuro toont die context; jij blijft kiezen.",
      cycle_discover_yes: "Ja, meenemen",
      cycle_discover_no: "Nee, niet nodig",
      phone_cycle_phase: "DAG 8 · FOLLICULAIR",
      proof_eyebrow: "Wat anderen zeggen",
      proof_h2: "Herkenning, geen beloftes.",
      quote1:
        "ADHD is niet dat je niet weet wat je moet doen. Het is dat je niet kan starten. Eén taak voor me neerleggen, geen lijst van twintig, en ik begin.",
      quote1_role: "app developer",
      quote2:
        "Alles voelt urgent en ik schat de tijd verkeerd in. Drie taken per dag. Meer krijg ik toch niet gedaan, maar nu voelt het haalbaar.",
      quote2_role: "zelfstandig professional",
      quote3:
        "Ik zit vast in mijn hoofd en kan er niet uit. De dagstart vraagt niet wat ik allemaal moet. Alleen wat de eerste stap is vandaag.",
      quote3_role: "ondernemer",
      press_label: "In de media",
      press_quote: "Eindhovense ondernemer ontwikkelt ADHD-app voor dagelijkse structuur",
      press_cite: "Eindhovens Dagblad, Algemeen Dagblad en Brabants Dagblad, 1 juni 2026",
      press_ed: "1 juni 2026",
      press_ad: "1 juni 2026",
      press_bd: "1 juni 2026",
      press_impuls: "Lezing ADHD-café Nijmegen",
      heard_on_label: "Te horen op",
      heard_on_ep1_show: "Succesvol leven met ADD/ADHD",
      heard_on_ep1: "Afl. A114, in beweging komen met een brein dat anders werkt",
      heard_on_ep2_show: "Ongefilterd met Niels",
      heard_on_ep2: "Structuur bouwen voor een brein dat anders werkt",
      price_eyebrow: "Prijs",
      price_h2: "Eerlijk. Eén prijs.",
      price_value:
        "Minder dan één keer op je werk niet doorkomen. €12,99 per maand, of €9,92 als je per jaar betaalt.",
      price_monthly_kicker: "Maandelijks",
      price_yearly_kicker: "Jaarlijks",
      price_save: "Bespaar 24%",
      price_period: "/maand",
      price_monthly_sub: "Elk moment opzegbaar",
      price_yearly_sub: "€119 per jaar",
      price_trial: "7 dagen gratis. Daarna kies je.",
      price_feat1: "Geen lijst die groeit terwijl jij stilstaat",
      price_feat2: "Een eerste stap klein genoeg om echt te beginnen",
      price_feat3: "Je dag past zich aan hoe vol je batterij vandaag is",
      price_note_before: "14 dagen geld terug na je eerste betaling.",
      price_yearly: "€119 per jaar",
      price_guarantee: "7 dagen gratis proberen · 14 dagen geld-terug-garantie",
      faq_eyebrow: "Vragen die je waarschijnlijk hebt",
      faq_h2: "Eerlijke antwoorden.",
      faq_apps_q: "Ik heb al vijf apps geprobeerd en steeds afgehaakt. Waarom nu wel?",
      faq_apps_a:
        "Omdat de meeste apps je lijst bewaren en Structuro je laat starten. Je hoeft niets te vullen, niets bij te houden en geen streak te beschermen. Eén taak erin, één eerste stap eruit. Als je drie dagen niets doet, verlies je niets: je begint gewoon opnieuw. Geen streaks, geen shame.",
      faq_platform_q: "Is dit een app of een website? Werkt het op mijn telefoon?",
      faq_platform_a:
        "Allebei. Structuro is een webapp. Je opent hem in de browser op computer of telefoon, en je kunt hem op je homescreen zetten. Er is nog geen aparte App Store- of Play Store-app.",
      faq_card_q: "Heb ik een creditcard nodig?",
      faq_card_a:
        "Nee. Een creditcard is niet nodig. iDEAL, Apple Pay of Google Pay is genoeg. Voor de trial geef je wél een betaalmethode op. Die week betaal je niets. Vóór we iets afschrijven mailen we je, met een stop-knop.",
      faq_cancel_q: "Hoe zeg ik op?",
      faq_cancel_a:
        "In je account onder Abonnement, twee kliks, geen mail nodig. Zeg je op binnen 14 dagen na je eerste betaling, dan krijg je je geld terug.",
      faq_privacy_q: "Wat gebeurt er met mijn gegevens?",
      faq_privacy_a:
        "Je gegevens blijven van jou, opgeslagen binnen de EU. We verkopen niets door en je kunt alles op elk moment verwijderen.",
      faq_planner_q: "Waarom geen klassieke planner of integraties?",
      faq_planner_a:
        "Klassieke planners gaan uit van overzicht en discipline. Structuro gaat uit van executie: één eerste stap, aangepast aan je energie. Minder systeem, meer beginnen.",
      faq_day_q: "Werkt dit ook als ik niet elke dag iets doe?",
      faq_day_a:
        "Ja. Er zijn geen streaks, badges of achterstallig-meldingen. Een dag overslaan is geen falen, morgen begint opnieuw.",
      faq_refund_q: "Hoe werkt de 7 dagen gratis?",
      faq_refund_a:
        "Je probeert eerst de dagstart, nog zonder account.<br><br>Daarna maak je een account en start je 7 dagen gratis. Daarvoor geef je een betaalmethode op, maar die week betaal je niets.<br><br>Vóór we iets afschrijven mailen we je, met een stop-knop (één klik). Stoppen kan ook via Instellingen → Abonnement beheren.<br><br>Niet tevreden binnen 14 dagen na je eerste betaling? Geld terug, zonder rompslomp.",
      faq_first_q: "Wat zie ik als ik de eerste keer inlog?",
      faq_first_a:
        "Eerst ervaar je de dagstart anoniem. Daarna maak je een account en start je 7 dagen trial. Bij laag energie krijg je één eerste stap. Bij meer energie maximaal drie.",
      faq_cycle_q: "Hoe komen cyclus en ADHD samen?",
      faq_cycle_a:
        "Sommige weken voelt je energie anders. In Structuro kun je optioneel je cyclusfase meenemen als stille context naast je energie: zachtere voorstellen in zwaardere weken, geen druk om meer te doen. Je zet het zelf aan in de app. Geen diagnose, geen sturing. Meer lezen? <a href=\"/cyclus/\">Bekijk de cyclus-pagina</a>.",
      story_eyebrow: "Het verhaal achter Structuro",
      story_h2:
        "Trots op mijn brein, maar soms gevloerd door één simpel mailtje.",
      story_p1:
        "Allebei waar, op dezelfde dag. Elke planner die ik probeerde ging uit van een brein dat ik niet heb. Dus bouwde ik, samen met honderd ADHD'ers, iets dat uitgaat van het brein dat je al hebt.",
      story_quote: "Elk brein is <em>mooi</em>. Maar niet elk systeem past.",
      story_role: "Niels, founder met ADHD",
      story_alt: "Niels, maker van Structuro",
      slot_h2: 'Je brein verdient rust.<br>Niet meer <span class="it">systemen</span>.',
      slot_support:
        "Je hoeft het niet elke dag perfect te doen. De app past zich aan jou aan, niet andersom. Beginnen is genoeg.",
      footer_made: "Gemaakt in Nederland",
      footer_privacy: "Privacy policy",
      footer_terms: "Algemene voorwaarden",
      footer_cookies: "Cookies",
      footer_research: "Onderzoek",
      footer_a11y: "Toegankelijkheid",
      footer_press: "Pers",
      footer_story: "Verhaal",
    },
    en: {
      meta_title: "Structuro, calm for your ADHD brain",
      meta_desc:
        "Structuro is a web app for ADHD brains that don't start. One first step, matched to your energy. 7 days free.",
      nav_how: "Day start",
      nav_why: "Recognition",
      nav_reviews: "Reviews",
      nav_price: "Pricing",
      nav_faq: "FAQ",
      nav_login: "Log in",
      nav_cta: "Start with one step",
      hero_cta: "Start with one step",
      cta_reassure: "7 days free · no credit card · ready in ~2 minutes",
      cta_chip_trial: "7 days free",
      cta_chip_card: "no credit card",
      cta_chip_time: "ready in 2 minutes",
      cta_chips_label: "Trial in short",
      cta_privacy: "Your data stays in the EU and is never sold.",
      lang_label: "Language",
      menu: "Menu",
      hero_eyebrow: "For ADHD brains that don't start",
      hero_h1: 'Not everything.<br><span class="it">One first step.</span><br>Today.',
      hero_secondary: "Which of these is you?",
      intro_support:
        "Structuro is designed so your ADHD brain does not have to fight a planner. No list of twenty. One first step that matches how full your battery is today.",
      hero_trust:
        "Already tried five apps and dropped them? Most keep your list. Structuro helps you start: one task, no streak.",
      hero_proof:
        'Built with 100 people with ADHD · 50+ in-depth interviews. <a href="/onderzoek/">See the research</a>',
      hero_press: "Covered in ED, AD and BD",
      hero_binary:
        "Other apps store your lists. Structuro helps you start today.",
      founder_teaser_text:
        "Proud of my brain, but sometimes floored by one simple email. Every planner assumed a brain I don't have. So I built, with a hundred people with ADHD, something for the brain you already have.",
      founder_teaser_link: "Read my story",
      psych_eyebrow: "Why this works",
      psych_h2: "Which of these is you?",
      psych_lede: "Pick what feels familiar. That is enough.",
      why_open_aria: "Why this works",
      why_close_aria: "Close explanation",
      why_gotit: "Got it",
      why: {
        hero: {
          eyebrow: "Why this works",
          title: "One first step",
          rows: [
            {
              icon: "brain",
              title: "Where it sticks",
              body: "Planners assume overview. ADHD hits on starting. A full list feels safe, but blocks beginning.",
            },
            {
              icon: "plan",
              title: "What Structuro does",
              body: "First one doable step, not a perfect day. You confirm. The rest can wait.",
            },
            {
              icon: "meaning",
              title: "No guilt",
              body: "Low is fine. One thing is enough. That is not failure, it is starting.",
            },
          ],
        },
        energy: {
          eyebrow: "Why this works",
          title: "Energy first",
          rows: [
            {
              icon: "brain",
              title: "Battery shifts",
              body: "With ADHD your energy differs by day. The same long to-do then always feels too big.",
            },
            {
              icon: "plan",
              title: "Matched count",
              body: "Low = one thing. Enough = two. High = three. So the day fits your battery.",
            },
            {
              icon: "meaning",
              title: "Starting counts",
              body: "Less is not failure. It is the shortest path to a first step.",
            },
          ],
        },
        propose: {
          eyebrow: "Why this works",
          title: "Three max",
          rows: [
            {
              icon: "brain",
              title: "Choice stress blocks",
              body: "Inventing what to do already costs energy. Then little remains to start.",
            },
            {
              icon: "plan",
              title: "Suggest, you decide",
              body: "Structuro suggests. You confirm or adjust. Confirming is lighter than planning.",
            },
            {
              icon: "private",
              title: "The rest stays",
              body: "What you skip today does not vanish with guilt. It stays until there is room.",
            },
          ],
        },
        focus: {
          eyebrow: "Why this works",
          title: "One thing at a time",
          rows: [
            {
              icon: "clock",
              title: "No minute chase",
              body: "Short, medium or long. Rough time so you stay in the task, not on the clock.",
            },
            {
              icon: "plan",
              title: "One open thing",
              body: "Twenty open tasks pull attention away. Here one thing is up. Done is done.",
            },
            {
              icon: "pause",
              title: "Pause is ok",
              body: "Stop without guilt. What you did counts, even if you are not 'done'.",
            },
          ],
        },
        cycle: {
          eyebrow: "Why this works",
          title: "Cycle is optional",
          rows: [
            {
              icon: "meaning",
              title: "Context, not pressure",
              body: "For some, focus shifts with the cycle. That is information, never required.",
            },
            {
              icon: "plan",
              title: "On or off",
              body: "On = phase quietly next to your energy, as insight. Off = just your day start. Never steering.",
            },
            {
              icon: "private",
              title: "Your call",
              body: "No required setup. Turn it on if it helps, or skip.",
            },
          ],
        },
        dump: {
          eyebrow: "Why this works",
          title: "Park first, choose later",
          rows: [
            {
              icon: "brain",
              title: "Clear your head",
              body: "Loose thoughts do not have to be tasks yet. Type or speak them in, without sorting.",
            },
            {
              icon: "plan",
              title: "Choose later",
              body: "Make a task if it matters, or delete it. You stay in charge.",
            },
            {
              icon: "private",
              title: "No pressure",
              body: "No minimum, no guilt. Max fifteen, so the list stays light.",
            },
          ],
        },
      },
      feat1_eyebrow: "Day start",
      feat1_h2: "Energy first. Then tasks.",
      feat1_p:
        "Your battery sets how much fits. Three suggestions max. And the first step is small enough to actually start.",
      flow_beat1_title: "Energy first",
      flow_beat1_p: "Low, okay or high. How many things follow your battery.",
      flow_beat2_title: "Three max",
      flow_beat2_p: "Structuro suggests. You confirm. The rest stays, without guilt.",
      flow_beat3_title: "First step small",
      flow_beat3_p: "Not the whole subscription. Just: open mail or the app.",
      phone_micro_label: "First step",
      phone_micro_sheet_eyebrow: "First step small",
      feat2_eyebrow: "Suggestions",
      feat2_h2: "Three max. That is enough.",
      feat2_p:
        "Structuro suggests. You confirm or adjust. The rest stays, without guilt.",
      feat3_eyebrow: "Focus",
      feat3_h2: "One thing at a time. Done is done.",
      feat3_p:
        "No dashboard full of choices. Pick a length, let Structuro suggest mini-steps, finish one thing. Pausing is always ok.",
      feat4_eyebrow: "Optional",
      feat4_h2: "Include your cycle? Your call.",
      feat4_p:
        "No required setup. Turn it on once if it helps: your phase shows quietly next to your energy. Insight, never steering.",
      feat5_eyebrow: "Dump",
      feat5_h2: "Empty your head. Choose later.",
      feat5_p:
        "Capture loose thoughts by typing or speaking, without organizing them right away. Later turn one into a task, or delete it. No minimum, no guilt.",
      trio_eyebrow: "How it works",
      trio_h2: "Three things. That is enough.",
      trio_swipe: "Swipe for Focus and Dump",
      cycle_strip:
        'Including your cycle is optional. Your call. <a href="/cyclus/">More about cycle and ADHD</a>',
      phone_dump_eyebrow: "External memory",
      phone_dump_title: "Dump",
      phone_dump_lead: "Type or speak what is on your mind. Structure can wait.",
      phone_dump_ph: "What is on your mind?",
      phone_dump_typed: "Still need to cancel that subscription",
      phone_dump_hint: "Type or speak. Later: make a task or delete.",
      phone_dump_listen: "Listening...",
      phone_dump_save: "Save",
      phone_dump_foot:
        "Dump freely. Max 15. Later make a task, or delete.",
      phone_dump_task: "Make task",
      phone_dump_del: "Delete",
      phone_stop: "Stop",
      phone_energy: "How is your energy?",
      phone_tap_hint: "Tap Low, Enough or High. Suggestions follow right away.",
      phone_low: "Low",
      phone_ok: "Okay",
      phone_high: "High",
      phone_feasible_low: "Small and soft is fine today.",
      phone_feasible_ok: "Two things are doable.",
      phone_feasible_high: "Three things fit today.",
      phone_suggest: "Structuro suggests:",
      phone_suggest_title: "Structuro suggests this.",
      phone_task1: "Start project",
      phone_task2: "Cancel subscription",
      phone_task3: "Clear inbox",
      phone_confirm: "This looks good",
      phone_edit: "Choose myself",
      phone_home_eyebrow: "Today",
      phone_home_greeting: "Good morning, Niels",
      phone_home_energy: "Energy",
      phone_home_energy_aria_low: "Energy: low",
      phone_home_energy_aria_ok: "Energy: okay",
      phone_home_energy_aria_high: "Energy: high",
      phone_home_turn: "Up now",
      phone_home_micro1: "Open mail or the app",
      phone_home_micro2: "Find the confirmation email",
      phone_home_micro3: "Tap cancel",
      phone_home_micro4: "Confirm and done",
      phone_home_focus: "Start focus",
      phone_home_other: "Other task",
      phone_home_loop: "Today's loop",
      phone_home_dump: "Empty your brain",
      phone_home_shutdown: "Close the day",
      phone_home_reassure: "Nothing more needed today.",
      phone_focus_close: "Close",
      phone_focus_paused: "Paused",
      phone_focus_eyebrow: "Up now",
      phone_focus_choose: "Choose how long",
      phone_focus_approx: "about",
      phone_focus_bucket: "15 min",
      phone_focus_estimate: "about 15 min",
      phone_focus_start: "Start focus",
      phone_focus_self: "Estimate time myself",
      phone_focus_kort: "About 5 min",
      phone_focus_middel: "About 15 min",
      phone_focus_lang: "About 25 min",
      phone_focus_park: "Park a thought",
      phone_focus_park_ph: "Park a thought…",
      phone_focus_park_save: "Save",
      phone_focus_suggest_title: "Split into small steps?",
      phone_focus_suggest_lead: "Starting small makes it easier to begin.",
      phone_focus_suggest_cta: "Yes, suggest",
      phone_focus_suggest_busy: "Thinking…",
      phone_focus_suggest_skip: "Not now",
      phone_focus_pause: "Pause",
      phone_focus_resume: "Resume",
      phone_focus_extend: "A bit longer",
      phone_focus_finish: "Finish",
      phone_focus_done_cta: "I'm done",
      phone_focus_still: "Still going",
      cycle_discover_eyebrow: "Set once",
      cycle_discover_hint: "Include your cycle?",
      cycle_discover_title: "Include your cycle?",
      cycle_discover_body:
        "Optional. Structuro shows your phase quietly next to energy: insight and a soft reminder. Never steering.",
      cycle_discover_toggle: "Include cycle",
      cycle_discover_toggle_off: "Off · suggestions from energy only",
      cycle_discover_why_title: "Why this matters",
      cycle_discover_why:
        "The same task can feel heavier on low days. Structuro shows that context; you keep choosing.",
      cycle_discover_yes: "Yes, include it",
      cycle_discover_no: "No, not needed",
      phone_cycle_phase: "DAY 8 · FOLLICULAR",
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
      press_label: "In the press",
      press_quote: "Eindhoven entrepreneur builds ADHD app for daily structure",
      press_cite: "Eindhovens Dagblad, Algemeen Dagblad and Brabants Dagblad, 1 June 2026",
      press_ed: "1 June 2026",
      press_ad: "1 June 2026",
      press_bd: "1 June 2026",
      press_impuls: "Talk at ADHD café Nijmegen",
      heard_on_label: "Heard on",
      heard_on_ep1_show: "Succesvol leven met ADD/ADHD",
      heard_on_ep1: "Ep. A114, getting moving with a brain that works differently",
      heard_on_ep2_show: "Ongefilterd met Niels",
      heard_on_ep2: "Building structure for a brain that works differently",
      price_eyebrow: "Pricing",
      price_h2: "Honest. One price.",
      price_value:
        "Less than missing one work deadline. €12.99 a month, or €9.92 if you pay yearly.",
      price_monthly_kicker: "Monthly",
      price_yearly_kicker: "Yearly",
      price_save: "Save 24%",
      price_period: "/month",
      price_monthly_sub: "Cancel anytime",
      price_yearly_sub: "€119 per year",
      price_trial: "7 days free. Then you choose.",
      price_feat1: "No list that grows while you stand still",
      price_feat2: "A first step small enough to actually begin",
      price_feat3: "Your day adapts to how full your battery is today",
      price_note_before: "14-day money-back after your first payment.",
      price_yearly: "€119 per year",
      price_guarantee: "7-day free trial · 14-day money-back guarantee",
      faq_eyebrow: "Questions you probably have",
      faq_h2: "Straight answers.",
      faq_apps_q: "I have already tried five apps and dropped them. Why would this stick?",
      faq_apps_a:
        "Because most apps keep your list, and Structuro helps you start. You do not have to fill anything in, keep a streak, or catch up. One task in, one first step out. If you do nothing for three days, you lose nothing: you just start again. No streaks, no shame.",
      faq_platform_q: "Is this an app or a website? Does it work on my phone?",
      faq_platform_a:
        "Both. Structuro is a web app. You open it in the browser on computer or phone, and you can add it to your home screen. There is not a separate App Store or Play Store app yet.",
      faq_card_q: "Do I need a credit card?",
      faq_card_a:
        "No. A credit card is not required. iDEAL, Apple Pay or Google Pay is enough. You do add a payment method for the trial. You pay nothing that week. Before we charge you, we email you with a stop button.",
      faq_cancel_q: "How do I cancel?",
      faq_cancel_a:
        "In your account under Subscription, two clicks, no email needed. Cancel within 14 days of your first payment and you get your money back.",
      faq_privacy_q: "What happens to my data?",
      faq_privacy_a:
        "Your data stays yours, stored in the EU. We don't sell it, and you can delete everything anytime.",
      faq_planner_q: "Why no classic planner or integrations?",
      faq_planner_a:
        "Classic planners assume overview and discipline. Structuro assumes execution: one first step, matched to your energy. Less system, more starting.",
      faq_day_q: "Does this work if I don't do something every day?",
      faq_day_a:
        "Yes. No streaks, badges, or overdue alerts. Skipping a day isn't failure. Tomorrow simply starts again.",
      faq_refund_q: "How does the 7-day free trial work?",
      faq_refund_a:
        "You try the day start first, still without an account.<br><br>Then you create an account and start 7 days free. A payment method is required, but you pay nothing that week.<br><br>Before we charge you, we email you with a stop button (one click). You can also stop via Settings → Manage subscription.<br><br>Not happy within 14 days after your first payment? Money back, no hassle.",
      faq_first_q: "What do I see the first time I sign in?",
      faq_first_a:
        "First you try the day start anonymously. Then you create an account and start a 7-day trial. On low energy you get one first step. With more energy, up to three.",
      faq_cycle_q: "How do cycle and ADHD meet?",
      faq_cycle_a:
        "Some weeks your energy feels different. In Structuro you can optionally include your cycle phase as quiet context next to your energy: gentler suggestions in heavier weeks, no pressure to do more. You turn it on yourself. No diagnosis, no steering. Read more: <a href=\"/cyclus/\">View the cycle page</a>.",
      story_eyebrow: "The story behind Structuro",
      story_h2:
        "Proud of my brain, but sometimes floored by one simple email.",
      story_p1:
        "Both true, same day. Every planner I tried assumed a brain I don't have. So I built, with a hundred ADHD people, something that starts from the brain you already have.",
      story_quote: "Every brain is <em>beautiful</em>. But not every system fits.",
      story_role: "Niels, founder with ADHD",
      story_alt: "Niels, maker of Structuro",
      slot_h2: 'Your brain deserves calm.<br>Not more <span class="it">systems</span>.',
      slot_support:
        "You don't have to do it perfectly every day. The app adapts to you, not the other way around. Starting is enough.",
      footer_made: "Made in the Netherlands",
      footer_privacy: "Privacy policy",
      footer_terms: "Terms",
      footer_cookies: "Cookies",
      footer_research: "Research",
      footer_a11y: "Accessibility",
      footer_press: "Press",
      footer_story: "Story",
    },
  };

  window.V2_I18N = T;

  function detectLang() {
    try {
      var path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
      if (/(^|\/)en(\/|$)/.test(path)) return "en";
    } catch (e0) {}
    try {
      var params = new URLSearchParams(window.location.search);
      var q = (params.get("lang") || "").toLowerCase();
      if (q === "en") {
        try {
          if ((window.location.pathname || "/") === "/") {
            window.location.replace("/en/" + (window.location.hash || ""));
            return "en";
          }
        } catch (e1) {}
        return "en";
      }
      if (q === "nl") return "nl";
    } catch (e) {}
    return "nl";
  }

  var currentLang = detectLang();
  window.currentLang = currentLang;

  function syncLangButtons(lang) {
    var nl = document.getElementById("btnNL");
    var en = document.getElementById("btnEN");
    if (nl) {
      nl.classList.toggle("on", lang === "nl");
      if (lang === "nl") nl.setAttribute("aria-current", "page");
      else nl.removeAttribute("aria-current");
    }
    if (en) {
      en.classList.toggle("on", lang === "en");
      if (lang === "en") en.setAttribute("aria-current", "page");
      else en.removeAttribute("aria-current");
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
    if (typeof window.applySignupBridgeLinks === "function") {
      window.applySignupBridgeLinks();
    } else if (typeof window.structuroSignupBridgeUrl === "function") {
      document.querySelectorAll("[data-signup-bridge]").forEach(function (el) {
        var content = el.getAttribute("data-signup-bridge") || "cta";
        el.setAttribute("href", window.structuroSignupBridgeUrl(content));
      });
    }
    if (typeof window.refreshWhySheet === "function") {
      window.refreshWhySheet();
    }
    if (typeof window.refreshZelftestCopy === "function") {
      window.refreshZelftestCopy();
    }
  }

  function setLang(lang) {
    if (lang !== "en" && lang !== "nl") return;
    var path = window.location.pathname || "/";
    var onEn = /(^|\/)en(\/|$)/.test(path.replace(/\/+$/, "") || "/");
    var onV2 = path === "/v2" || path.indexOf("/v2/") === 0;
    if (lang === "en" && !onEn) {
      window.location.href = onV2 ? "/v2/en/" : "/en/";
      return;
    }
    if (lang === "nl" && onEn) {
      window.location.href = onV2 ? "/v2/" : "/";
      return;
    }
    currentLang = lang;
    window.currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
    document.documentElement.lang = lang;
    syncLangButtons(lang);
    applyTranslations();
  }

  window.setLang = setLang;

  document.addEventListener("DOMContentLoaded", function () {
    setLang(currentLang);
  });
})();
