#!/usr/bin/env python3
"""Render SEO/GEO money-pages (gidsen) + sitemap for structuro.eu."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLISHED = "2026-08-08"
MODIFIED = "2026-08-08"
CSS_V = "20260808e"
OG_IMAGE = "https://www.structuro.eu/uploads/structuro-icon.png?v=20260730a"

GUIDES = [
    {
        "slug": "waarom-gewoon-beginnen-niet-werkt",
        "eyebrow": "Taakinitiatie",
        "title": "Waarom 'gewoon beginnen' niet werkt (en wat wel)",
        "description": "Je wilt wel, maar starten lukt niet. Dat is geen luiheid. Zo werkt taakinitiatie bij ADHD-breinen, en wat wél helpt om vandaag één stap te zetten.",
        "answer": (
            "Je wilt wel beginnen, maar de start blijft uit. Dat is geen karakterfout. "
            "Bij veel ADHD-breinen hapert taakinitiatie: het brein ziet de hele taak tegelijk en blokkeert. "
            "Wat helpt is niet 'gewoon doen', maar de start kleiner maken dan je ego prettig vindt, "
            "je energie meewegen, en vandaag bewust één haalbare stap kiezen."
        ),
        "h1": "Waarom 'gewoon beginnen' niet werkt (en wat wel)",
        "body": """
<p>'Gewoon beginnen' klinkt logisch als je al weet wat er moet gebeuren. Voor een brein met executieve frictie is dat advies vaak het probleem zelf. De intentie is er. De startknop niet. Je blijft hangen tussen weten en doen, en dat voelt alsof je faalt terwijl je juist hard nadenkt.</p>

<h2>Wat er gebeurt vóór je begint</h2>
<p>Je ziet niet 'één mail beantwoorden'. Je ziet de hele keten: openen, nadenken, perfect formuleren, bijlagen, follow-up, mogelijke fouten. Die berg voelt als dreiging. Het zenuwstelsel kiest dan uitstel, scrolling of iets anders dat wél meteen beloont. Dat voelt als luiheid. Het is vaker overprikkeling plus een te grote eerste stap.</p>
<p>Daarbij speelt tijdblindheid mee: de taak voelt of 'nu' of 'niet-nu'. Zonder een microscopisch kleine ingang blijft hij in 'niet-nu' hangen, ook als de deadline dichterbij komt.</p>

<h2>Waarom planners dit niet oplossen</h2>
<p>Een agenda of to-do-lijst bewaart wat je moet doen. Hij helpt je zelden om de eerste micro-actie te vinden. Meer overzicht kan juist meer verlamming geven: elk item vraagt weer een beslissing. Als je dat herkent, is het probleem niet 'te weinig plannen'. Het is te weinig executie.</p>
<p>Lees ook <a href="/waarom-planners-falen/">waarom planners falen bij een ADHD-brein</a>. Daar staat het verschil tussen bewaren en beginnen scherper.</p>

<h2>Wat wél werkt: starten kleiner dan comfortabel voelt</h2>
<ul>
<li><strong>Eén zichtbare stap.</strong> Niet tien. Niet drie. Eén.</li>
<li><strong>Energie eerst.</strong> Op een lage dag is 'document openen' genoeg als start. Zie <a href="/energie-first/">energie-first werken</a>.</li>
<li><strong>Geen schuld over gisteren.</strong> Oude lijsten die je aanklagen maken starten zwaarder.</li>
<li><strong>Korte feedback.</strong> Iets afronden, ook klein, geeft dopamine om door te gaan.</li>
<li><strong>Zichtveld smal houden.</strong> De rest mag bestaan, maar niet tegelijk op je scherm. Methode: <a href="/een-stap-per-dag/">één stap per dag</a>.</li>
</ul>

<h2>Een simpele startsequentie</h2>
<ol>
<li>Noem de taak in één zin.</li>
<li>Splits de allereerste fysieke actie af (klik, open, zet klaar).</li>
<li>Maak die actie kleiner tot hij bijna belachelijk voelt.</li>
<li>Doe alleen die actie. Stop daarna bewust, of ga door als er energie is.</li>
</ol>
<p>Dit is geen motivatiecoach. Het is frictie verlagen tot bewegen weer mogelijk is. Past ook bij een hoge mentale last: zie <a href="/mentale-belasting-dagstart/">mentale belasting en de dagstart</a>.</p>

<h2>Veelgemaakte valkuilen</h2>
<p>Wachten op motivatie. Motivatie komt vaak ná de eerste micro-actie, niet ervoor. Alles eerst uitwerken in notities. Dat voelt als vooruitgang, maar houdt de echte start buiten beeld. Een nieuwe app installeren als vervanging voor beginnen. En tot slot: jezelf straffen met een strengere planner nadat een zachtere aanpak 'mislukte'. Meestal was de aanpak te groot, niet te zacht.</p>
<p>Herken je die cyclus, dan is de correctie simpel: kleinere ingang, minder zichtbaar tegelijk, en een dagstart die keuzedruk verlaagt voordat je überhaupt een lijst opent.</p>

