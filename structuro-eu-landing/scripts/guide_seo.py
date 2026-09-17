"""On-page SEO-lens voor gidsen (SE Ranking-toets, zonder keyword-spam).

Toets die we wél halen in HTML:
- primary query in title, description, H1, eerste 150 woorden, minstens één H2, FAQ, strong, img-alt
- Engelse zoektaal als alias-URL (301 naar canonieke NL-slug)
- bronlinks naar een 200/203 landing (PubMed), niet naar doi.org 302

Bewust niet: densiteit naar 2–5% jagen, Domain Trust, server-IP, Amplitude/Clarity eruit.
"""
from __future__ import annotations

import re

# doi.org geeft 302 naar de uitgever. PubMed landt zonder die hop.
DOI_TO_STABLE = {
    "https://doi.org/10.1016/j.biopsych.2005.02.005": "https://pubmed.ncbi.nlm.nih.gov/15950006/",
    "https://doi.org/10.1016/S0065-2601(06)38002-1": "https://pubmed.ncbi.nlm.nih.gov/17139775/",
    "https://doi.org/10.1038/nrdp.2015.27": "https://pubmed.ncbi.nlm.nih.gov/27188913/",
    "https://doi.org/10.1016/j.jpeds.2009.01.018": "https://pubmed.ncbi.nlm.nih.gov/19432051/",
    "https://doi.org/10.1146/annurev-psych-113011-143750": "https://pubmed.ncbi.nlm.nih.gov/23020686/",
    "https://doi.org/10.1037/0022-3514.79.6.995": "https://pubmed.ncbi.nlm.nih.gov/11138758/",
    "https://doi.org/10.1037/0033-2909.133.1.65": "https://pubmed.ncbi.nlm.nih.gov/17324033/",
    "https://doi.org/10.1002/mpr.1440": "https://pubmed.ncbi.nlm.nih.gov/25044830/",
    "https://doi.org/10.1016/j.neuropsychologia.2012.09.036": "https://pubmed.ncbi.nlm.nih.gov/23022430/",
    "https://doi.org/10.1097/JOM.0b013e3181aed389": "https://pubmed.ncbi.nlm.nih.gov/19333148/",
    "https://doi.org/10.1186/1471-244X-13-59": "https://pubmed.ncbi.nlm.nih.gov/23435149/",
    "https://doi.org/10.1016/j.comppsych.2017.10.008": "https://pubmed.ncbi.nlm.nih.gov/29121554/",
    "https://doi.org/10.1016/j.biopsych.2005.03.024": "https://pubmed.ncbi.nlm.nih.gov/15950000/",
    "https://doi.org/10.1016/j.biopsych.2011.01.027": "https://pubmed.ncbi.nlm.nih.gov/21489408/",
    "https://doi.org/10.1007/s12402-016-0214-5": "https://pubmed.ncbi.nlm.nih.gov/27771825/",
    "https://doi.org/10.3389/fpsyt.2023.1336040": "https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2023.1336040/full",
    "https://doi.org/10.1177/1087054720978557": "https://pubmed.ncbi.nlm.nih.gov/33426971/",
    "https://doi.org/10.1016/j.jaac.2021.12.004": "https://pubmed.ncbi.nlm.nih.gov/34973366/",
    "https://doi.org/10.1037/a0032374": "https://pubmed.ncbi.nlm.nih.gov/23527647/",
    "https://doi.org/10.1016/j.bpsc.2016.01.007": "https://pubmed.ncbi.nlm.nih.gov/27722208/",
    "https://doi.org/10.1177/1087054718772138": "https://pubmed.ncbi.nlm.nih.gov/29759042/",
    "https://doi.org/10.1371/journal.pone.0089129": "https://pubmed.ncbi.nlm.nih.gov/24586543/",
    "https://doi.org/10.1016/j.cpr.2016.12.004": "https://pubmed.ncbi.nlm.nih.gov/28088686/",
    "https://doi.org/10.1207/s15516709cog1202_4": "https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog1202_4",
}

