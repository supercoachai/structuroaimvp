# Structuro context

> Eén bron voor productfilosofie, funnel-prioriteit en UX-regels. Gebruik in Cursor, Claude, Gemini en Obsidian. Niet in ClickUp Brain trainen.

## Doelgroep

- ADHD, executieve frictie, overprikkeling
- Geen shame-gamification, geen neurotypische defaults als norm
- Willen één haalbare stap, niet nog een productiviteitssysteem

## Productbelofte

- Eén haalbare stap per dag, energie-first
- Max drie taken zichtbaar waar relevant
- Eerste waarde binnen 30 seconden na signup
- Dagstart als core loop, shutdown als afsluiting (niet als admin)

## UX-regels

- Prikkelarm: rustige typografie, geen agressieve CTAs, geen em-dashes in UI-copy
- Geen streaks, badges of schuld als default
- Geen admin-heavy onboarding
- Magic link / wachtwoordloos waar mogelijk (minder frictie)
- Consent-first analytics op acquisitie-routes

## Tech stack

- Next.js App Router, Supabase Auth + Postgres, PostHog, Stripe, Vercel
- structuro.eu (marketing) → structuro.ai (app)
- Acquisitie-bridges: `/start` (organic), `/tiktok` (TikTok paid/bio)

## Funnel-prioriteit (juni 2026)

1. **Activatie (P0):** signup → eerste dagstart (doel >40% binnen 24u; baseline ~6%)
2. **Acquisitie-bridge (P1):** koud verkeer tot signup via `/start` en `/tiktok`
3. **Paid TikTok ads:** uit tot activatie structureel >25%
4. **Retention / revenue:** pas na activatie-lek dicht

## Acquisitie-attributie


| Route                            | Pad       | Signup source  | PostHog events                                              |
| -------------------------------- | --------- | -------------- | ----------------------------------------------------------- |
| Organic (structuro.eu, zelftest) | `/start`  | `structuro_eu` | `acquisition_landing_viewed`, `organic_landing_cta_clicked` |
| TikTok (paid/bio)                | `/tiktok` | `tiktok`       | + `tiktok_landing_viewed`, `tiktok_landing_cta_clicked`     |


Elke social post: `content_id` = `utm_content` in URL en PostHog.

## Doctrine (kort)

- **Anti-neurotypisch:** geen streaks, schuld, hustle-culture defaults
- **Executie-interface:** product is hulpmiddel om te starten, geen planner om te perfectioneren
- **Empirische firewall:** meten vóór schalen (ads, grote UX-experimenten)
- **Progressive silence:** minder prikkels naarmate gebruiker rust vindt
- **Amnestische backlog:** verleden taken vergeten zonder schuld

Experimenten die doctrine schenden: expliciet `experiment_waiver=true` in ClickUp.

## Tool-stack (denken → doen → bouwen)


| Laag            | Tool                             | Rol                                             |
| --------------- | -------------------------------- | ----------------------------------------------- |
| Denkgeheugen    | Obsidian (`docs/obsidian/`)      | Doctrine, interviews, patronen, links           |
| Research-sprint | NotebookLM en Claude (optioneel) | Batch bronnen → synthese → export naar Obsidian |
| Taak + metriek  | ClickUp Unlimited                | Status, funnel_stage, PostHog-velden            |
| Bouwen          | Cursor                           | Code, PR, deploy                                |
| Strategie-copy  | Claude / Gemini                  | Taken uit Obsidian-notes, geen dubbele waarheid |


## Wat niet doen (nu)

- Paid TikTok tot activatie >25%
- Everything AI add-on in ClickUp
- Notion migratie
- ClickUp als denktool (geen lange PRD's daar)
- Meerdere hero-varianten tegelijk zonder min. 100 LP views per variant

## Links in repo

- **Start hier (enige checklist):** `STRUCTURO-START-HIER.md`
- Actieplan: `docs/structuro-actieplan-2026-06.md`
- ClickUp setup: `docs/clickup-setup-checklist.md`
- Marsroute: `docs/tiktok-conversie-marsroute-2026-06-14.md`
- Bridge code: `src/lib/acquisition/bridgePaths.ts`

