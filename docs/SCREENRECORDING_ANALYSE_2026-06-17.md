# Screenrecording-analyse structuro.ai

**Datum:** 17 juni 2026  
**Bron:** PostHog Session Replay (project Structuro App)  
**Scope:** Alle opgenomen sessies met www.structuro.ai in de afgelopen 90 dagen  

## Samenvatting

In PostHog staan **7 screenrecordings** op www.structuro.ai. Daarvan is **één sessie een echte activatie** (Patricia). De rest is acquisitie-verkenning, korte bounces of open tabs zonder interactie.

| Categorie | Aantal | Aandeel |
|-----------|--------|---------|
| Activatie geslaagd | 1 | 14% |
| Acquisitie / landing (geen signup) | 1 | 14% |
| Korte verkenning / test | 2 | 29% |
| Zombie-sessies (tab open, geen actie) | 3 | 43% |

**Belangrijkste frictie (Patricia):** dagstart swipe-dead-end en niet-reagerende knop "Zelf typen" bij micro-steps.  
**Doorgevoerde fixes:** zie sectie Implementatie onderaan.

---

## Overzicht alle recordings

| # | Gebruiker | Duur | Actief | Clicks | Entry | Outcome | Replay |
|---|-----------|------|--------|--------|-------|---------|--------|
| 1 | Patricia | 17m 31s | 7m 26s | 320 | /consent | Activatie | [Replay](https://eu.posthog.com/project/175224/replay/019ed442-eac8-7577-8fc4-8fba8ea0d788) |
| 2 | 019ed235 | 13m 35s | 32s | 0 | / | Tab open / idle | [Replay](https://eu.posthog.com/project/175224/replay/019ed448-004b-789d-ad5e-32634e06dd09) |
| 3 | onbekend | 30m 00s | 0s | 0 | /login | Zombie | [Replay](https://eu.posthog.com/project/175224/replay/019ed2c9-0036-793a-b57d-f11fb68dfbe2) |
| 4 | onbekend | 23s | 4s | 14 | /start organic | Landing, geen signup | [Replay](https://eu.posthog.com/project/175224/replay/019ed26e-46a6-7bbd-bb4d-83349d3948d0) |
| 5 | 019ed235 | 1s | 0s | 0 | / | Bounce | [Replay](https://eu.posthog.com/project/175224/replay/019ed25d-ae2b-71ee-b5f3-29d86b5d0e96) |
| 6 | 019ed235 | 30m 05s | 0s | 0 | /start nav | Zombie | [Replay](https://eu.posthog.com/project/175224/replay/019ed235-123d-74bb-8238-6b04d12a1987) |
| 7 | onbekend | 36s | 1s | 2 | / | Korte test | [Replay](https://eu.posthog.com/project/175224/replay/019ed151-1b04-7c49-8dd5-db0af59f76ff) |

---

## Patricia (referentie-activatie)

- **Outcome:** dagstart af, 5+ taken, AI micro-steps later wel gebruikt, taken afgevinkt
- **Frictie 1:** ~6 min dagstart; 3x energy gekozen; swipe dead-end "alle taken geswiped"
- **Frictie 2:** "Zelf typen" dead click bij taak Coach op vormgeven
- **Sentiment:** friction 0.4, success true

---

## Overige sessies

**Sessie 4 (/start):** 14 clicks in 23s, organic CTA 2x naar registreren, ook zelftest bekeken, geen signup.

**Zombie (3, 5, 6):** 30 min idle of 1s bounce, geen productfrictie.

**Sessie 7:** identify + 1x dagstart_energy, geen dagstart_completed (smoke test).

---

## Implementatie (17 juni 2026)

### P0 Micro-steps
- Bugfix "Zelf typen" (manual mode + focus)
- Derde optie op eerste micro-scherm

### P0 Dagstart swipe
- Duidelijkere copy (rechts = vandaag)
- Escape "Laat Structuro kiezen"

### P1 Events
- dagstart_path_chosen, dagstart_swipe_exhausted
- dagstart_empty_selection_hint_shown / _dismissed
- new_task_flow_completed (micro_source: skip | ai | manual)

Bestanden: NewTaskFlow.tsx, StepSwipe.tsx, DagstartFlow.tsx, analytics-events.ts, localeAddons.ts