SEO: dict[str, dict] = {
    "niet-kunnen-beginnen-adhd": {
        "primary_query": "ADHD paralysis",
        "url_aliases": ["adhd-paralysis"],
        "meta_title": "ADHD paralysis: niet kunnen beginnen",
        "description": (
            "ADHD paralysis is niet luiheid. Bij ADHD hapert de start: te groot, te veel "
            "opties of te weinig energie. Hoe je vandaag één haalbare stap zet."
        ),
        "h1": "ADHD paralysis: niet kunnen beginnen met ADHD, geen luiheid",
        "answer": (
            "Niet kunnen beginnen bij ADHD heet in het Engels vaak ADHD paralysis: je weet wat je moet doen, "
            "de start blijft uit. Dat is taakinitiatie-frictie, geen luiheid. Geen strengere planner. "
            "Benoem de frictie, maak de eerste fysieke handeling kleiner, houd de rest uit beeld. "
            "Kies daarna op het gat: visuele tijd, opslag, opdeling, of starthulp."
        ),
        "h2": "Wat ADHD paralysis is: je weet wat je moet doen",
        "body_lead": (
            "Je weet wat er moet gebeuren. Soms al dagen. En toch blijft de start uit. In het Engels "
            "heet dat vaak <strong>ADHD paralysis</strong>: wel willen, niet starten. Dat voelt als falen, "
            "vooral als anderen 'gewoon beginnen' alsof dat een knop is. Bij veel ADHD-breinen is die knop "
            "het probleem: intentie is er, executie hapert. Niet kunnen beginnen is geen moreel oordeel. "
            "Het is een startprobleem. Lees ook "
            '<a href="/waarom-gewoon-beginnen-niet-werkt/">waarom \'gewoon beginnen\' niet werkt</a>. '
            'Bij volwassen vrouwen hoort daar vaak werk plus huis bij: <a href="/adhd-bij-vrouwen/">ADHD bij vrouwen</a> '
            "blijft bij die executie, niet bij een test."
        ),
        "faq": (
            "Is ADHD paralysis hetzelfde als luiheid of uitstelgedrag?",
            "Nee. ADHD paralysis is een startprobleem: je wilt wel, de ingang ontbreekt. Uitstel kan soms een keuze zijn. Luiheid is een oordeel, geen beschrijving van de frictie.",
        ),
        "img_alt": "ADHD paralysis: Structuro-dagstart met één kleine startstap op de telefoon",
    },
    # overprikkeling-adhd is hand-HTML; query + alias staan hier ter documentatie.
    "overprikkeling-adhd": {
        "primary_query": "overprikkeling ADHD",
        "url_aliases": ["sensory-overload-adhd"],
        "meta_title": "Overprikkeling ADHD: avond afsluiten",
        "img_alt": "Overprikkeling ADHD: avond afsluiten na een volle dag, Structuro-dagstart",
    },
    "taakverlamming-adhd": {
        "primary_query": "taakverlamming ADHD",
        "url_aliases": ["task-paralysis-adhd", "adhd-taakverlamming"],
        "meta_title": "Taakverlamming ADHD: als alles te groot is",
        "description": (
            "Taakverlamming ADHD, in het Engels vaak task paralysis, is geen luiheid. "
            "Te veel stappen tegelijk. Wat je kunt doen zonder te forceren."
        ),
        "h1": "Taakverlamming ADHD: wat helpt als alles tegelijk te groot is",
        "h2": "Taakverlamming ADHD: te veel tegelijk zichtbaar",
        "body_lead": (
            "Taakverlamming ADHD voelt zwaar, en dat is het van binnen ook. In het Engels heet hetzelfde "
            "vaak <strong>task paralysis</strong>: te veel stappen tegelijk, geen veilige klik. Buiten ziet "
            "het eruit als niks doen. Je zit voor een scherm, een aanrecht, een inbox. Je hoofd draait. "
            "Je lichaam niet. Dat is geen theater. Het is een systeem dat te veel opties tegelijk probeert te dragen."
        ),
        "faq": (
            "Is taakverlamming ADHD hetzelfde als ADHD paralysis?",
            "Dichtbij, niet hetzelfde. ADHD paralysis gaat vaker over de start zelf. Taakverlamming is de berg: alles voelt tegelijk te groot. De startkaart: niet kunnen beginnen.",
        ),
        "img_alt": "Taakverlamming ADHD: Structuro toont één taak in plaats van de hele berg",
    },
    "tijdblindheid-adhd": {
        "primary_query": "tijdblindheid ADHD",
        "url_aliases": ["time-blindness-adhd"],
        "meta_title": "Tijdblindheid ADHD: time blindness",
        "description": (
            "Tijdblindheid ADHD, time blindness in het Engels, is geen blinde klok. "
            "Later blijft later. Hoe je de start dichterbij 'nu' zet."
        ),
        "h1": "Tijdblindheid ADHD: waarom later te lang later blijft",
        "h2": "Tijdblindheid ADHD en time blindness: nu versus later",
        "body_lead": (
            "<strong>Tijdblindheid ADHD</strong>, in het Engels time blindness, is een populair woord, geen medische stempel. "
            "Mensen gebruiken het voor een merkbare afwijking: inschatten hoe lang iets duurt, of wanneer later ophoudt later te zijn. "
            "De start blijft daardoor in 'straks' hangen, ook als de deadline dichterbij komt."
        ),
        "faq": (
            "Is tijdblindheid ADHD hetzelfde als time blindness?",
            "Ja, time blindness is de Engelse naam die mensen gebruiken. Het is geen diagnose. Het beschrijft dat nu versus later waziger aanvoelt, waardoor starten blijft hangen.",
        ),
        "img_alt": "Tijdblindheid ADHD: één startbare stap in de Structuro-dagstart",
    },
    "adhd-planner-die-niet-overvraagt": {
        "primary_query": "ADHD-planner",
        "meta_title": "ADHD-planner die niet overvraagt",
        "description": (
            "Een ADHD-planner die niet overvraagt start klein. Minder tegelijk zichtbaar, "
            "energie eerst, geen straf voor een gemiste dag."
        ),
        "h1": "ADHD-planner die niet overvraagt: start, geen weekoverzicht",
        "h2": "Wat een ADHD-planner wél en niet hoeft te doen",
        "body_lead": (
            "Een <strong>ADHD-planner</strong> belooft overzicht, en laat je daarna met de hele week zitten. "
            "Wat je zoekt is geen vollere agenda. Het is een start die klein genoeg is om vandaag te raken, "
            "zonder een tweede baas in je zak."
        ),
        "faq": (
            "Waar let je op bij een ADHD-planner?",
            "Op starten, niet op overzicht. Weinig tegelijk in beeld, energie eerst, geen streak die je aanklaagt. Een planner die taken spaart zonder eerste klik lost het startprobleem niet op.",
        ),
        "img_alt": "ADHD-planner die niet overvraagt: Structuro met één taak, geen weekoverzicht",
    },
    "beste-adhd-app-nederland": {
        "primary_query": "beste ADHD-app",
        "url_aliases": ["beste-adhd-app"],
        "meta_title": "Beste ADHD-app in Nederland? Kies op knelpunt",
        "description": (
            "De beste ADHD-app in Nederland is geen ranking. Kies op knelpunt: starten, "
            "visuele tijd of overzicht. Daarna pas de tool."
        ),
        "h1": "Beste ADHD-app in Nederland? Kies op knelpunt, niet op ranking",
        "h2": "Wat de beste ADHD-app wél moet raken",
        "body_lead": (
            "De <strong>beste ADHD-app</strong> is de app die jouw gat raakt. Starten, tijd zien of overzicht bewaren "
            "zijn drie jobs. Een store-lijst met sterren vertelt dat niet. Kies eerst het knelpunt, daarna de tool."
        ),
        "faq": (
            "Wat is de beste ADHD-app in Nederland?",
            "Geen universele winnaar. Als je niet start, wil je starthulp. Als tijd wazig is, een visuele dagkaart. Als je bang bent iets te verliezen, een lijst. Deze pagina is een matchtest, geen ranking.",
        ),
        "img_alt": "Beste ADHD-app in Nederland: Structuro-dagstart, kiezen op knelpunt",
    },
    "alternatief-voor-todo-lijst-adhd": {
        "primary_query": "to-do-lijst ADHD",
        "meta_title": "To-do-lijst ADHD: minder lijst, meer start",
        "description": (
            "Een to-do-lijst ADHD groeit vaak sneller dan jij start. Minder zichtbaar, "
            "één stap, dumps in de lade. Geen tweede inbox."
        ),
        "h1": "To-do-lijst ADHD: een alternatief dat wél laat starten",
        "h2": "Waarom een to-do-lijst ADHD zwaarder maakt",
        "body_lead": (
            "Een <strong>to-do-lijst ADHD</strong> bewaart alles, en vraagt daarna nog steeds de eerste klik. "
            "Een echt alternatief is geen langere inbox in een ander jasje. Het is minder tegelijk zichtbaar, "
            "één eerste stap, en dumps die niet meteen taken worden."
        ),
        "faq": (
            "Wat is een goed alternatief voor een to-do-lijst ADHD?",
            "Geen tweede lijst. Wel een smal zichtveld: de berg mag in de lade, op het scherm alleen wat je nu kunt raken. Dumps mogen bestaan zonder meteen taken te zijn.",
        ),
        "img_alt": "To-do-lijst ADHD: één startstap in Structuro, geen tweede inbox",
    },
    "structuro-of-tiimo": {
        "primary_query": "Structuro vs Tiimo",
        "url_aliases": ["structuro-vs-tiimo"],
        "meta_title": "Structuro vs Tiimo: tijd zien of starten",
        "description": (
            "Structuro vs Tiimo: Tiimo helpt visuele tijd en routines. Structuro helpt beginnen "
            "met één stap. Eerlijk, zonder winnaar-claim."
        ),
        "h1": "Structuro vs Tiimo: visuele tijd versus starten",
        "h2": "Structuro vs Tiimo: twee jobs, geen kopie",
        "body_lead": (
            "<strong>Structuro vs Tiimo</strong> is geen wedstrijd om de titel 'ADHD-app'. Tiimo maakt tijd zichtbaar. "
            "Structuro maakt de eerste klik kleiner. Als je de dag al ziet en nog steeds niet start, is visuele tijd niet het gat."
        ),
        "faq": (
            "Wanneer kies je Structuro vs Tiimo?",
            "Kies Tiimo als het knelpunt tijd zien en overgangen is. Kies Structuro als je wel wilt, maar de start te groot voelt. Beide kunnen 'voor ADHD' zeggen. De job is anders.",
        ),
        "img_alt": "Structuro vs Tiimo: starten met één stap in plaats van visuele tijd",
    },
    "structuro-of-structured": {
        "primary_query": "Structuro vs Structured",
        "url_aliases": ["structuro-vs-structured"],
        "meta_title": "Structuro vs Structured: tijdlijn of start",
        "description": (
            "Structuro vs Structured: Structured zet de dag op een tijdlijn. Structuro helpt "
            "de eerste stap. Eerlijk wanneer welke past."
        ),
        "h1": "Structuro vs Structured: tijdlijn versus eerste stap",
        "h2": "Structuro vs Structured: vullen of starten",
        "body_lead": (
            "<strong>Structuro vs Structured</strong> klinkt als twee keer hetzelfde, en is het niet. Structured tekent de dag. "
            "Structuro vraagt de volgende kleine actie. Een volle tijdlijn die je niet aanraakt is geen kapotte app. Executie ontbreekt."
        ),
        "faq": (
            "Is Structuro vs Structured een kopie-vergelijking?",
            "Nee. Structured visualiseert wanneer. Structuro helpt wat de eerste actie is, passend bij energie. Namen lijken. De job niet.",
        ),
        "img_alt": "Structuro vs Structured: eerste stap versus tijdlijn",
    },
    "structuro-of-todoist": {
        "primary_query": "Structuro vs Todoist",
        "url_aliases": ["structuro-vs-todoist"],
        "meta_title": "Structuro vs Todoist: lijst of start",
        "description": (
            "Structuro vs Todoist: Todoist bewaart taken. Structuro helpt de eerste klik. "
            "Eerlijk wanneer een lijst past, en wanneer starten de klus is."
        ),
        "h1": "Structuro vs Todoist: als de lijst niet laat starten",
        "h2": "Structuro vs Todoist: bewaren of beginnen",
        "body_lead": (
            "<strong>Structuro vs Todoist</strong> gaat over twee lagen. Todoist is sterk in vangen, taggen, projecten houden. "
            "Structuro is er als die lijst al perfect is en je toch niet begint: energie eerst, één kleine stap, weinig in beeld."
        ),
        "faq": (
            "Wanneer wint Structuro vs Todoist?",
            "Niet als wedstrijd. Todoist wint op vastleggen. Structuro wint op starten vandaag. Heb je al een nette lijst en blijf je stilstaan, dan is de lijst niet het gat.",
        ),
        "img_alt": "Structuro vs Todoist: starten versus een langere takenlijst",
    },
    "structuro-of-goblin-tools": {
        "primary_query": "Goblin Tools ADHD",
        "url_aliases": ["goblin-tools-adhd"],
        "meta_title": "Goblin Tools ADHD: opdelen of start",
        "description": (
            "Goblin Tools ADHD deelt een te grote zin op. Structuro helpt de eerste klik "
            "in een dagelijkse lus. Eerlijke as, geen ranking."
        ),
        "h1": "Goblin Tools ADHD versus Structuro: opdelen of de eerste klik",
        "h2": "Goblin Tools ADHD: een zin kleiner maken",
        "body_lead": (
            "<strong>Goblin Tools ADHD</strong> is sterk als de taak een zin is die te groot voelt: opdelen, herformuleren, toon. "
            "Op <a href=\"https://goblin.tools/\" rel=\"noopener noreferrer\">goblin.tools</a> staat een collectie kleine tools voor als iets te groot of te ingewikkeld voelt. "
            "Magic ToDo deelt items op. Structuro bouwt een dagelijkse lus: energie, selectie, eerste stap, focus, shutdown. "
            "Dat is een andere klus. Allebei 'helpt bij beginnen' zeggen is te grof. De test is: heb je stappen nodig, of een start?"
        ),
        "faq": (
            "Vervangt Goblin Tools ADHD een dagelijkse app?",
            "Nee. Goblin Tools helpt één formulering of knipbeurt. Het bewaakt niet je zichtveld de rest van de dag. Structuro is die lus, geen zins-opdeler.",
        ),
        "img_alt": "Goblin Tools ADHD versus Structuro: opdelen of de eerste klik",
    },
    "adhd-en-burn-out": {
        "primary_query": "ADHD burn-out",
        "url_aliases": ["adhd-burnout"],
        "meta_title": "ADHD burn-out: kleiner starten bij leegte",
        "description": (
            "ADHD burn-out voelt als leeg, en toch een berg. Geen medische pagina. "
            "Wel hoe je de start kleiner maakt als de batterij laag is."
        ),
        "h1": "ADHD burn-out: leegte, een volle agenda, en toch niet starten",
        "h2": "ADHD burn-out en een overvolle agenda: overlap, geen diagnose",
        "body_lead": (
            "<strong>ADHD burn-out</strong> is hier geen stempel. Het is het gevoel dat mensen in gesprekken teruggeven: leeg, "
            "en toch een lijst die blijft. Geen behandeling. Wel een start die kleiner mag dan je ego prettig vindt."
        ),
        "faq": (
            "Is ADHD burn-out een diagnose op deze pagina?",
            "Nee. We beschrijven overlap in het gevoel: leegte plus een berg. Geen medische claim. Als de batterij laag is, is de werkzame zet een kleinere start, niet een vollere planner.",
        ),
        "img_alt": "ADHD burn-out: Structuro start klein als de batterij leeg is",
    },
    "adhd-op-het-werk": {
        "primary_query": "ADHD op het werk",
        "meta_title": "ADHD op het werk: starten tussen meetings",
        "description": (
            "ADHD op het werk is vaak geen kennisprobleem. Het is starten tussen inbox, "
            "meetings en tussendoor. Eén werktaak, zonder productiviteitsreligie."
        ),
        "h1": "ADHD op het werk: niet aan de slag terwijl je er al bent",
        "h2": "ADHD op het werk: de start tussen twee meetings",
        "body_lead": (
            "<strong>ADHD op het werk</strong> laat zich zelden zien als 'ik snap mijn vak niet'. Je zit al aan je bureau. "
            "De inbox, de chat, de volgende call. De taak die ertoe doet blijft dicht. Dat is starten in ruis, geen luiheid."
        ),
        "faq": (
            "Wat helpt bij ADHD op het werk als je al 'bezig' bent?",
            "Eén werktaak zichtbaar, de rest uit beeld. Kies een eerste fysieke klik die in de kieren tussen meetings past. Geen productiviteitsreligie, geen inhalen van gisteren in één blok.",
        ),
        "img_alt": "ADHD op het werk: één startbare taak tussen meetings",
    },
    "adhd-ochtendroutine": {
        "primary_query": "ADHD-ochtendroutine",
        "meta_title": "ADHD-ochtendroutine: klein houden",
        "description": (
            "Een ADHD-ochtendroutine hoeft geen perfecte keten te zijn. Minder stappen, "
            "energie eerst, één eerste klik. Geen 5:00-mythe."
        ),
        "h1": "ADHD-ochtendroutine: dagstart kleiner dan Instagram belooft",
        "h2": "ADHD-ochtendroutine: minder keten, meer eerste klik",
        "body_lead": (
            "Een <strong>ADHD-ochtendroutine</strong> faalt vaak omdat de keten te lang is: douchen, ontbijt, journal, sport, inbox. "
            "Wat wél helpt is kleiner: energie eerst, één eerste klik, geen theater dat al kapot is voordat je begint."
        ),
        "faq": (
            "Moet een ADHD-ochtendroutine elke dag hetzelfde zijn?",
            "Nee. Vaste ketens breken op lage energie. Houd een kleine default: wakker worden, energie benoemen, één haalbare start. De rest mag wachten.",
        ),
        "img_alt": "ADHD-ochtendroutine: een kleine dagstart in Structuro, geen ochtendtheater",
    },
    "adhd-uitstelgedrag": {
        "primary_query": "ADHD uitstelgedrag",
        "meta_title": "ADHD uitstelgedrag: start te groot",
        "description": (
            "ADHD uitstelgedrag is niet altijd luiheid of geen zin. Vaak is de taak te groot "
            "om te starten. Hoe je het verschil voelt, en wat je dan doet."
        ),
        "h1": "ADHD uitstelgedrag: uitstel, of een start die te groot is",
        "h2": "ADHD uitstelgedrag: keuze of geblokkeerde start",
        "body_lead": (
            "<strong>ADHD uitstelgedrag</strong> klinkt als uitstel, en voelt van binnen als een muur. Soms is het wachten tot later. "
            "Vaker is de eerste handeling te groot, te vaag of te alleen. Dat onderscheid bepaalt of je 'meer discipline' nodig hebt, of een kleinere ingang."
        ),
        "faq": (
            "Is ADHD uitstelgedrag hetzelfde als luiheid?",
            "Nee. Luiheid is niet willen. Uitstel kan een keuze zijn. Bij ADHD is de start vaak te groot of te vaag: je wilt wel, de ingang ontbreekt. Maak de eerste fysieke actie kleiner.",
        ),
        "img_alt": "ADHD uitstelgedrag: de start kleiner maken in de Structuro-dagstart",
    },
    "adhd-keuzestress": {
        "primary_query": "ADHD keuzestress",
        "meta_title": "ADHD keuzestress: kiezen is de taak",
        "description": (
            "ADHD keuzestress is vaak een vol werkgeheugen, geen zwakke wil. Minder opties "
            "in beeld, één default, dan starten."
        ),
        "h1": "ADHD keuzestress: als kiezen al de taak is",
        "h2": "ADHD keuzestress: te veel deuren tegelijk",
        "body_lead": (
            "<strong>ADHD keuzestress</strong> is niet 'niet kunnen kiezen wie je bent'. Het is twaalf redelijke opties, geen default, "
            "en een werkgeheugen dat ze allemaal vast wil houden. Dan wordt kiezen zelf de taak, en blijft de start uit."
        ),
        "faq": (
            "Wat helpt bij ADHD keuzestress?",
            "Minder opties in beeld. Eén default voor vandaag. Daarna pas vergelijken als er energie is. Oneindig research is ook een start die niet begint.",
        ),
        "img_alt": "ADHD keuzestress: één default in Structuro, niet twaalf opties",
    },
    "takenlijst-te-lang-adhd": {
        "primary_query": "takenlijst ADHD",
        "meta_title": "Takenlijst ADHD: minder in beeld",
        "description": (
            "Een te lange takenlijst ADHD maakt starten zwaarder. Gebruik de lijst als lade, "
            "en breng vandaag terug tot een paar regels."
        ),
        "h1": "Takenlijst ADHD: overweldigd door de lijst, niet door de dag",
        "h2": "Takenlijst ADHD: de berg mag in de lade",
        "body_lead": (
            "Een lange <strong>takenlijst ADHD</strong> voelt als bewijs dat je de dag al verloren hebt, vóór je begint. "
            "De lijst mag bestaan. Op het scherm hoort alleen wat je nu kunt raken. Anders wint bewaren van beginnen."
        ),
        "faq": (
            "Moet ik mijn takenlijst ADHD weggooien?",
            "Nee. Parkeer de berg. Toon vandaag één tot een paar regels. De lijst is een lade, geen startscherm. Wat je niet ziet, hoeft je werkgeheugen niet vast te houden.",
        ),
        "img_alt": "Takenlijst ADHD: minder in beeld, één stap in Structuro",
    },
    "adhd-focus-zonder-streaks": {
        "primary_query": "ADHD-app zonder streaks",
        "meta_title": "ADHD-app zonder streaks",
        "description": (
            "Een ADHD-app zonder streaks straft een gemiste dag niet. Korte blokken, "
            "een kleine start, aandacht zonder gehoorzaamheidsspel."
        ),
        "h1": "ADHD-app zonder streaks: aandacht zonder gehoorzaamheidsspel",
        "h2": "Waarom een ADHD-app zonder streaks lichter voelt",
        "body_lead": (
            "Een <strong>ADHD-app zonder streaks</strong> laat focus menselijk. Een vuurstreak die breekt voelt als falen, "
            "en maakt de volgende start zwaarder. Korte blokken mogen. Stoppen mag. Aandacht is geen gehoorzaamheidsspel."
        ),
        "faq": (
            "Helpt een ADHD-app zonder streaks nog om door te gaan?",
            "Ja, als de lus klein blijft: starten, kort werken, stoppen zonder inhalen. Streaks helpen wie ze als spel voelt. Wie ze als aanklacht voelt, heeft er niks aan.",
        ),
        "img_alt": "ADHD-app zonder streaks: focus starten in Structuro, geen vuurstreak",
    },
    "adhd-bij-vrouwen": {
        "primary_query": "ADHD bij vrouwen",
        "meta_title": "ADHD bij vrouwen: starten bij werk en huis",
        "description": (
            "ADHD bij vrouwen: niet beginnen terwijl werk en huis trekken. Geen test "
            "of medicatie. Wel één haalbare stap."
        ),
        "h1": "ADHD bij vrouwen: starten als werk en huis allebei trekken",
        "h2": "ADHD bij vrouwen: executie, geen diagnoselijst",
        "body_lead": (
            "<strong>ADHD bij vrouwen</strong> wordt online vaak een medische pagina: symptomen, test, medicatie. Die intentie bedienen we niet. "
            "Wat we wél herkennen: je weet wat er moet gebeuren, werk en huis trekken allebei, en de start blijft uit."
        ),
        "faq": (
            "Is deze pagina over ADHD bij vrouwen een test of symptoomlijst?",
            "Nee. Geen diagnose, geen medicatie, geen checklist. Het gaat over starten als werk en huis allebei trekken: minder tegelijk, energie eerst, één kleine actie.",
        ),
        "img_alt": "ADHD bij vrouwen: starten als werk en huis allebei trekken",
    },
    "adhd-app": {
        "primary_query": "ADHD-app",
        "meta_title": "ADHD-app voor wie niet begint",
        "description": (
            "Structuro is een rustige ADHD-app voor volwassenen die weten wat er moet gebeuren, "
            "maar niet beginnen. Energie eerst, één stap, geen streaks."
        ),
        "h1": "ADHD-app: voor wie niet begint, geen planner om alles te beheren",
        "h2": "Wat deze ADHD-app wel en niet is",
        "body_lead": (
            "Een <strong>ADHD-app</strong> belooft vaak overzicht, routines of een winkellijst met sterren. Structuro is gebouwd voor het andere gat: "
            "je weet wat er moet gebeuren, en je begint niet. Energie eerst, één stap, geen planner om alles te beheren."
        ),
        "faq": (
            "Voor wie is deze ADHD-app?",
            "Voor volwassenen die weten wat ze moeten doen en niet starten. Niet voor wie een medische behandeling zoekt, en niet voor wie vooral een klassieke planner mist.",
        ),
        "img_alt": "ADHD-app Structuro: prikkelarme dagstart voor wie niet begint",
    },
    "executieve-functies-adhd": {
        "primary_query": "executieve functies ADHD",
        "url_aliases": ["executive-dysfunction-adhd"],
        "meta_title": "Executieve functies ADHD: starten",
        "description": (
            "Executieve functies ADHD gaan over starten, kiezen en bijsturen. Niet iedereen "
            "hapert hetzelfde. Wat de term betekent, en wat je praktisch kunt doen."
        ),
        "h1": "Executieve functies ADHD: taakinitiatie, geen universeel profiel",
        "h2": "Executieve functies ADHD en executive dysfunction",
        "body_lead": (
            "<strong>Executieve functies ADHD</strong> klinken klinisch, en beschrijven iets alledaags: starten, kiezen, bijsturen. "
            "Niet iedereen hapert op dezelfde plek. Deze gids blijft bij taakinitiatie, geen universeel profiel."
        ),
        "faq": (
            "Is executive dysfunction hetzelfde als executieve functies ADHD?",
            "Executive dysfunction is de Engelse zoekterm. Executieve functies zijn de vaardigheden. Dysfunctie is geen extra diagnose op deze pagina. Het beschrijft dat starten, kiezen of bijsturen hapert.",
        ),
        "img_alt": "Executieve functies ADHD: taakinitiatie als één kleine stap in Structuro",
    },
    "waarom-gewoon-beginnen-niet-werkt": {
        "primary_query": "gewoon beginnen ADHD",
        "meta_title": "Gewoon beginnen ADHD: wat wel werkt",
        "description": (
            "Gewoon beginnen ADHD klinkt logisch, en blokkeert vaak. De berg is zichtbaar, "
            "de eerste klik niet. Zo maak je de start kleiner."
        ),
        "h1": "Gewoon beginnen ADHD: waarom dat advies de start steelt",
        "h2": "Gewoon beginnen ADHD: wat er gebeurt vóór je start",
        "body_lead": (
            "<strong>Gewoon beginnen ADHD</strong> klinkt logisch als je al weet wat er moet gebeuren. Voor een brein met executieve frictie is dat advies vaak het probleem zelf. "
            "De intentie is er. De startknop niet. Je blijft hangen tussen weten en doen."
        ),
        "faq": (
            "Waarom werkt gewoon beginnen bij ADHD zo vaak niet?",
            "Omdat het advies de hele keten in één keer vraagt. Bij ADHD-breinen hapert taakinitiatie: de berg is zichtbaar, de eerste klik niet. Maak de start kleiner dan je ego prettig vindt.",
        ),
        "img_alt": "Gewoon beginnen ADHD: Structuro maakt de eerste klik kleiner dan de berg",
    },
    "een-stap-per-dag": {
        "primary_query": "één stap per dag ADHD",
        "meta_title": "Eén stap per dag ADHD: kleiner starten",
        "description": (
            "Eén stap per dag ADHD: met een vol hoofd helpt niet méér plannen. Kies één "
            "haalbare stap, zonder shame, streaks of een overvolle lijst."
        ),
        "h1": "Eén stap per dag ADHD: een taak per dag, niet de hele berg",
        "h2": "Eén stap per dag ADHD: de regel",
        "body_lead": (
            "<strong>Eén stap per dag ADHD</strong> is omgekeerd aan 'meer organiseren'. Als alles tegelijk voelt, groeit de lijst. "
            "De start blijft uit. Je hebt dan gewerkt aan je systeem zonder iets te doen dat de last echt verlaagt. "
            "Verklein het zichtveld tot één haalbare actie. De rest mag wachten."
        ),
        "faq": (
            "Is één stap per dag ADHD niet te weinig?",
            "Voor starten is het vaak precies genoeg. Momentum komt na de eerste actie, niet ervoor. Meer mag als er energie is. Minder mag niet onder nul: nul is stilstaan met extra schuld.",
        ),
        "img_alt": "Eén stap per dag ADHD: één taak in de Structuro-dagstart",
    },
    "waarom-planners-falen": {
        "primary_query": "waarom planners falen",
        "meta_title": "Waarom planners falen bij ADHD",
        "description": (
            "Waarom planners falen bij ADHD: ze bewaren taken en starten ze niet. "
            "Executie in plaats van overzicht, zonder streak of schaamte."
        ),
        "h1": "Waarom planners falen bij een ADHD-brein (en wat wél helpt)",
        "h2": "Waarom planners falen: overzicht is niet de start",
        "body_lead": (
            "<strong>Waarom planners falen</strong> is zelden 'jij houdt het niet bij'. Ze optimaliseren voor overzicht, reminders en streaks. "
            "Een ADHD-brein heeft vooral hulp bij starten zonder schaamte. Meer lat maakt de berg scherper, niet lichter."
        ),
        "faq": (
            "Waarom planners falen, ook de rustige?",
            "Omdat rustig nog steeds bewaren is. Als de eerste klik ontbreekt, voelt een zachtere planner als dezelfde lat in een ander jasje. Je hebt executie nodig, geen tweede inbox.",
        ),
        "img_alt": "Waarom planners falen bij ADHD: Structuro start, in plaats van meer overzicht",
    },
    "mentale-belasting-dagstart": {
        "primary_query": "mentale belasting ADHD",
        "meta_title": "Mentale belasting ADHD: dagstart",
        "description": (
            "Mentale belasting ADHD voelt als een vol hoofd vóór je begint. Een korte "
            "dagstart verlaagt keuzedruk, zonder ochtendtheater."
        ),
        "h1": "Mentale belasting ADHD: de dagstart vóór de lijst",
        "h2": "Mentale belasting ADHD: keuzedruk vóór je start",
        "body_lead": (
            "<strong>Mentale belasting ADHD</strong> is de onzichtbare to-do in je hoofd: onthouden, kiezen, bijsturen. "
            "Nog vóór je een lijst opent is de tank al lager. Een korte dagstart verlaagt die druk, zonder ochtendtheater."
        ),
        "faq": (
            "Helpt een langere ochtendroutine tegen mentale belasting ADHD?",
            "Zelden. Extra stappen zijn extra invoer. Wat helpt is minder kiezen vóór de eerste klik: energie benoemen, één taak, de rest parkeren.",
        ),
        "img_alt": "Mentale belasting ADHD: een smallere dagstart in Structuro",
    },
    "energie-first": {
        "primary_query": "energie-first ADHD",
        "meta_title": "Energie-first ADHD: plannen op energie",
        "description": (
            "Energie-first ADHD: kies taken rond je energie, niet je energie rond je to-do. "
            "Zonder hustle, shame of een vaste lat die je breekt."
        ),
        "h1": "Energie-first ADHD: plannen op energie, niet op moeten",
        "h2": "Energie-first ADHD: de lat volgt de batterij",
        "body_lead": (
            "<strong>Energie-first ADHD</strong> betekent: je dag bouwen rond wat je nu aankunt, niet rond wat je zou moeten. "
            "Op lage energie kies je één kleine stap. Op hoge energie mag er meer. De lijst volgt de batterij, niet andersom."
        ),
        "faq": (
            "Is energie-first ADHD hetzelfde als minder doen?",
            "Nee. Het is de volgorde omdraaien: eerst haalbaarheid, dan omvang. Moeilijke taken verdwijnen niet. Ze wachten op een dag waarop starten ze aankan.",
        ),
        "img_alt": "Energie-first ADHD: eerst haalbaarheid, dan één stap in Structuro",
    },
}


