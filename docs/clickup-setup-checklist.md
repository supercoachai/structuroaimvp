# ClickUp setup checklist (master)

> **Eerst:** [`STRUCTURO-START-HIER.md`](STRUCTURO-START-HIER.md) (jouw enige todo-lijst).  
> Dit bestand is **detail** voor ClickUp setup (Blok A2–A3).

Eén overzicht voor **beide lists**, **beide Super Agents**, CSV-import en automations.

**Geschatte tijd totaal:** ~60 min (eenmalig)  
**Laatste update:** 15 juni 2026

---

## Architectuur (2 agents, 2 lists)

| Agent | List | Space | Doet |
|---|---|---|---|
| **Structuro Superagent** | Structuro's List | Structuro | Doctrines, security, funnel, roadmap |
| **Structuro Social Manager** | Social Content | Marketing | TikTok + Instagram data, analyse, verdubbel-advies |

**Regel:** geen automations op Social Content voor Superagent. Geen TikTok-scripts als default-output van Superagent.

---

## Bestanden (alles in `docs/`)

### Social Content (Marketing)

| Bestand | Gebruik |
|---|---|
| `clickup-social-content-field-definitions.csv` | Checklist custom fields (primair) |
| `clickup-social-content-fields.csv` | Zelfde velden, compact formaat |
| `clickup-social-content-import-template.csv` | 3 voorbeeldtaken importeren |
| `clickup-social-content-import.md` | Detailhandleiding Social Content |
| `structuro-social-manager-clickup.md` | Agent instructions + workflow |

### Structuro's List (Product)

| Bestand | Gebruik |
|---|---|
| `clickup-structuro-list-field-definitions.csv` | Checklist custom fields |
| `clickup-structuro-list-import-template.csv` | 8 voorbeeldtaken (3 weekly + 5 sprint) |
| `clickup-structuro-list-import.md` | Detailhandleiding Structuro's List |
| `structuro-superagent-clickup.md` | Agent instructions + doctrine-regels |

### Copy-paste voor ClickUp Builder

| Bestand | Gebruik |
|---|---|
| `clickup-antwoorden-copy-paste.md` | Antwoorden direct plakken in Builder |


---

## Tool-stack (denken → doen → bouwen)

| Laag | Tool | Doc |
|---|---|---|
| Denkgeheugen | Obsidian (`docs/obsidian/`) | `structuro-actieplan-2026-06.md` Fase 2 |
| Context AI | `STRUCTURO_CONTEXT.md` | Cursor rule + Claude/Gemini |
| Research-sprint | NotebookLM (optioneel) | Export naar Obsidian |
| Taken + metrics | ClickUp Unlimited | Deze checklist |
| Bouwen | Cursor | Repo |

**ClickUp Unlimited trial:** start zonder Brain AI. Besluit Brain AI na 1 week maandag-routine.


## Fase 0: Voorbereiding (5 min)

- [ ] ClickUp workspace open, AI Hub / Super Agents beschikbaar
- [ ] Repo docs klaar (of zip van `docs/tiktok-*.md` + agent-docs)
- [ ] Doctrines-doc klaar voor Superagent Knowledge (ClickUp Doc of PDF)

---

## Fase 1: Social Content list (20 min)

Detail: `clickup-social-content-import.md`

### 1.1 List aanmaken

- [ ] Space **Marketing** → list **Social Content**
- [ ] Statussen (exacte spelling):

```
Idee → Creative Center → Canva → CapCut → Review → Gepost → Analyse → Besluit
```

### 1.2 Custom fields

- [ ] Open `clickup-social-content-field-definitions.csv`
- [ ] List → Settings → Custom Fields → loop rij voor rij
- [ ] Dropdown-opties **exact** overnemen (bijv. `cyclus`, niet `Cyclus`)

**Snelle volgorde:** post_date → channel → content_id → landing_url → hook_* → creative_center_* → metrics → analysis_*

### 1.3 CSV import

- [ ] List → ⋯ → Import → CSV
- [ ] Upload `clickup-social-content-import-template.csv`
- [ ] Map elke kolom naar hetzelfde custom field
- [ ] Controleer 3 taken: SC-001, SC-002, Social Weekly Overview

### 1.4 Structuro Social Manager

- [ ] AI Hub → nieuwe agent **Structuro Social Manager**
- [ ] Instructions: copy uit `structuro-social-manager-clickup.md` §3
- [ ] Knowledge uploaden:
  - [ ] `tiktok-workflow.md`
  - [ ] `tiktok-canva-prompts.md`
  - [ ] `tiktok-capcut-checklist.md`
  - [ ] `tiktok-posthog-dashboard.md`
  - [ ] `structuro-social-manager-clickup.md`
- [ ] Scheduled:
  - [ ] Dagelijks 10:00 → analyse taken met `analysis_due_date = vandaag`
  - [ ] Maandag 09:00 → weekly overview taak

### 1.5 Social automations (optioneel)

- [ ] Status Gepost + `creative_center_done = false` → waarschuwing
- [ ] `post_date + 3 dagen` → reminder metrics + @Social Manager

---

## Fase 2: Structuro's List (20 min)

Detail: `clickup-structuro-list-import.md`

### 2.1 List aanmaken

- [ ] Space **Structuro** → list **Structuro's List**
- [ ] Statussen:

```
Backlog → In Progress → Review → Ready → Live → Blocked → Done
```

**Belangrijk:** Ready en Live triggeren Superagent-review.

### 2.2 Custom fields

- [ ] Open `clickup-structuro-list-field-definitions.csv`
- [ ] Maak 20 velden aan (work_type, work_area, doctrine_*, touches_*, superagent_*)

### 2.3 CSV import

