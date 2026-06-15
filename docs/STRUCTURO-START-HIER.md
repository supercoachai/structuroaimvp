# Structuro: start hier

> **Dit is het enige document dat je dagelijks nodig hebt.**  
> Alles andere in `docs/` is referentie of archief. Open Obsidian op `docs/obsidian/` en pin deze note bovenaan.

**Laatste update:** 15 juni 2026

---

## In 30 seconden: wat doe ik wanneer?

| Situatie | Open dit | Tool |
|----------|----------|------|
| "Wat moet ik vandaag?" | **Deze pagina → Blok A** | Obsidian |
| "Ik ga iets bouwen" | ClickUp taak → Cursor | ClickUp + Cursor |
| "Ik heb een idee" | Obsidian note → Gemini → ClickUp | Obsidian |
| "Het is maandag" | **Blok C** | PostHog + ClickUp |
| "Ik maak een TikTok post" | **Blok D** + `tiktok-workflow.md` | ClickUp |
| "ClickUp setup klopt niet?" | `clickup-verify-checklist.md` | ClickUp |
| "Copy-paste in ClickUp Builder" | `clickup-antwoorden-copy-paste.md` | ClickUp |

---

## Al klaar (in code, niet opnieuw doen)

Deze dingen staan **live in de repo**. Geen actie, tenzij je deploy moet pushen:

- [x] Organic bridge `/start` + TikTok bridge `/tiktok`
- [x] structuro.eu organic → `/start`, paid TikTok → `/tiktok`
- [x] Zelftest sticky CTA + analytics
- [x] Onboarding compact (5 stappen)
- [x] Magic link signup
- [x] TikTok conditional copy op `/registreren`
- [x] `STRUCTURO_CONTEXT.md` + Cursor rule
- [x] Obsidian starter vault in `docs/obsidian/`
- [x] ClickUp CSV templates + import docs

**Jij hoeft dit niet opnieuw te bouwen.** Alleen deployen/verifiëren op productie als dat nog niet live staat.

---

## Blok A: Eenmalig deze week (~90 min)

Doe in deze volgorde. Stop na elk blokje en vink af in Obsidian of ClickUp.

### A1. ClickUp Unlimited (5 min)

- [ ] ClickUp → Settings → Billing → **Unlimited trial**
- [ ] **Geen** Brain AI add-on (besluit over 7 dagen, zie Blok E)

**Detail:** alleen als je vastloopt → `clickup-setup-checklist.md`

---

### A2. Social Content list (25 min)

- [ ] Space **Marketing** → list **Social Content**
- [ ] 8 statussen: Idee → Creative Center → Canva → CapCut → Review → Gepost → Analyse → Besluit
- [ ] Custom fields: loop `clickup-social-content-field-definitions.csv`
- [ ] Import CSV: `clickup-social-content-import-template.csv`
- [ ] Check: SC-001, SC-002, SC-003, Social Weekly Overview bestaan

**Verify (5 min):** `clickup-verify-checklist.md` § Social Content

---

### A3. Structuro's List (25 min)

- [ ] Space **Structuro** → list **Structuro's List**
- [ ] 7 statussen incl. **Ready** en **Live**
- [ ] Custom fields: loop `clickup-structuro-list-field-definitions.csv`
- [ ] Import CSV: `clickup-structuro-list-import-template.csv`
- [ ] Check: 3 Weekly-* ankers + PRD-001 t/m PRD-010

**Verify (5 min):** `clickup-verify-checklist.md` § Structuro's List

---

### A4. AI-tools koppelen (20 min)

| Tool | Actie | Status |
|------|-------|--------|
| **Obsidian** | Open vault `docs/obsidian/` → start `Structuro Home.md` | [ ] |
| **Claude** | Upload `STRUCTURO_CONTEXT.md` als project knowledge | [ ] |
| **Gemini** | Plak samenvatting uit `STRUCTURO_CONTEXT.md` in custom instructions | [ ] |
| **Cursor** | Al actief via `.cursor/rules/structuro-context.mdc` | [x] |