<h2>Hoe Structuro hierin past</h2>
<p>Structuro is geen planner. Het is een rustige executie-interface: dagstart, max een paar taken zichtbaar, één eerste stap. Jij bevestigt. Dan begin je. Geen streaks, geen rode achterstand, geen schaamte-score. De belofte is niet 'meer organiseren', maar vandaag wél starten. Gebruik het als starthulp, niet als bewijs dat je eindelijk perfect georganiseerd moet raken. Klein beginnen is hier het punt, geen troostprijs.</p>
""",
        "cta_title": "Begin met één stap",
        "cta_p": "Geen account nodig voor de eerste dagstart. Kies wat haalbaar is. Bevestig. Start.",
        "faqs": [
            (
                "Is 'niet kunnen beginnen' hetzelfde als luiheid?",
                "Nee. Luiheid is niet willen. Taakinitiatie-frictie is wel willen, maar de start niet kunnen vinden of te groot voelen.",
            ),
            (
                "Moet ik mijn hele leven anders inrichten?",
                "Nee. Begin bij vandaag: één haalbare stap, passend bij je energie. De rest mag wachten.",
            ),
            (
                "Helpt een langere to-do-lijst?",
                "Meestal niet. Meer items verhogen vaak de mentale last. Minder zichtbaar tegelijk werkt beter voor starten.",
            ),
            (
                "Wat als ik na de eerste stap stilval?",
                "Dan was de eerste stap alsnog winst. Kies desnoods een nog kleinere vervolgstap, of stop zonder schuld.",
            ),
        ],
    },
    {
        "slug": "een-stap-per-dag",
        "eyebrow": "Methode",
        "title": "Eén stap per dag: met een vol hoofd tóch beginnen",
        "description": "Met een vol hoofd helpt niet méér plannen, maar één haalbare stap. Zo werkt de één-stap-methode zonder shame, streaks of overvolle lijsten.",
        "answer": (
            "Met een vol hoofd win je niet door meer te organiseren. Je wint door vandaag één stap te kiezen "
            "die klein genoeg is om te starten. De rest mag uit zicht. Zo daalt de mentale last, komt er weer "
            "beweging, en hoef je jezelf niet te forceren met een planner-achtige weekbelofte die je toch niet waarmaakt."
        ),
        "h1": "Eén stap per dag: met een vol hoofd tóch beginnen",
        "body": """
<p>Als alles tegelijk voelt, zoekt je brein naar overzicht. Dat eindigt vaak in een langere lijst. De lijst groeit. De start blijft uit. Je hebt dan 'gewerkt aan je systeem' zonder iets te doen dat de last echt verlaagt. De methode hier is omgekeerd: verklein het zichtveld tot één stap.</p>

<h2>De regel</h2>
<p>Kies één ding dat je vandaag kunt afronden of écht starten. Niet het belangrijkste van het jaar. Het haalbare van dit moment. Op lage energie mag dat belachelijk klein zijn: jas ophangen, mail-onderwerp typen, map openen, timer op twee minuten.</p>
<p>De truc is niet maximaliseren. De truc is startbaar maken. Dat sluit aan bij <a href="/waarom-gewoon-beginnen-niet-werkt/">waarom 'gewoon beginnen' niet werkt</a>.</p>

<h2>Waarom dit rust geeft</h2>
<ul>
<li>Je hoeft niet te kiezen uit twintig opties.</li>
<li>Je krijgt sneller een afrondingsgevoel.</li>
<li>Je vermijdt de schaamte van een onafgemaakte mega-lijst.</li>
<li>Je hoofd mag de rest 'parkeren' zonder dat die rest verdwijnt.</li>
</ul>
<p>Dat is geen minimalisme-hobby. Het is cognitieve ontlasting. Zie ook <a href="/mentale-belasting-dagstart/">mentale belasting en de dagstart</a>.</p>

<h2>Hoe je de stap kiest (praktisch)</h2>
<ol>
<li>Schrijf drie kandidaten op, niet meer.</li>
<li>Streep weg wat vandaag om perfectie vraagt.</li>
<li>Houd over wat je binnen vijf tot vijftien minuten kunt aanraken.</li>
<li>Formuleer de stap als werkwoord + object: 'open declaratie-map', niet 'administratie'.</li>
</ol>
<p>Op een hoog-energie dag mag de stap groter. Op een laag-energie dag kleiner. Dat is <a href="/energie-first/">energie-first</a>, geen zwakte.</p>

<h2>Wat je níet doet</h2>
<p>Geen streak die breekt als je een dag mist. Geen weekplanning die je aanklaagt. Geen 'eerst alles uitwerken, dan pas starten'. Eerst bewegen. Dan, als er energie is, een tweede stap. En als die er niet is: stoppen zonder inhalen.</p>

<h2>Voorbeelden van startbare stappen</h2>
<ul>
<li>Administratie → 'open de map Declaraties'.</li>
<li>Sporten → 'doe sportschoenen aan'.</li>
<li>Studeren → 'open document en typ de titel'.</li>
<li>Opruimen → 'zet vijf dingen terug op hun plek'.</li>
<li>Mail → 'schrijf alleen de aanhef en het onderwerp'.</li>
</ul>
<p>Als de stap nog weerstand geeft, was hij nog te groot. Splits opnieuw. Dat is geen falen. Dat is het mechanisme.</p>

