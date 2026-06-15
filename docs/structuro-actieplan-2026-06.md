# Structuro actieplan (juni 2026)

> **Enige checklist:** [`STRUCTURO-START-HIER.md`](STRUCTURO-START-HIER.md)  
> Dit document legt uit *waarom*. Start daar voor *wat*.

Pragmatisch stappenplan: ClickUp + Obsidian + wekelijkse routine. Geüpdatet na marsroute (`/start`, `/tiktok`) en Obsidian als denkgeheugen.

**Gerelateerd:** `STRUCTURO_CONTEXT.md`, `clickup-setup-checklist.md`

---

## Fase 0: Besluit (10 min)

### Doel komende 4 weken

Structuro heeft **twee lekken**:

1. **Acquisitie** — komt koud verkeer tot signup? (`/start`, `/tiktok`)
2. **Activatie** — doet een signup een dagstart? (baseline ~6%, doel >40%)

ClickUp = experimentenregister + prioriteitenfilter. Obsidian = denkgeheugen. Geen van beiden vervangt Cursor.

### Check huidige staat ClickUp

| Situatie | Actie |
|----------|-------|
| Leeg / Free tier | Start Fase 1 |
| Ingericht maar verouderd | Fase 1.4 + landing_url's updaten |
| Al dagelijks in gebruik | Spring naar Fase 3 |

---

## Fase 1: ClickUp Unlimited trial (~60 min)

**Unlimited ($10):** 15+ custom fields per list. **Nog geen Brain AI** tot na 1 week routine.

Volg `clickup-setup-checklist.md` voor detail. Kort:

### 1.1 Unlimited trial (5 min)

ClickUp → Settings → Billing → **Unlimited** trial. Geen Brain AI add-on.

### 1.2 Social Content + Structuro's List (40 min)

Import via CSV's in `docs/`. Zie `clickup-social-content-import.md` en `clickup-structuro-list-import.md`.

**landing_url regels:**

- Organic: `https://www.structuro.ai/start?utm_source=structuro_eu&utm_medium=organic&utm_campaign=website&utm_content={content_id}`
- TikTok: `https://www.structuro.ai/tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=tiktok_promote&utm_content={content_id}`

### 1.3 P0-taken (15 min)

| Taak | funnel_stage | Status |
|------|--------------|--------|
| `/start` organic bridge | Acquisition | Live |
| Zelftest CTA → `/start` | Acquisition | Live / Review |
| Onboarding compact (5 stappen) | Activation | Live / In Progress |
| Magic link signup | Activation | Live |
| TikTok conditional copy registreren | Acquisition | Live |
| Paid TikTok **uit** tot activatie >25% | Acquisition | Backlog (bewust) |

---

## Fase 2: Obsidian vault + context (45 min)

### 2.1 Obsidian openen (10 min)

1. Obsidian → Open folder as vault → `docs/obsidian/` in deze repo
2. **Geen plugins** eerste 2 weken
3. Start bij `Structuro Home.md`

### 2.2 STRUCTURO_CONTEXT koppelen (10 min)

| Tool | Actie |
|------|-------|
| Cursor | `.cursor/rules/structuro-context.mdc` (automatisch) |
| Obsidian | Hub `Structuro Home.md` |
| Claude | Project knowledge: `STRUCTURO_CONTEXT.md` |
| Gemini | Custom instructions: samenvatting |

**Niet** in ClickUp Brain trainen.

### 2.3 Eerste notes (25 min)

Vul starter-notes in `docs/obsidian/` (Product, Growth, Interviews).

---

## Fase 3: Wekelijkse routine (15 min maandag)

1. PostHog → ClickUp Social metrics (`lp_views`, `lp_cta_clicks`, `signups`)
2. Funnel signup → dagstart; max 3 open Activation-taken
3. 1 weekfocus op Weekly Product Review

Events: `acquisition_landing_viewed`, `organic_landing_cta_clicked`, `tiktok_landing_*`, `signup_completed`, `dagstart_completed`.

---

## Fase 4: Dagelijkse flows

### Idee → taak

```
Ruwe dump → Obsidian note
→ (optioneel) NotebookLM batch → conclusie naar Obsidian
→ Gemini → ClickUp taken
```

### Bouwen

```
ClickUp taak → Cursor → PR → Live → PostHog check
```

### Content

```
SC-xxx → content_id + landing_url (/start of /tiktok) → post → metrics maandag
```

---

## Fase 5: Brain AI (na 1 week)

| Patroon | Besluit |
|---------|---------|
| ≥5×/week + plakken irriteert | Unlimited + Brain AI ($19) |
| ≥5×/week + prima | Alleen Unlimited ($10) |
| <3×/week | Eerst maandag-routine |

---

## Week 1 checklist

- [ ] Unlimited trial (geen Brain AI)
- [ ] Beide ClickUp lists + CSV import
- [ ] P0 status updaten
- [ ] Obsidian vault openen
- [ ] STRUCTURO_CONTEXT in Claude/Gemini
- [ ] Maandag-routine ingepland
