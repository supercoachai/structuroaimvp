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
    "taakverlamming-adhd": {
        "primary_query": "taakverlamming ADHD",
        "url_aliases": ["task-paralysis-adhd", "adhd-taakverlamming"],
        "meta_title": "Taakverlamming ADHD: als alles te groot is",
        "description": (
            "Taakverlamming ADHD, in het Engels vaak task paralysis, is geen luiheid. "
            "Te veel stappen tegelijk. Wat je kunt doen zonder te forceren."
        ),
        "h1": "Taakverlamming ADHD: wat helpt als alles tegelijk te groot is",
        "h2": "Task paralysis bij volwassenen: te veel tegelijk zichtbaar",
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
        "h2": "Tijdblindheid en time blindness: nu versus later",
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
        "img_alt": "ADHD-planner die niet overvraagt: Structuro met één taak, geen weekoverzicht",
    },
    "beste-adhd-app-nederland": {
        "primary_query": "beste ADHD-app",
        "url_aliases": ["beste-adhd-app"],
        "img_alt": "Beste ADHD-app in Nederland: Structuro-dagstart, kiezen op knelpunt",
    },
    "alternatief-voor-todo-lijst-adhd": {
        "primary_query": "to-do-lijst ADHD",
        "img_alt": "Alternatief voor de to-do-lijst bij ADHD: één startstap in Structuro",
    },
    "structuro-of-tiimo": {
        "primary_query": "Structuro vs Tiimo",
        "url_aliases": ["structuro-vs-tiimo"],
        "img_alt": "Structuro vs Tiimo: starten met één stap in plaats van visuele tijd",
    },
    "structuro-of-structured": {
        "primary_query": "Structuro vs Structured",
        "url_aliases": ["structuro-vs-structured"],
        "img_alt": "Structuro vs Structured: eerste stap versus tijdlijn",
    },
    "structuro-of-todoist": {
        "primary_query": "Structuro vs Todoist",
        "url_aliases": ["structuro-vs-todoist"],
        "img_alt": "Structuro vs Todoist: starten versus een langere takenlijst",
    },
    "structuro-of-goblin-tools": {
        "primary_query": "Goblin Tools ADHD",
        "url_aliases": ["goblin-tools-adhd"],
        "img_alt": "Goblin Tools ADHD versus Structuro: opdelen of de eerste klik",
    },
    "adhd-en-burn-out": {
        "primary_query": "ADHD burn-out",
        "url_aliases": ["adhd-burnout"],
        "h2": "ADHD burn-out en een overvolle agenda: overlap, geen diagnose",
        "img_alt": "ADHD burn-out: Structuro start klein als de batterij leeg is",
    },
    "adhd-op-het-werk": {
        "primary_query": "ADHD op het werk",
        "img_alt": "ADHD op het werk: één startbare taak tussen meetings",
    },
    "adhd-ochtendroutine": {
        "primary_query": "ADHD-ochtendroutine",
        "img_alt": "ADHD-ochtendroutine: een kleine dagstart in Structuro, geen ochtendtheater",
    },
    "adhd-uitstelgedrag": {
        "primary_query": "ADHD uitstelgedrag",
        "img_alt": "ADHD uitstelgedrag: de start kleiner maken in de Structuro-dagstart",
    },
    "adhd-keuzestress": {
        "primary_query": "ADHD keuzestress",
        "img_alt": "ADHD keuzestress: één default in Structuro, niet twaalf opties",
    },
    "takenlijst-te-lang-adhd": {
        "primary_query": "takenlijst ADHD",
        "img_alt": "Takenlijst ADHD: minder in beeld, één stap in Structuro",
    },
    "adhd-focus-zonder-streaks": {
        "primary_query": "ADHD-app zonder streaks",
        "img_alt": "ADHD-app zonder streaks: focus starten in Structuro, geen vuurstreak",
    },
    "adhd-bij-vrouwen": {
        "primary_query": "ADHD bij vrouwen",
        "img_alt": "ADHD bij vrouwen: starten als werk en huis allebei trekken",
    },
    "adhd-app": {
        "primary_query": "ADHD-app",
        "img_alt": "ADHD-app Structuro: prikkelarme dagstart voor wie niet begint",
    },
    "executieve-functies-adhd": {
        "primary_query": "executieve functies ADHD",
        "url_aliases": ["executive-dysfunction-adhd"],
        "h2": "Executieve functies ADHD en executive dysfunction",
        "faq": (
            "Is executive dysfunction hetzelfde als executieve functies ADHD?",
            "Executive dysfunction is de Engelse zoekterm. Executieve functies zijn de vaardigheden. Dysfunctie is geen extra diagnose op deze pagina. Het beschrijft dat starten, kiezen of bijsturen hapert.",
        ),
        "img_alt": "Executieve functies ADHD: taakinitiatie als één kleine stap in Structuro",
    },
    "waarom-gewoon-beginnen-niet-werkt": {
        "primary_query": "gewoon beginnen ADHD",
        "h2": "Gewoon beginnen ADHD: wat er gebeurt vóór je start",
        "faq": (
            "Waarom werkt gewoon beginnen bij ADHD zo vaak niet?",
            "Omdat het advies de hele keten in één keer vraagt. Bij ADHD-breinen hapert taakinitiatie: de berg is zichtbaar, de eerste klik niet. Maak de start kleiner dan je ego prettig vindt.",
        ),
        "img_alt": "Gewoon beginnen ADHD: Structuro maakt de eerste klik kleiner dan de berg",
    },
    "een-stap-per-dag": {
        "primary_query": "één stap per dag ADHD",
        "img_alt": "Eén stap per dag ADHD: één taak in de Structuro-dagstart",
    },
    "waarom-planners-falen": {
        "primary_query": "waarom planners falen",
        "img_alt": "Waarom planners falen bij ADHD: Structuro start, in plaats van meer overzicht",
    },
    "mentale-belasting-dagstart": {
        "primary_query": "mentale belasting ADHD",
        "img_alt": "Mentale belasting ADHD: een smallere dagstart in Structuro",
    },
    "energie-first": {
        "primary_query": "energie-first ADHD",
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


def apply_seo(guides: list[dict]) -> None:
    for g in guides:
        seo = SEO.get(g["slug"])
        if not seo:
            _rewrite_refs(g)
            continue
        g["primary_query"] = seo["primary_query"]
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
        query = seo["primary_query"]
        if query.lower() not in body.lower():
            body = re.sub(
                r"(<p>)",
                rf"\1{query}. ",
                body,
                count=1,
            )
        strong = f"<strong>{query}</strong>"
        if strong.lower() not in body.lower() and query in body:
            body = body.replace(query, strong, 1)
        g["body"] = body
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