<h2>Als je dag 'misukt'</h2>
<p>Dan is er geen streak om te redden. Je hoeft gisteren niet in te halen om vandaag te mogen starten. Noteer desnoods opnieuw één stap die kleiner is dan wat gisteren te groot bleek. Consistentie ontstaat uit herhaalbaar kleine starts, niet uit perfecte weken. Dat is precies waarom deze methode vriendelijker is dan een planner die rode dagen stapelt.</p>
<p>Gebruik desnoods een zin als anker: 'Vandaag telt één aanraking.' Meer mag. Minder mag niet onder nul: nul is stilstaan zonder nieuwe schuld. Als je merkt dat je toch weer een lange lijst opent 'voor overzicht', sluit hem. Overzicht zonder start vergroot de last. Start eerst, orden later als er energie over is.</p>

<h2>In Structuro</h2>
<p>De dagstart helpt je kiezen wat past bij je energie. Daarna zie je niet je hele leven, maar wat nu telt. Structuro is gebouwd als executie-hulp, niet als planner die taken spaart tot je eronder bezwijkt. Eén stap is het productprincipe, geen marketingslogan. De app bewaakt het smalle zichtveld zodat je niet terugvalt in 'alles tegelijk'.</p>
""",
        "cta_title": "Probeer één stap vandaag",
        "cta_p": "Start met een korte dagstart. Geen perfecte planning. Wel een haalbare eerste actie.",
        "faqs": [
            (
                "Is één stap niet te weinig?",
                "Voor starten is het vaak precies genoeg. Momentum komt na de eerste actie, niet ervoor.",
            ),
            (
                "Wat als ik meer aankan?",
                "Dan kies je een tweede stap. De methode blokkeert meer niet. Ze voorkomt dat meer het starten doodt.",
            ),
            (
                "Werkt dit ook zonder app?",
                "Ja. Schrijf één zin: 'Vandaag start ik met …'. Een app helpt vooral om die keuze rustig te houden.",
            ),
            (
                "Wat doe ik met de rest van mijn to-do's?",
                "Die mogen bestaan buiten beeld. Ze hoeven vandaag niet mee te kijken terwijl je start.",
            ),
        ],
    },
    {
        "slug": "waarom-planners-falen",
        "eyebrow": "Anti-planner",
        "title": "Waarom planners falen bij een ADHD-brein (en wat wél helpt)",
        "description": "Zoek je een Tiimo-alternatief of app zonder streaks? Planners bewaren taken. Executie helpt je starten. Waarom dat verschil ertoe doet voor ADHD-breinen.",
        "answer": (
            "Planners falen vaak niet omdat jij faalt. Ze optimaliseren voor overzicht, reminders en streaks. "
            "Een ADHD-brein heeft vooral hulp bij starten en afronden zonder schaamte. Wat helpt is een "
            "executie-interface: weinig tegelijk zichtbaar, energie-first, geen straf voor een gemiste dag. "
            "Geen nóg een planner, ook niet een zogenaamd 'rustige' variant die dezelfde lat houdt."
        ),
        "h1": "Waarom planners falen bij een ADHD-brein (en wat wél helpt)",
        "body": """
<p>Misschien zoek je een 'Tiimo-alternatief', een 'rustige planner' of een 'ADHD-app zonder shame'. Die zoektermen wijzen vaak naar hetzelfde pijnpunt: klassieke planners voelen eerst hoopvol, daarna als bewijs dat je weer bent tekortgeschoten. De tool belooft structuur. Jij belooft jezelf dat je 'nu echt' gaat bijhouden. Tot de streak breekt of de kleurenlijst je verlamt.</p>

<h2>Wat een planner wél doet</h2>
<p>Hij bewaart taken, toont een week, stuurt herinneringen, viert streaks, nodigt uit tot tags en time-blocks. Voor sommige mensen werkt dat precies goed. Voor veel mensen met executieve frictie wordt de tool zelf een tweede baas: je moet het systeem onderhouden voordat je mag beginnen.</p>

<h2>Waarom dat botst</h2>
<ul>
<li><strong>Meer zicht = meer last.</strong> Een volle agenda is geen startknop.</li>
<li><strong>Streaks straffen stilte.</strong> Eén gemiste dag voelt als falen. Dan open je de app niet meer.</li>
<li><strong>Perfectie vóór actie.</strong> Kleuren, tags en time-blocks voelen productief, maar stellen de start uit.</li>
<li><strong>Neurotypische defaults.</strong> Consistente output elke dag is de lat. Jouw capaciteit schommelt.</li>
</ul>

<h2>Wat wél helpt: executie, niet plannen</h2>
<p>Een systeem dat vraagt: hoe is je energie nu, en wat is één haalbare stap? Dat is geen weekoverzicht. Dat is vandaag helpen beginnen. Lees <a href="/waarom-gewoon-beginnen-niet-werkt/">waarom 'gewoon beginnen' niet werkt</a>, <a href="/een-stap-per-dag/">één stap per dag</a> en <a href="/energie-first/">energie-first werken</a>.</p>
<p>De volgorde is anders dan bij planners: eerst starten, dan eventueel ordenen. Niet eerst het perfecte systeem, dan misschien doen.</p>