def _replace_first_tag(html: str, tag: str, inner: str) -> str:
    return re.sub(
        rf"<{tag}>.*?</{tag}>",
        f"<{tag}>{inner}</{tag}>",
        html,
        count=1,
        flags=re.S,
    )


def _rewrite_refs(g: dict) -> None:
    refs = g.get("verantwoording_refs") or []
    if not refs:
        return
    g["verantwoording_refs"] = [
        (cite, DOI_TO_STABLE.get(url, url)) for cite, url in refs
    ]


def _plain(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html or "")


def _wrap_strong(html: str, query: str) -> str:
    if re.search(
        rf"<strong>\s*{re.escape(query)}\s*</strong>", html, flags=re.I
    ):
        return html
    return re.sub(
        re.escape(query), f"<strong>{query}</strong>", html, count=1, flags=re.I
    )


def apply_seo(guides: list[dict]) -> None:
    for g in guides:
        seo = SEO.get(g["slug"])
        if not seo:
            _rewrite_refs(g)
            continue
        query = seo["primary_query"]
        g["primary_query"] = query
        if seo.get("url_aliases"):
            g["url_aliases"] = seo["url_aliases"]
        for key in ("meta_title", "description", "h1", "answer", "img_alt"):
            if seo.get(key):
                g[key] = seo[key]
        if seo.get("h1"):
            g["title"] = seo["h1"]
        body = g.get("body") or ""
        if seo.get("body_lead"):
            body = _replace_first_tag(body, "p", seo["body_lead"])
        if seo.get("h2"):
            body = _replace_first_tag(body, "h2", seo["h2"])
        if query.lower() not in body.lower():
            body = re.sub(
                r"(<p>)",
                rf"\1{query}: ",
                body,
                count=1,
            )
        g["body"] = _wrap_strong(body, query)
        faq = seo.get("faq")
        if faq:
            existing = [q.lower() for q, _ in g.get("faqs") or []]
            if faq[0].lower() not in existing:
                g["faqs"] = [faq, *(g.get("faqs") or [])]
        _rewrite_refs(g)


def cta_img_alt(g: dict) -> str:
    return g.get("img_alt") or (
        "Structuro-dagstart op een telefoon: één taak, microstappen, Start focus"
    )


def og_image_alt(g: dict) -> str:
    q = g.get("primary_query") or "ADHD"
    return f"{q}: Structuro, rustige start voor je ADHD-brein"
