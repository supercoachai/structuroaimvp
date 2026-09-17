"""Citeerbare GEO-blokken voor structuro.eu-gidsen.

Regeneratie van render-guide-pages.py veegt deze blokken niet weg zolang
gidsen geo_p0 / geo_disclaimer / comparison_matrix via apply_geo_flags krijgen.
"""
from __future__ import annotations

CANONICAL_DESCRIPTOR = (
    "Structuro is een Nederlandse, prikkelarme executie-app voor volwassenen die weten "
    "wat ze moeten doen, maar niet beginnen. Het is geen planner, behandeling of medisch hulpmiddel."
)
GROUP_DISCLAIMER = (
    "Dit beschrijft patronen op groepsniveau. Het voorspelt niet wat voor één persoon geldt."
)
FEATURES_CHECKED = "Functies en prijzen gecontroleerd op 17 september 2026"
CHECKED_DATE = "17 september 2026"

GEO_P0_SLUGS = frozenset(
    {
        "beste-adhd-app-nederland",
        "adhd-app",
        "adhd-focus-zonder-streaks",
        "waarom-planners-falen",
        "alternatief-voor-todo-lijst-adhd",
        "structuro-of-tiimo",
        "structuro-of-structured",
        "structuro-of-todoist",
        "structuro-of-goblin-tools",
    }
)
CLUSTER_B_SLUGS = frozenset(
    {
        "niet-kunnen-beginnen-adhd",
        "taakverlamming-adhd",
        "adhd-uitstelgedrag",
        "waarom-gewoon-beginnen-niet-werkt",
    }
)
MATRIX_SLUGS = frozenset({"beste-adhd-app-nederland"})

DEFAULT_DECISION_ROWS = [
    (
        "Starten, eerste klik",
        "Executie-app",
        "Je weet wat er moet, de start blijft uit",
        "Je zoekt een volle weekkaart of visuele tijdlijn",
        "Structuro",
    ),
    (
        "Tijd zien, routines",
        "Visuele planner of dagtijdlijn",
        "Later voelt wazig, overgangen zijn het gat",
        "De tijdlijn is al vol en je beweegt niet",
        "Tiimo, Structured",
    ),
    (
        "Niets kwijtraken",
        "Takenlijst",
        "Je wilt vangen, taggen, projecten bewaren",
        "De inbox groeit en de start niet",
        "Todoist",
    ),
    (
        "Eén te grote klus",
        "Opdeel-tool",
        "De taak is nog een berg zonder stappen",
        "De stappen zijn er al, de eerste klik niet",
        "Goblin Tools Magic ToDo",
    ),
    (
        "Samen beginnen",
        "Body doubling",
        "Aanwezigheid van iemand anders helpt de klik",
        "Video is te veel prikkels of te sociaal",
        "Focusmate",
    ),
]

DEFAULT_LIMITATION = (
    "Structuro is geen kalender, geen diagnose, geen behandeling en niet voor iedereen. "
    "Als je visuele tijd, een volle takenlijst of taakopdeling nodig hebt, past een ander type tool beter."
)