<h2>Over 'Tiimo-alternatief' en vergelijkbare zoekintent</h2>
<p>Mensen die dit zoeken willen vaak minder overprikkeling, minder gamification, of meer rust. Soms past een andere planner. Vaak past juist geen planner. Als visuele planning je raakt omdat het mooi is maar je niet in beweging krijgt, zoek je waarschijnlijk een executie-hulp: iets dat de eerste stap voor je uitlicht zonder weektheater.</p>

<h2>Wanneer een planner wél mag blijven</h2>
<p>Houd een agenda voor echte afspraken en deadlines die extern zijn. Gebruik eventueel een simpele inbox voor 'ooit'. Laat executie (starten, afronden, stoppen zonder schuld) niet afhangen van hetzelfde systeem dat ook je weekkunstwerk moet zijn. Scheiding van systemen verlaagt frictie: kalender voor wanneer, executie voor hoe je nu beweegt.</p>

<h2>Checklist: planner of executie?</h2>
<ul>
<li>Open je de app om te doen, of om te herschikken?</li>
<li>Voel je na vijf minuten rust of juist meer druk?</li>
<li>Helpt een gemiste dag je terugkomen, of blijf je weg?</li>
<li>Is de eerste actie duidelijk, of alleen de categorie?</li>
</ul>
<p>Als je vooral herschikt, meer druk voelt, wegblijft na een misser, of geen eerste actie ziet, dan zoek je geen betere planner. Dan zoek je hulp om te beginnen. Dat onderscheid bespaart maanden tool-hopping.</p>

<h2>Structuro positioneert zich expres niet als planner</h2>
<p>Structuro is een rustige executie-app: dagstart, weinig taken tegelijk, focus, dagafsluiting. Geen streaks. Geen schaamte-score. Geen belofte dat je eindelijk 'georganiseerd' wordt. De belofte is smaller: vandaag weer kunnen beginnen, met minder oordeel. Afspraken mogen in je agenda blijven. Structuro richt zich op wat blijft liggen door startfrictie. Als je een 'Tiimo-alternatief' zoekt omdat gamification of visuele druk je treft, check eerst of je überhaupt nog een planner wilt, of juist hulp om te starten.</p>
""",
        "cta_title": "Geen planner. Wel starten.",
        "cta_p": "Probeer Structuro als executie-hulp: één eerste stap, passend bij je energie.",
        "faqs": [
            (
                "Is Structuro een Tiimo-alternatief?",
                "Alleen in de zin dat mensen soms hetzelfde pijnpunt hebben. Structuro is geen visuele planner. Het is gebouwd om te starten en af te ronden, niet om je week te stylen.",
            ),
            (
                "Heb ik dan helemaal geen agenda meer nodig?",
                "Afspraken kunnen elders blijven. Structuro richt zich op het doen van wat blijft liggen door startfrictie.",
            ),
            (
                "Waarom geen streaks?",
                "Streaks werken voor wie beloning uit consistentie haalt. Voor anderen triggeren ze schaamte en vermijding. Structuro laat dat bewust weg.",
            ),
            (
                "Is een 'rustige planner' dan ook fout?",
                "Niet per se. Als plannen je helpt starten, prima. Als plannen je start vervangt, zoek je iets anders: executie.",
            ),
        ],
    },
    {
        "slug": "mentale-belasting-dagstart",
        "eyebrow": "Mentale last",
        "title": "Mentale belasting en de dagstart",
        "description": "Mentale belasting voelt als een vol hoofd vóór je begint. Een korte, rustige dagstart verlaagt keuzedruk en helpt je één stap kiezen zonder ochtendtheater.",
        "answer": (
            "Mentale belasting is de onzichtbare to-do in je hoofd: onthouden, kiezen, bijsturen. "
            "Die last piekt vaak 's ochtends, nog vóór je iets gedaan hebt. Een korte dagstart verlaagt "
            "keuzedruk: je checkt je energie, kiest wat haalbaar is, en laat de rest even uit zicht. "
            "Zo wordt starten weer mogelijk zonder een perfecte ochtendroutine."
        ),
        "h1": "Mentale belasting en de dagstart",
        "body": """
<p>Je kunt uitgerust wakker worden en tóch al moe zijn van je eigen hoofd. Dat is geen drama. Dat is mentale last: open loops, verwachtingen van anderen, onafgeronde gistertaken, en het gevoel dat je eerst moet organiseren voordat je mag beginnen. Hoe langer je die last meeneemt zonder hem te verkleinen, hoe zwaarder 'gewoon starten' voelt.</p>

<h2>Waarom ochtenden zo zwaar voelen</h2>
<p>Elke keuze kost energie. Welke taak eerst, hoe lang, hoe perfect, wat als het misgaat, wie je teleurstelt. Zonder ritueel opent je brein twintig tabbladen tegelijk. Dan voelt starten onmogelijk, ook als de taken op zich doenlijk zijn. Zie <a href="/waarom-gewoon-beginnen-niet-werkt/">waarom 'gewoon beginnen' niet werkt</a>.</p>
<p>Mentale last is niet alleen 'te veel werk'. Het is te veel parallel onthouden. Daarom helpt een dagstart die keuzes reduceert harder dan een langere ochtendchecklist.</p>