Geen plugins in Obsidian eerste 2 weken.

---

### A5. ClickUp agents (optioneel, +30 min)

Alleen als je AI Hub hebt. Anders overslaan en maandag-routine eerst op gang brengen.

**Structuro Social Manager** (list: Social Content):

- [ ] Instructions: `structuro-social-manager-clickup.md`
- [ ] Knowledge: `tiktok-workflow.md`, `tiktok-canva-prompts.md`, `tiktok-capcut-checklist.md`, `tiktok-posthog-dashboard.md`
- [ ] Scheduled: dagelijks 10:00 analyse; maandag 09:00 weekly overview

**Structuro Superagent** (list: Structuro's List):

- [ ] Instructions: `structuro-superagent-clickup.md`
- [ ] Knowledge: `STRUCTURO_CONTEXT.md` + superagent doc
- [ ] Automations: Task Created; status → Ready/Live
- [ ] Scheduled: maandag 08:00 op Weekly-* taken

**Copy-paste hulp:** `clickup-antwoorden-copy-paste.md`

---

### A6. Productie check (10 min)

Controleer in browser (niet in ClickUp):

- [ ] https://www.structuro.ai/start laadt
- [ ] https://www.structuro.ai/tiktok laadt
- [ ] structuro.eu zelftest CTA gaat naar `/start`

---

## Blok B: Open producttaken (wanneer je bouwt)

Max **3 open** taken met `funnel_stage = Activation` tegelijk. Rest in Backlog.

| Taak | Wat | Tool | Status |
|------|-----|------|--------|
| PRD-002 | Auth recovery hash fix (Patricia) | Cursor | [ ] Ready → Live |
| PRD-003 | Supabase redirect allow list `/auth/wachtwoord-instellen` | Supabase dashboard | [ ] In Progress |
| PRD-004 | PostHog token strip in before_send | Cursor | [ ] Backlog |
| PRD-007 | Onboarding compact **meten** na deploy | PostHog | [ ] Live, meet signup→dagstart |
| PRD-010 | Paid TikTok **niet doen** tot activatie >25% | — | bewust Backlog |

**Niet doen:** paid TikTok ads, hero A/B zonder 100+ LP views per variant.

---

## Blok C: Elke maandag (15 min)

Zet reminder in telefoon/agenda. ClickUp kan ook reminder op Weekly Product Review.

1. [ ] **PostHog** ([project 175224](https://eu.posthog.com/project/175224)): per actieve `utm_content` (7 dagen):
   - `acquisition_landing_viewed`
   - `organic_landing_cta_clicked` of `tiktok_landing_cta_clicked`
   - `signup_completed` → `dagstart_completed`
2. [ ] **ClickUp Social Content:** vul `lp_views`, `lp_cta_clicks`, `signups`; `analysis_done=true` als post >3 dagen
3. [ ] **ClickUp Structuro's List:** max 3 open Activation-taken; rest Backlog
4. [ ] **Comment op Weekly Product Review:** "Deze week: [X]. Niet doen: [Y]."

**Detail:** `docs/obsidian/03 Growth/PostHog-maandag-routine.md`

**ClickUp helpt:** vraag agent (als actief): "Welke posts hebben views maar 0 signups?"

---

## Blok D: Als je content post (per post)

1. [ ] Nieuwe taak `SC-xxx | {content_id}` in Social Content
2. [ ] `content_id` = `utm_content` in URL
3. [ ] `landing_url`: `/start` (organic) of `/tiktok` (TikTok), **nooit** `/registreren`
4. [ ] Creative Center stap (`creative_center_done=true`) vóór Gepost
5. [ ] Canva → CapCut → Gepost + `post_date`
6. [ ] +3 dagen: metrics (of wacht op maandag Blok C)

**Workflow detail:** `tiktok-workflow.md`  
**Canva/CapCut:** `tiktok-canva-prompts.md`, `tiktok-capcut-checklist.md`

---

## Blok E: Over 7 dagen (10 min)

Houd simpele log: hoe vaak opende je ClickUp? Irriteerde plakken?

| Patroon | Besluit |
|---------|---------|
| ≥5×/week + plakken irriteert | Unlimited + Brain AI ($19) |
| ≥5×/week + gaat prima | Alleen Unlimited ($10) |
| <3×/week | Geen betaling; eerst maandag-routine fixen |

---

## Welke tool helpt tegen verdwaald raken?

### Obsidian = kompas (denken)

- **Pin:** `Structuro Home.md` + link naar dit document
- **Regel:** elk idee = 1 note, geen taken in Obsidian
- **Vraag aan Gemini/Claude:** "Lees mijn open vragen in Structuro Home en maak max 3 ClickUp-taken"

### ClickUp = rails (doen)

- **Alleen** status, funnel_stage, metrics
- **Niet** lange PRD's typen; link naar Obsidian note in taakbeschrijving
- **Weekfocus:** 1 comment op Weekly Product Review

### NotebookLM = research-sprint (af en toe)

- Alleen bij 5+ bronnen tegelijk (interviews, papers)
- Output → plak als sectie in Obsidian note → daarna dicht

### PostHog = waarheid (meten)

- Beslissingen over content/ads **alleen** na Blok C cijfers

---

## Documentenkaart (niet alles lezen)

### ACTIEF (mag je openen)

| Bestand | Wanneer |
|---------|---------|
| **STRUCTURO-START-HIER.md** (dit doc) | Altijd eerst |
| `STRUCTURO_CONTEXT.md` | AI context, doctrine |
| `structuro-actieplan-2026-06.md` | Uitleg waarom achter het plan |
| `clickup-setup-checklist.md` | Eenmalige ClickUp setup (detail) |
| `clickup-verify-checklist.md` | Na setup: klopt alles? |
| `clickup-antwoorden-copy-paste.md` | ClickUp Builder copy-paste |
| `tiktok-workflow.md` | Content maken |
| `tiktok-conversie-marsroute-2026-06-14.md` | Funnel-strategie |
| `obsidian/*` | Denkwerk |

### REFERENTIE (alleen als je het nodig hebt)

| Bestand | Wanneer |
|---------|---------|
| `structuro-social-manager-clickup.md` | Social agent instellen |
| `structuro-superagent-clickup.md` | Product agent instellen |
| `clickup-social-content-import.md` | Field import uitleg |
| `clickup-structuro-list-import.md` | Product list import |
| `tiktok-canva-prompts.md` | Canva slides |
| `tiktok-capcut-checklist.md` | Montage |
| `tiktok-posthog-dashboard.md` | Dashboard bouwen |
| `STRUCTURO-STANDAARD-SOCIAL-2026-06-14.md` | Social standaarden |

### ARCHIEF (negeren tenzij launch/Stripe issue)

| Bestand | Waarom archief |
|---------|----------------|
| `LAUNCH-CHECKLIST-2026-05-31.md` | Launch mei; app draait al |
| `LAUNCH-NIGHT-RUNBOOK.md` | Idem |
| `claude-context/STATE.md` | Snapshot mei; verouderd |
| `tiktok-clickup-agent.md` | Vervangen door social-manager + superagent docs |

---

## Flows (1 regel)

```
Idee → Obsidian → (NotebookLM?) → Gemini → ClickUp → Cursor → Live → PostHog
Content → ClickUp SC-xxx → Canva → post → maandag metrics
Maandag → PostHog → ClickUp → weekfocus
```

---

## Als je vastloopt

1. Stop met nieuwe docs lezen
2. Open alleen **Blok A** hierboven, volgende unchecked regel
3. Vraag in Cursor: "Wat is de volgende stap uit STRUCTURO-START-HIER Blok A?"
4. Vraag in ClickUp (met Brain AI, na week 1): "Welke open Activation-taken staan er?"

---

*Dit document vervangt niet de detaildocs; het vervangt de behoefte om ze allemaal tegelijk te onthouden.*