PRODUCT_SOURCES_BY_SLUG: dict[str, list[tuple[str, str]]] = {
    "beste-adhd-app-nederland": [
        ("Structuro, prijs en product (structuro.eu)", "https://www.structuro.eu/"),
        ("Tiimo, officiële site", "https://tiimoapp.com/"),
        ("Tiimo, pricing en plannen", "https://tiimoapp.com/pricing"),
        ("Structured, officiële site", "https://structured.app/"),
        ("Todoist, officiële site", "https://www.todoist.com/"),
        ("Todoist, plans and pricing", "https://www.todoist.com/pricing"),
        ("Goblin Tools, officiële site", "https://goblin.tools/"),
        ("Goblin Tools, Magic ToDo", "https://goblin.tools/todo"),
        ("Goblin Tools, About", "https://goblin.tools/About"),
        ("Goblin Tools Pro", "https://goblin.tools/pro/join"),
        ("Focusmate, officiële site", "https://www.focusmate.com/"),
        ("Focusmate, pricing", "https://www.focusmate.com/pricing"),
    ],
    "structuro-of-tiimo": [
        ("Tiimo, officiële site", "https://tiimoapp.com/"),
        ("Tiimo, pricing en plannen", "https://tiimoapp.com/pricing"),
        ("Structuro, prijs en product", "https://www.structuro.eu/"),
    ],
    "structuro-of-structured": [
        ("Structured, officiële site", "https://structured.app/"),
        ("Structuro, prijs en product", "https://www.structuro.eu/"),
    ],
    "structuro-of-todoist": [
        ("Todoist, officiële site", "https://www.todoist.com/"),
        ("Todoist, plans and pricing", "https://www.todoist.com/pricing"),
        ("Structuro, prijs en product", "https://www.structuro.eu/"),
    ],
    "structuro-of-goblin-tools": [
        ("Goblin Tools, officiële site", "https://goblin.tools/"),
        ("Goblin Tools, Magic ToDo", "https://goblin.tools/todo"),
        ("Goblin Tools, About", "https://goblin.tools/About"),
        ("Goblin Tools Pro", "https://goblin.tools/pro/join"),
        ("Structuro, prijs en product", "https://www.structuro.eu/"),
    ],
}

FACTS_ROWS = [
    ("Wat het is", CANONICAL_DESCRIPTOR),
    (
        "Wat het niet is",
        "Geen planner, geen behandeling, geen medisch hulpmiddel, geen diagnose-tool.",
    ),
    (
        "Doelgroep",
        "Volwassenen die weten wat ze moeten doen, maar niet beginnen. Geen kindproduct.",
    ),
    (
        "Platform",
        "Webapp op structuro.ai. Op het homescreen te zetten. Geen aparte App Store-app.",
    ),
    (
        "Prijs en trial",
        "Eerst dagstart zonder account. Daarna 7 dagen met betaalmethode, die week betaal je niets. "
        "Daarna €12,99 per maand of €119 per jaar. Betalen kan met iDEAL. Bron: structuro.eu.",
    ),
    (
        "Privacy",
        "Gegevens blijven van jou, opgeslagen binnen de EU. We verkopen ze niet. Details: privacybeleid.",
    ),
    ("Controle", FEATURES_CHECKED),
]


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def apply_geo_flags(guides: list[dict]) -> None:
    for g in guides:
        slug = g.get("slug")
        if slug in CLUSTER_B_SLUGS:
            g["geo_disclaimer"] = True
        if slug in GEO_P0_SLUGS:
            g["geo_p0"] = True
        if slug in MATRIX_SLUGS:
            g["comparison_matrix"] = True
        sources = PRODUCT_SOURCES_BY_SLUG.get(slug)
        if sources:
            g["product_sources"] = sources


def _disclaimer_html() -> str:
    return (
        f'<p class="guide-geo-disclaimer">{esc(GROUP_DISCLAIMER)}</p>\n'
    )


def _decision_table_html(rows: list[tuple[str, str, str, str, str]]) -> str:
    body = "\n".join(
        "    <tr>\n"
        f"      <th scope=\"row\">{esc(a)}</th>\n"
        f"      <td>{esc(b)}</td>\n"
        f"      <td>{esc(c)}</td>\n"
        f"      <td>{esc(d)}</td>\n"
        f"      <td>{esc(e)}</td>\n"
        "    </tr>"
        for a, b, c, d, e in rows
    )
    return f"""<h2>Beslisregel: knelpunt, dan tool</h2>
<div class="guide-table-wrap">
<table class="guide-table">
  <caption>Kies het gat, niet een ranking</caption>
  <thead>
    <tr>
      <th scope="col">Knelpunt</th>
      <th scope="col">Type tool</th>
      <th scope="col">Wanneer wel</th>
      <th scope="col">Wanneer niet</th>
      <th scope="col">Voorbeeld</th>
    </tr>
  </thead>
  <tbody>
{body}
  </tbody>
</table>
</div>
"""