<h2>Wat een goede dagstart wél is</h2>
<ul>
<li>Kort: seconden tot een paar minuten, geen meeting met jezelf.</li>
<li>Energie-check: laag, genoeg, of hoog.</li>
<li>Eén of enkele taken zichtbaar, niet je hele backlog.</li>
<li>Geen oordeel over gisteren: geen inhaalrace.</li>
<li>Eén eerste stap die startbaar is. Methode: <a href="/een-stap-per-dag/">één stap per dag</a>.</li>
</ul>
<p>Dat is anders dan een ochtendroutine van twaalf stappen met journaling, cold shower en weekreview. Minder theater. Meer bewegen.</p>

<h2>Wat je uit beeld mag laten</h2>
<p>Niet alles verdient een plek in je ochtend. Lange-termijnprojecten, 'ooit'-taken en perfectie-eisen mogen wachten tot er capaciteit is. Dat is geen vermijding als je wél één stap zet. Dat is prioriteren op zenuwstelselniveau. Past bij <a href="/energie-first/">energie-first werken</a>.</p>

<h2>Signalen dat je last te hoog is</h2>
<ul>
<li>Je opent apps en sluit ze weer zonder te starten.</li>
<li>Je maakt eerst een nieuwe lijst 'om overzicht te krijgen'.</li>
<li>Je voelt schuld over gisteren vóór je vandaag mag beginnen.</li>
<li>Kleine taken voelen even zwaar als grote.</li>
</ul>
<p>Die signalen vragen niet om meer discipline. Ze vragen om minder parallelle keuzes en een kortere brug naar de eerste actie.</p>

<h2>Mini-script voor een zware ochtend</h2>
<ol>
<li>Adem één keer uit. Geen hele meditatiesessie.</li>
<li>Zeg hardop of schrijf: 'Ik kies één ding.'</li>
<li>Check energie: laag / genoeg / hoog.</li>
<li>Kies één stap die bij die stand past.</li>
<li>Verberg of negeer de rest tot die stap gebeurd is.</li>
</ol>
<p>Dit script is expres saai. Saai wint van theatraal als je hoofd al vol is. Combineer het met anti-planner keuzes als je merkt dat je toch weer een weekoverzicht gaat bouwen vóór je die ene stap doet. Saai is hier een feature: hoe minder beslisdruk in het ritueel, hoe groter de kans dat je überhaupt begint.</p>
<p>Schrijf het script desnoods op een briefje. Niet om een nieuw systeem te bouwen, maar om 's ochtends niet opnieuw te hoeven ontwerpen hoe je mag starten.</p>

<h2>Hoe Structuro de last verlaagt</h2>
<p>De dagstart is de kernlus: energie, keuze, beginnen. Daarna focus. Aan het eind van de dag mag het leeg: afronden zonder schuld. Structuro is geen planner die mentale last opslaat als een oneindige lijst. Het is een prikkelarme interface om vandaag weer beweegbaar te maken, ook als je hoofd al vol begon. De winst zit in minder zichtbaar tegelijk, niet in meer features.</p>
""",
        "cta_title": "Begin met een rustige dagstart",
        "cta_p": "Geen perfecte ochtendroutine. Wel een korte check en één haalbare stap.",
        "faqs": [
            (
                "Is mentale belasting hetzelfde als stress?",
                "Ze overlappen. Mentale belasting gaat vooral over hoeveel je moet onthouden en kiezen. Stress is breder. Minder keuzes tegelijk helpt vaak beide.",
            ),
            (
                "Moet ik elke ochtend hetzelfde ritueel doen?",
                "Nee. Vast genoeg om frictie te verlagen, flexibel genoeg voor lage-energie dagen.",
            ),
            (
                "Wat als ik de dagstart oversla?",
                "Begin opnieuw zonder inhaalrace. Geen streak om te redden. Vandaag telt.",
            ),
            (
                "Helpt een langere ochtendroutine?",
                "Soms. Vaak verhoogt die juist de lat vóór je mag starten. Korter is meestal vriendelijker bij een vol hoofd.",
            ),
        ],
    },
    {
        "slug": "energie-first",
        "eyebrow": "Energie-first",
        "title": "Energie-first werken in plaats van moeten",
        "description": "Kies taken rond je energie, niet je energie rond je to-do. Zo werkt energie-first zonder hustle, shame of vaste lat die je elke dag breekt.",
        "answer": (
            "Energie-first betekent: je dag bouwen rond wat je nu aankunt, niet rond wat je 'zou moeten'. "
            "Op lage energie kies je één kleine stap. Op hoge energie mag er meer. Zo voorkom je dat een "
            "ambitieuze lijst je verlamt op de dagen dat starten al zwaar genoeg is, zonder dat moeilijke "
            "dingen voor altijd verdwijnen."
        ),
        "h1": "Energie-first werken in plaats van moeten",
        "body": """