- [ ] Upload `clickup-structuro-list-import-template.csv`
- [ ] Controleer ankers:
  - [ ] Weekly Product Review | 2026-W24
  - [ ] Weekly Security Check | 2026-W24
  - [ ] Weekly Doctrine Review | 2026-W24
- [ ] Controleer sprint-taken PRD-001 t/m PRD-005

### 2.4 Structuro Superagent

- [ ] AI Hub → nieuwe agent **Structuro Superagent**
- [ ] Instructions: hybride doctrine-blok uit `structuro-superagent-clickup.md`
- [ ] Knowledge uploaden:
  - [ ] Doctrines
  - [ ] `structuro-superagent-clickup.md`
  - [ ] Security audit docs (indien aanwezig)
- [ ] **Niet** uploaden: `tiktok-canva-prompts.md` (Social Manager)
- [ ] Automations op **Structuro's List**:
  - [ ] Task Created → doctrine + knelpunten comment
  - [ ] Status → Ready → security/data/doctrine check
  - [ ] Status → Live → zelfde check
- [ ] Scheduled:
  - [ ] Maandag 08:00 → comments op 3 Weekly-* anker-taken

---

## Fase 3: Eerste test (10 min)

### Social Manager test

- [ ] Open **SC-001 | week3_v2**
- [ ] Vul metrics in, zet status **Analyse**
- [ ] Comment: `@Structuro Social Manager Geef analyse + verdubbel/kill advies`
- [ ] Agent reageert met beslisboom-advies

### Superagent test

- [ ] Maak testtaak: `TEST | Nieuwe taak doctrine-check`
- [ ] Vul work_type, work_area, touches_posthog in
- [ ] Check Task Created comment van Superagent
- [ ] Zet status **Ready** → check review (ok / warning / veto)

### Deploy-taken (uit template, jun 2026)

- [x] PRD-001 TikTok LP + tracking → Live
- [x] PRD-006 Organic `/start` + structuro.eu CTAs → Live
- [x] PRD-007 Onboarding compact → Live (meten)
- [x] PRD-008 Magic link signup → Live
- [x] PRD-009 TikTok registreren-copy → Live
- [ ] PRD-010 Paid TikTok **bewust Backlog** tot activatie >25%
- [ ] PRD-002 Auth recovery → Live na deploy
- [ ] PRD-003 Supabase redirect allow list afmaken

---

## Fase 4: Productkoppelingen (5 min)

Buiten ClickUp, maar nodig voor agents om zinvol te meten:

- [ ] Organic bridge live: https://www.structuro.ai/start
- [ ] TikTok bridge live: https://www.structuro.ai/tiktok
- [ ] structuro.eu organic CTAs → `/start` (niet `/registreren`)
- [ ] Promote URL TikTok: `?utm_content={{content_id}}`
- [ ] PostHog: `acquisition_landing_viewed` + channel events → signup → dagstart
- [ ] Supabase: `/auth/wachtwoord-instellen` in redirect allow list
- [ ] TikTok bio-link → `/tiktok`
- [ ] Obsidian vault open op `docs/obsidian/`
- [ ] `STRUCTURO_CONTEXT.md` in Claude/Gemini

Zie ook: `tiktok-workflow.md`, `structuro-actieplan-2026-06.md`.

---

## Wekelijks ritme (na setup)

| Wanneer | Wie | Wat |
|---|---|---|
| Ma 08:00 | Superagent | Comments op Weekly Product / Security / Doctrine |
| Ma 09:00 | Social Manager | Nieuwe taak Social Weekly Overview |
| Dagelijks 10:00 | Social Manager | Analyse posts met analysis_due_date = vandaag |
| Na elke post +3 dagen | Jij + Social Manager | Metrics invullen → Analyse → agent-advies |
| Bij nieuwe producttaak | Superagent | Task Created review |
| Vóór deploy | Superagent | Ready-check |
| Na deploy | Superagent | Live-check |

---

## Doctrine-regels (Superagent, hybride)

| Type | Gedrag |
|---|---|
| Security / AVG / auth / data | **Hard veto** (`superagent_review_status = veto`) |
| Product-doctrines | Sterk afraden + alternatief |
| Expliciet experiment | `experiment_waiver = true` + subtask "Experiment – wijkt af van [doctrine X]" |

Doctrines: Anti-Neurotypisch Veto, Progressive Visual Silence, Amnestische Backlog, Empirische Firewall, executie-interface.

---

## Troubleshooting

| Probleem | Oplossing |
|---|---|
| CSV kolom niet gemapt | Custom field naam = exact CSV header |
| Dropdown import faalt | Waarde moet exact optie zijn |
| Agent reageert niet | Check agent gekoppeld aan juiste list + @ mention |
| Superagent op social taken | Automation staat op verkeerde list |
| Geen PostHog data | Deploy PRD-001 + consent-fix live |
| creative_center_done vergeten | Geen status Gepost zonder checkbox |

---

## Volgorde aanbevolen (als je alles in één sessie doet)

```
1. Social Content list + velden + CSV
2. Social Manager agent + Knowledge
3. Structuro's List + velden + CSV
4. Superagent agent + Knowledge + automations
5. Eerste tests (SC-001 + TEST taak)
6. Deploy PRD-001/002/003
7. Eerste echte TikTok post via workflow (tiktok-workflow.md)
```

---

## Snelle links

- TikTok workflow: `tiktok-workflow.md`
- Builder antwoorden: `clickup-antwoorden-copy-paste.md`
- Social detail: `clickup-social-content-import.md`
- Product detail: `clickup-structuro-list-import.md`

---

**Standaard + status (14 jun 2026):** `STRUCTURO-STANDAARD-SOCIAL-2026-06-14.md`