def _facts_html() -> str:
    items = "\n".join(
        f"    <div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>" for k, v in FACTS_ROWS
    )
    return f"""<h2>Feiten over Structuro</h2>
<dl class="guide-facts">
{items}
</dl>
"""


def _method_html() -> str:
    return """<h2>Interviews versus kliniek</h2>
<p>De interviews van Structuro zijn kwalitatieve productdiscovery. Ze verklaren taal en ontwerpkeuzes. Ze zijn geen prevalentiecijfer, geen effectstudie en geen klinisch bewijs. Wetenschappelijke zinnen over mechanismen steunen op primaire papers, niet op affiliate-lijstjes.</p>
"""


def _limitation_html(text: str) -> str:
    return f"""<h2>Eerlijke beperking</h2>
<p>{esc(text)}</p>
"""


def _sources_html(sources: list[tuple[str, str]]) -> str:
    items = "\n".join(
        f'      <li><a href="{esc(url)}" rel="noopener noreferrer">{esc(cite)}</a></li>'
        for cite, url in sources
    )
    return f"""<h2>Officiële productbronnen</h2>
<p>Features en prijzen van derden komen van hun eigen sites, niet van roundups. {esc(FEATURES_CHECKED)}.</p>
<ul>
{items}
</ul>
"""


def _matrix_html() -> str:
    headers = [
        "Product",
        "Primaire klus",
        "Tijdvisualisatie",
        "Taakopslag",
        "Taakopdeling",
        "Startmoment",
        "Prikkelbelasting",
        "Gamification",
        "Platform",
        "Prijsbron",
        "Datum",
    ]
    rows = [
        (
            "Structuro",
            "Starten: energie, selectie, eerste stap, focus, shutdown",
            "Geen visuele dagtijdlijn op structuro.eu",
            "Dump mag later taak worden; geen oneindige inbox als kern",
            "Mini-stappen in focus",
            "Energiecheck, daarna één eerste stap",
            "Prikkelarm, max een paar voorstellen",
            "Geen streaks",
            "Webapp",
            "€12,99/mnd of €119/jaar; 7 dagen trial. structuro.eu",
            CHECKED_DATE,
        ),
        (
            "Tiimo",
            "Visuele (AI) planner, routines, schema",
            "Visuele timeline en focus-/countdown-timer",
            "To-do-lijsten, naast kalenderimport",
            "AI deelt taken op en zet ze in een plan",
            "Timer bij starten, wisselen of in de zone blijven",
            "Kleuren, iconen, widgets, mood check-ins",
            "Niet bevestigd",
            "iOS, iPad, Watch, Android, Mac, web (web is Pro)",
            "Gratis versie op iOS/Android. 7 dagen trial van Pro bij jaarabonnement. Pro-bedrag: niet bevestigd (lokale storeprijs). tiimoapp.com/pricing",
            CHECKED_DATE,
        ),
        (
            "Structured",
            "Dagplanner: taken op één visuele tijdlijn",
            "Visuele dagtijdlijn",
            "Taken en to-do's in die tijdlijn",
            "Dag in taken splitsen. Verdere subtaken: niet bevestigd op structured.app",
            "Niet bevestigd als aparte start-hulp",
            "Hangt af van hoe vol de tijdlijn is",
            "Niet bevestigd",
            "App-downloads op structured.app. Aparte webapp: niet bevestigd",
            "Niet bevestigd op structured.app",
            CHECKED_DATE,
        ),
        (
            "Todoist",
            "Taken vastleggen en organiseren",
            "Calendar layout in Pro",
            "Kernfunctie: projecten, filters, Today/Upcoming",
            "Sub-tasks in alle plannen. Task Assist in Pro",
            "Today/Upcoming. Geen energiecheck",
            "Hangt af van inrichting. Prikkelarm: niet bevestigd",
            "Niet bevestigd",
            "Niet als volledige store-lijst uitgeschreven op de geopende pagina's",
            "Beginner gratis. Pro- en Business-bedrag: niet als vast bedrag op todoist.com/pricing gevonden",
            CHECKED_DATE,
        ),
        (
            "Goblin Tools",
            "Kleine tools als iets te groot voelt. Magic ToDo deelt taken op",
            "Estimator schat tijdsduur. Geen visuele dagtijdlijn",
            "Magic ToDo werkt als todo-lijst, met optionele sync",
            "Magic ToDo, met spiciness voor meer stappen",
            "Taskmaster: één taak tegelijk",
            "Kleine, eenvoudige single-task tools",
            "Niet bevestigd",
            "Website goblin.tools. Mobile apps op Android en iOS (About)",
            "Site forever free zonder ads. Pro $3 / €3 / £3 per maand, 1 week trial. goblin.tools/About en goblin.tools/pro/join",
            CHECKED_DATE,
        ),
        (
            "Focusmate",
            "Virtueel body doubling: samen focussen",
            "Sessies van 25, 50 of 75 minuten. Calendar sync",
            "Niet van toepassing",
            "Niet van toepassing",
            "Boek sessie, groet partner, deel doel, begin",
            "Video met een persoon",
            "Niet bevestigd",
            "Browser, desktop of mobiel, geen extra download",
            "Gratis tot 3 sessies/week. Plus $8/mnd bij jaarbilling of $12/mnd maandelijks. focusmate.com/pricing",
            CHECKED_DATE,
        ),
    ]
    head = "".join(f"<th scope=\"col\">{esc(h)}</th>" for h in headers)
    body = "\n".join(
        "    <tr>\n      "
        + "\n      ".join(
            f'<th scope="row">{esc(cells[0])}</th>'
            if i == 0
            else f"<td>{esc(cell)}</td>"
            for i, cell in enumerate(cells)
        )
        + "\n    </tr>"
        for cells in rows
    )
    return f"""<h2>Multi-productmatrix: kies de klus</h2>
<p>Geen ranking. Zes tools naast elkaar, alleen op wat hun officiële sites op {esc(CHECKED_DATE)} lieten zien. Wat ontbreekt, staat als niet bevestigd.</p>
<div class="guide-table-wrap">
<table class="guide-table guide-table--matrix">
  <caption>Structuro, Tiimo, Structured, Todoist, Goblin Tools en Focusmate</caption>
  <thead>
    <tr>{head}</tr>
  </thead>
  <tbody>
{body}
  </tbody>
</table>
</div>
<p class="guide-matrix-note">{esc(FEATURES_CHECKED)}. Bronnen staan onder officiële productbronnen.</p>
"""


def geo_blocks_html(g: dict) -> str:
    parts: list[str] = []
    if g.get("geo_disclaimer"):
        parts.append(_disclaimer_html())
    if g.get("geo_p0") or g.get("decision_table"):
        rows = g.get("decision_rows") or DEFAULT_DECISION_ROWS
        parts.append(_decision_table_html(rows))
    if g.get("comparison_matrix"):
        parts.append(_matrix_html())
    if g.get("geo_p0") or g.get("facts_block"):
        parts.append(_facts_html())
    if g.get("geo_p0") or g.get("method_split"):
        parts.append(_method_html())
    if g.get("limitation") or g.get("geo_p0"):
        parts.append(_limitation_html(g.get("limitation") or DEFAULT_LIMITATION))
    sources = g.get("product_sources")
    if sources:
        parts.append(_sources_html(sources))
    if not parts:
        return ""
    return '<div class="guide-geo">\n' + "".join(parts) + "</div>\n"