<p>'Moeten' negeert je batterij. Het zet een vaste lat, ook als je hoofd vol is of je lijf traag. Energie-first draait die volgorde om: eerst voelen wat er is, dan kiezen wat past. Dat klinkt soft. In de praktijk is het vaak de enige manier om consistent genoeg te bewegen zonder wekelijkse crash.</p>

<h2>Drie standen, simpel gehouden</h2>
<ul>
<li><strong>Laag:</strong> één mini-stap. Overleven telt als vooruitgang.</li>
<li><strong>Genoeg:</strong> een normale taak, nog steeds niet je hele backlog.</li>
<li><strong>Hoog:</strong> iets zwaarders mag, zonder dat dit de nieuwe standaard wordt.</li>
</ul>
<p>Dit is geen excuus om nooit moeilijke dingen te doen. Het is een manier om starten mogelijk te houden. Koppeling met taakinitiatie: <a href="/waarom-gewoon-beginnen-niet-werkt/">waarom 'gewoon beginnen' niet werkt</a>.</p>

<h2>Waarom dit beter werkt dan time-blocking alleen</h2>
<p>Een blok van 09:00 tot 11:00 zegt niets over of je brein dan kan starten. Time-blocking plant tijd. Energie-first plant capaciteit. Samen kunnen ze werken: je reserveert tijd, en vult die met een stap die bij je stand past. Alleen tijd zonder capaciteit eindigt in staren naar de taak. Zie ook <a href="/een-stap-per-dag/">één stap per dag</a>.</p>

<h2>Hoe je het in 60 seconden toepast</h2>
<ol>
<li>Vraag: laag, genoeg, of hoog?</li>
<li>Kies één stap die bij die stand past.</li>
<li>Verberg de rest tijdelijk.</li>
<li>Start. Evalueer pas daarna of er ruimte is voor meer.</li>
</ol>
<p>Op dagen met hoge mentale last is 'laag' vaker juist dan stoer. Zie <a href="/mentale-belasting-dagstart/">mentale belasting en de dagstart</a>.</p>

<h2>Wat energie-first níet is</h2>
<p>Het is niet 'alleen doen wat leuk is'. Het is niet deadlines ontkennen. Het is niet jezelf forever in mini-stappen houden als er wél capaciteit is. Het is de lat laten meebewegen zodat je überhaupt in beweging komt, ook op rommeldagen.</p>

<h2>Voorbeeld: dezelfde taak, drie standen</h2>
<p>Taak: belastingspapieren. Laag: 'open de mail van de Belastingdienst'. Genoeg: 'download de bijlage en zet hem in de map'. Hoog: 'vul sectie 1 in en bewaar'. Dezelfde verplichting, andere ingang. Zo blijft de lat eerlijk zonder de deadline te ontkennen. Combineer dit met <a href="/waarom-planners-falen/">anti-planner denken</a> als je merkt dat je weer een perfect weekschema bouwt in plaats van sectie 1 aan te raken.</p>

<h2>Veelgemaakte misverstanden</h2>
<p>Energie-first is geen vrijbrief om belangrijke dingen te mijden. Het is een volgorde: eerst een startbare maat, dan doorpakken als het kan. Het is ook geen medische meting. Je hebt geen wearables nodig om te weten of je hoofd 'laag' voelt. En het is geen nieuwe identiteit. Het is een dagelijkse check van dertig seconden, bedoeld om 'moeten' te vervangen door 'passen'.</p>
<p>Als je merkt dat je energie-first gebruikt om eindeloos te kiezen zonder te starten, val terug op één stap: kies iets kleins en raak het aan. Keuze zonder aanraking is weer mentale last. Liever een te kleine stap die gebeurt dan een perfecte stap die blijft liggen.</p>

