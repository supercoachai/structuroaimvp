# Keyword-bevindingen

Bron: `export_research_nl_suggestion_keywords_history_similar_eur_2026-09_adhd.xlsx` (5.001 rijen, niet 17.279). Pipeline: `scripts/seo/analyze_keywords.py`.

## Totalen (KD < 30)

- 4.929 rijen (98,56%)
- Som volume (niet gededupliceerd): 210.130
- Mediaan volume: 10
- Gemiddelde: 42,6
- Volume >= 90: 596; >= 210: 266; >= 480: 61; >= 590: 36

Die 210.130 is geen unieke vraag. Varianten delen volumes.

## Beslissingen (herdraai 17 sep 2026, na agenda-besluit)

Zie `keyword-summary.json` voor de actuele tellingen. Orphans: 0.

- HOLD_YMYL: 1.491 (diagnose, medicatie, supplementen, kinderen, erfelijkheid, rijbewijs, tests)
- IGNORE_IRRELEVANT: restclusters zonder productfit (memes, centra, relaties, hyperfocus als los symptoomwoord, enz.)
- SUPPORTING_KEYWORD: synoniemen aan bestaande canonicals
- EXPAND: bestaande P0/P1-URL's versterken
- NEW_PAGE: 0 openstaand. `/adhd-app/` en `/executieve-functies-adhd/` staan live in de repo.

## P0 (product/probleem)

| Cluster | Canonical | Waarom |
|---|---|---|
| ADHD-app | `/adhd-app/` | Categorie/product. Vergelijking blijft `/beste-adhd-app-nederland/`. |
| Planner/planning/agenda | `/adhd-planner-die-niet-overvraagt/` | Eén intentie. `adhd agenda` is supporting, geen extra URL. |
| Executieve functies | `/executieve-functies-adhd/` | Brug term naar taakinitiatie. |
| Werk | `/adhd-op-het-werk/` | Zelfde pagina voor werk-varianten. |

## Bewust niet gebouwd

kenmerken ADHD, diagnose, vragenlijst, l-theanine, LTO3, meisjes/kinderen, erfelijk, rijbewijs, alcohol. Volume wint niet van YMYL.

## SERP `adhd agenda`

Geen aparte `/adhd-agenda/`. Fysieke agenda's en digitale planners overlappen. Structuro verkoopt geen agenda. De bestaande planner-gids legt het verschil shopping vs executie uit. Extra URL zou cannibaliseren of een thin shop-pagina worden.