<h2>In Structuro</h2>
<p>Bij de dagstart kies je je energie. De app helpt bij wat daarna haalbaar is. Geen hustle-taal. Geen straf als je laag zit. Executie die meebuigt, in plaats van een planner die dezelfde lat elke dag herhaalt. Structuro blijft een executie-interface, geen energie-tracker die je medisch claimt te 'behandelen'. Jij blijft de baas over wat 'laag' vandaag betekent.</p>
""",
        "cta_title": "Werk vanaf je energie",
        "cta_p": "Start een dagstart, kies hoe vol je batterij is, en neem één stap die daarbij past.",
        "faqs": [
            (
                "Is energie-first hetzelfde als alleen doen wat leuk is?",
                "Nee. Je doet ook saaie of zware dingen, maar in een maat die vandaag startbaar is.",
            ),
            (
                "Wat als mijn energie de hele week laag is?",
                "Dan blijf je bij mini-stappen. Consistent klein wint vaker van incidenteel groot met crash erna.",
            ),
            (
                "Past dit bij deadlines?",
                "Deadlines blijven bestaan. Energie-first helpt je de eerste actie te vinden zodat de deadline niet alleen paniek wordt.",
            ),
            (
                "Moet ik mijn energie wetenschappelijk meten?",
                "Nee. Een eerlijke check in drie standen is genoeg. Geen wearables of diagnoses nodig.",
            ),
        ],
    },
]


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def word_count_html(html: str) -> int:
    text = re.sub(r"<[^>]+>", " ", html)
    return len(text.split())


def related_html(current: str) -> str:
    items = []
    for g in GUIDES:
        if g["slug"] == current:
            continue
        items.append(
            f'<li><a href="/{g["slug"]}/">{esc(g["h1"])}'
            f'<span>{esc(g["eyebrow"])}</span></a></li>'
        )
    return "\n".join(items)


def faq_html(faqs: list[tuple[str, str]]) -> str:
    return "\n".join(
        f"<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>" for q, a in faqs
    )


def faq_schema(faqs: list[tuple[str, str]]) -> str:
    entities = [
        {
            "@type": "Question",
            "name": q,
            "acceptedAnswer": {"@type": "Answer", "text": a},
        }
        for q, a in faqs
    ]
    return json.dumps(
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": entities},
        ensure_ascii=False,
        indent=2,
    )


def article_schema(g: dict) -> str:
    url = f"https://www.structuro.eu/{g['slug']}/"
    return json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": g["h1"],
            "description": g["description"],
            "inLanguage": "nl-NL",
            "datePublished": PUBLISHED,
            "dateModified": MODIFIED,
            "author": {"@type": "Organization", "name": "Structuro", "url": "https://www.structuro.eu/"},
            "publisher": {
                "@type": "Organization",
                "name": "Structuro",
                "url": "https://www.structuro.eu/",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://www.structuro.eu/uploads/logo-structuro-mark.png",
                },
            },
            "image": [OG_IMAGE],
            "mainEntityOfPage": {"@type": "WebPage", "@id": url},
            "url": url,
            "isPartOf": {"@type": "WebSite", "name": "Structuro", "url": "https://www.structuro.eu/"},
        },
        ensure_ascii=False,
        indent=2,
    )


def breadcrumb_schema(g: dict) -> str:
    url = f"https://www.structuro.eu/{g['slug']}/"
    return json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Structuro",
                    "item": "https://www.structuro.eu/",
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Gidsen",
                    "item": "https://www.structuro.eu/waarom-gewoon-beginnen-niet-werkt/",
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": g["h1"],
                    "item": url,
                },
            ],
        },
        ensure_ascii=False,
        indent=2,
    )


def render(g: dict) -> str:
    slug = g["slug"]
    cta = (
        "https://www.structuro.ai/onboarding"
        f"?utm_source=structuro_eu&utm_medium=seo&utm_campaign={slug}&utm_content=guide_cta"
    )
    nav_cta = (
        "https://www.structuro.ai/onboarding"
        f"?utm_source=structuro_eu&utm_medium=seo&utm_campaign={slug}&utm_content=guide_nav"
    )
    title = f"{g['title']} · Structuro"
    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{esc(title)}</title>
<meta name="description" content="{esc(g["description"])}"/>
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"/>
<link rel="canonical" href="https://www.structuro.eu/{slug}/"/>
<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="icon" href="/uploads/logo-structuro-favicon-48.png?v=20260730a" type="image/png" sizes="48x48"/>
<link rel="icon" href="/uploads/logo-structuro-favicon-96.png?v=20260730a" type="image/png" sizes="96x96"/>
<link rel="apple-touch-icon" href="/uploads/logo-structuro-apple.png?v=20260730a"/>
<meta property="og:site_name" content="Structuro"/>
<meta property="og:locale" content="nl_NL"/>
<meta property="og:title" content="{esc(title)}"/>
<meta property="og:description" content="{esc(g["description"])}"/>
<meta property="og:url" content="https://www.structuro.eu/{slug}/"/>
<meta property="og:image" content="{OG_IMAGE}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="1200"/>
<meta property="og:type" content="article"/>
<meta property="article:published_time" content="{PUBLISHED}"/>
<meta property="article:modified_time" content="{MODIFIED}"/>
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="{esc(title)}"/>
<meta name="twitter:description" content="{esc(g["description"])}"/>
<meta name="twitter:image" content="{OG_IMAGE}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="/v2/v2-tokens.css?v=20260730b"/>
<link rel="stylesheet" href="/css/guide.css?v={CSS_V}"/>
<script type="application/ld+json">
{article_schema(g)}
</script>
<script type="application/ld+json">
{faq_schema(g["faqs"])}
</script>
<script type="application/ld+json">
{breadcrumb_schema(g)}
</script>
<script>
  window.va = window.va || function () {{ (window.vaq = window.vaq || []).push(arguments); }};
</script>
<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/js/ph-config.js?v=20260724a"></script>
<script defer src="/js/analytics.js?v=20260730g"></script>
</head>
<body>
<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="/">
      <span class="brand-mark"><img src="/uploads/logo-structuro-mark.png?v=20260722e" alt="Structuro logo" width="30" height="30"/></span>
      Structuro
    </a>
    <a class="guide-header-cta" href="{nav_cta}" data-ph-cta="guide_nav" data-signup-bridge="guide_nav">Begin met één stap</a>
  </div>
</header>

<main class="guide-main">
  <div class="guide-top">
    <a class="guide-back" href="/" data-ph-cta="guide_back">← Terug naar Structuro</a>
    <div class="guide-heading">
      <p class="guide-eyebrow"><i></i><span>{esc(g["eyebrow"])}</span></p>
      <h1 class="serif">{esc(g["h1"])}</h1>
    </div>
  </div>
  <p class="guide-answer">{esc(g["answer"])}</p>
  <article class="guide-prose">
{g["body"].strip()}
  </article>

  <section class="guide-cta" aria-label="Call to action">
    <p class="guide-cta-title">{esc(g["cta_title"])}</p>
    <p>{esc(g["cta_p"])}</p>
    <a class="btn" href="{cta}" data-ph-cta="guide_cta" data-signup-bridge="guide_cta">Start 7 dagen gratis</a>
    <p class="reassure">Geen streaks. Geen shame. Klaar in ~30 seconden.</p>
  </section>

  <section class="guide-faq" aria-label="Veelgestelde vragen">
    <h2 class="serif">Veelgestelde vragen</h2>
    {faq_html(g["faqs"])}
  </section>

  <nav class="guide-related" aria-label="Andere gidsen">
    <p class="guide-related-title">Andere gidsen</p>
    <ul>
      {related_html(slug)}
    </ul>
  </nav>

  <p class="guide-note">Structuro is een prikkelarme executie-app, geen medisch advies en geen planner. Geen diagnose of behandeling.</p>
</main>

<footer class="site-foot">
  <div class="wrap">
    <div class="foot-top">
      <a class="brand" href="/">
        <span class="brand-mark"><img src="/uploads/logo-structuro-mark.png?v=20260722e" alt="Structuro logo" width="30" height="30"/></span>
        Structuro
      </a>
      <div class="foot-links">
        <a href="/waarom-gewoon-beginnen-niet-werkt/">Gidsen</a>
        <a href="/#prijs">Prijs</a>
        <a href="/#faq">FAQ</a>
        <a href="https://www.structuro.ai/login?utm_source=structuro_eu&utm_medium=seo&utm_campaign={slug}&utm_content=footer_login">Inloggen</a>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© Structuro</span>
      <nav aria-label="Juridisch">
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Voorwaarden</a>
        <a href="/cookies/">Cookies</a>
      </nav>
    </div>
  </div>
  <a class="verified-dr-badge" href="https://verifieddr.com" target="_blank" rel="noopener">Verified DR</a>
</footer>
</body>
</html>
"""


def write_sitemap() -> None:
    urls = [
        ("https://www.structuro.eu/", "1.0"),
        ("https://www.structuro.eu/waarom-gewoon-beginnen-niet-werkt/", "0.9"),
        ("https://www.structuro.eu/een-stap-per-dag/", "0.8"),
        ("https://www.structuro.eu/waarom-planners-falen/", "0.8"),
        ("https://www.structuro.eu/mentale-belasting-dagstart/", "0.8"),
        ("https://www.structuro.eu/energie-first/", "0.8"),
        ("https://www.structuro.eu/llms.txt", "0.3"),
    ]
    items = []
    for loc, prio in urls:
        items.append(
            f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{MODIFIED}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>{prio}</priority>
  </url>"""
        )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(items)
        + "\n</urlset>\n"
    )
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")
    print("wrote sitemap.xml")


def write_llms() -> None:
    lines = [
        "# Structuro",
        "",
        "> Rustige executie-app voor ADHD-breinen. Helpt je beginnen met één haalbare stap per dag. Geen planner, geen streaks, geen shame-gamification.",
        "",
        "Structuro is een prikkelarme executie-interface: dagstart → focus → dagafsluiting. Energie-first, max een paar taken zichtbaar. Geen medisch advies; geen diagnose of behandeling.",
        "",
        "## Primary",
        "",
        "- [Homepage](https://www.structuro.eu/): Merkbelofte en productintroductie",
        "- [App onboarding](https://www.structuro.ai/onboarding): Start met een anonieme dagstart",
        "",
        "## Gidsen (SEO / GEO)",
        "",
    ]
    for g in GUIDES:
        lines.append(
            f"- [{g['h1']}](https://www.structuro.eu/{g['slug']}/): {g['answer']}"
        )
    lines += [
        "",
        "## Optional",
        "",
        "- [Privacy](https://www.structuro.eu/privacy/)",
        "- [Voorwaarden](https://www.structuro.eu/terms/)",
        "- [Cookies](https://www.structuro.eu/cookies/)",
        "",
    ]
    (ROOT / "llms.txt").write_text("\n".join(lines), encoding="utf-8")
    print("wrote llms.txt")


def main() -> None:
    for g in GUIDES:
        aw = len(g["answer"].split())
        bw = word_count_html(g["body"])
        if aw < 50 or aw > 70:
            raise SystemExit(f"{g['slug']}: answer words={aw} (want 50-70)")
        if bw < 500:
            raise SystemExit(f"{g['slug']}: body words={bw} (want >=500)")
        out = ROOT / g["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render(g), encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)} (answer={aw}, body={bw})")
    write_sitemap()
    write_llms()


if __name__ == "__main__":
    main()
