# Structuro: standaard social flow, status en acties

**Datum:** 14 juni 2026  
**Doel:** Eén document met wat we vandaag hebben opgezet, wat al klaar is, wat nog moet, en hoe we social media vanaf nu aanpakken.

**Gerelateerde docs:** `tiktok-workflow.md` (stappen per video), `clickup-setup-checklist.md` (ClickUp eenmalig), `structuro-social-manager-clickup.md` (agent-regels)

---

## 1. Waar we staan (kort)

| Onderdeel | Status |
|---|---|
| ClickUp agents (Superagent + Social Manager) | **Klaar** in AI Hub |
| ClickUp lists + velden | **Door jou aangemaakt** (Social Content + Structuro's List) |
| Eerste agent-analyse (post 13 jun) | **Gedaan** → KILL op deze uitvoering |
| TikTok LP `/tiktok` + tracking in code | **Gebouwd, nog niet live** |
| Bio-link gisteren | **Fout:** ging naar `structuro.eu/registreren` i.p.v. `/tiktok` |
| PostHog na klik | **Nog beperkt meetbaar** tot deploy + juiste URL |

**Kernles vandaag:** de video hield niemand vast (0,99s kijktijd, 0,1% completion). De LP-flow was ook verkeerd voor koud TikTok-verkeer. Fix eerst hook + landing, niet budget.

---

## 2. Wat vandaag is gedaan

### 2.1 Diagnose TikTok vs PostHog

- TikTok telt ruimer (in-app klik ≠ volledige pageview in PostHog).
- Koude bezoekers op `/registreren` kregen geen PostHog-pageview door consent-gedrag.
- **Oplossing gebouwd:** auto-consent op acquisitie-routes + server-side events.

### 2.2 Code (in repo, deploy nog nodig)

| Onderdeel | Wat het doet |
|---|---|
| `/tiktok` landing | Mobiele LP, zelfde hook-belofte als video, één CTA |
| Acquisition tracking | `tiktok_landing_viewed`, CTA, signup events + UTM/`content_id` |
| Consent-fix | Acquisitie-routes meteen cookieless PostHog |
| Auth recovery fix | Wachtwoord-reset via hash tokens, direct naar `/auth/wachtwoord-instellen` |
| `TIKTOK_PROMOTE_LANDING_URL` | Vaste URL-template met `utm_content` |

### 2.3 ClickUp

- **Structuro Superagent:** doctrines, security, funnel, weekly reviews op Structuro's List.
- **Structuro Social Manager:** analyse, beslisboom, Creative Center-check, weekly overview op Social Content.
- CSV's + checklists voor velden, import-taken en verify.
- Agents reageren op `@mention` en scheduled taken.

### 2.4 Documentatie (`docs/`)

| Bestand | Inhoud |
|---|---|
| `STRUCTURO-STANDAARD-SOCIAL-2026-06-14.md` | **Dit document** |
| `tiktok-workflow.md` | Master workflow per video |
| `structuro-social-manager-clickup.md` | Social Manager instructions |
| `structuro-superagent-clickup.md` | Superagent instructions |
| `clickup-setup-checklist.md` | Eenmalige ClickUp setup |
| `clickup-verify-checklist.md` | Controleren of lists kloppen |
| `clickup-*-field-definitions.csv` | Custom fields checklist |
| `clickup-*-import-template.csv` | Voorbeeldtaken |
| `tiktok-canva-prompts.md` | Canva AI prompts |
| `tiktok-capcut-checklist.md` | Montage |
| `tiktok-posthog-dashboard.md` | PostHog funnel |

### 2.5 Eerste echte analyse (post 13 jun 2026)

**Video:** ADHD, elke dag vastlopen, niet lui, brein werkt anders, 3 dagen gratis.  
**Landing gebruikt:** `www.structuro.eu/registreren` (fout voor koud verkeer).

| Metric | Waarde | Interpretatie |
|---|---|---|
| avg_watch_sec | ~0,99s | Hook faalt direct |
| completion_pct | ~0,1% | Niemand kijkt door |
| Promote spend | €2,50 | Ok als test, niet opschalen |
| Linkkliks | 33 | Klikprijs ok, maar weinig waarde zonder retention |
| Signups | 0 | Verwacht bij deze funnel + verkeerde LP |

**Agent-oordeel:** KILL deze uitvoering. Thema eventueel TWEAK-waardig met nieuwe opener. Geen verdubbelen, geen extra budget.

---

## 3. Wat nog moet gebeuren (prioriteit)

### P0: vandaag / morgen

- [ ] **Deploy** naar productie: `/tiktok`, acquisition tracking, consent-fix, auth recovery
- [ ] **PostHog test:** bezoek `/tiktok?utm_content=test` → event `tiktok_landing_viewed`
- [ ] **TikTok bio-link wijzigen** naar:

```
https://www.structuro.ai/tiktok?utm_source=tiktok&utm_medium=organic&utm_campaign=tiktok_bio&utm_content=HUIDIGE_VIDEO_ID
```

- [ ] **Geen extra Promote** op de video van 13 jun
- [ ] **Supabase:** `https://www.structuro.ai/auth/wachtwoord-instellen` in redirect allow list

### P1: volgende post

- [ ] Nieuwe hook-variant (zelfde thema, **hardere eerste seconde**)
- [ ] ClickUp-taak aanmaken vóór post (zie flow hieronder)
- [ ] **Creative Center** loggen (`creative_center_done`)
- [ ] LP = altijd `/tiktok` met matching `utm_content`, **nooit** direct `/registreren` in bio

### P2: later (niet nu)

- [ ] n8n: PostHog `lp_views` + `signups` → ClickUp (automatisch)
- [ ] Promote-spend via Ads API (pas bij structureel budget)
- [ ] Instagram velden invullen als kanaal actief wordt

---

## 4. Standaard social media flow (vanaf nu)

Dit is **de afspraak** voor elke post (TikTok primair, Instagram later zelfde list).

```
Idee → Creative Center → Canva → CapCut → Review → Gepost → Analyse (+3 dagen) → Besluit
```

### Stap 0: ClickUp-taak (vóór je filmt)

1. Marketing → **Social Content** → **+ Add Task**
2. Naam: `SC-XXX | {content_id}` (bijv. `SC-003 | hook_v2_lui`)
3. Vul in:
   - `content_id` = `utm_content` (zelfde unieke ID)
   - `channel` = TikTok
   - `hook_type` = herkenning / spanning / tegen_intuitief / cyclus / kosten
   - `landing_url`:

```
https://www.structuro.ai/tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=tiktok_promote&utm_content={content_id}
```

4. Status: **Idee**

### Stap 1: Creative Center (verplicht)

- TikTok Creative Center: trend/gap zoeken in ADHD NL
- Vul `creative_gap_topic`, `creative_center_notes`, zet `creative_center_done = true`
- Status: **Creative Center** → **Canva**

**Regel:** geen status **Gepost** zonder `creative_center_done`.

### Stap 2: Canva + CapCut (jij + Canva)

- Canva: slides 1080×1920, hook op slide 1 **leesbaar in 1 seconde**
- CapCut: slide 1 word-by-word, max ~20s testvideo
- Check: hook = zelfde belofte als LP `/tiktok`, CTA = **3 dagen gratis**
- Zie: `tiktok-canva-prompts.md`, `tiktok-capcut-checklist.md`

### Stap 3: Review vóór posten

- [ ] Bio-link wijst naar `/tiktok` + juiste `utm_content`
- [ ] **Niet** naar `structuro.eu/registreren`
- [ ] Eerste seconde getest: zou jij zelf blijven kijken?
- Status: **Review** → **Gepost**, vul `post_date`

### Stap 4: Meten (3 dagen na post)

**Handmatig uit TikTok Creator Analytics (2 getallen):**

| Veld | Bron |
|---|---|
| avg_watch_sec | Gem. kijktijd |
| completion_pct | Completion / watched full video |

**Uit PostHog (na deploy, of handmatig tot automatisering):**

| Veld | Event |
|---|---|
| lp_views | `tiktok_landing_viewed` per `utm_content` |
| lp_cta_clicks | `tiktok_landing_cta_clicked` |
| signups | `signup_completed` met source tiktok |

**Promote:** vul `promote_budget_eur` (0 = organisch).

Zet status **Analyse**, comment:

```
@Structuro Social Manager Analyseer content_id: {content_id}. Geef WINNER/TWEAK/KILL + wat verdubbelen.
```

### Stap 5: Besluit

Agent-advies + beslisboom → status **Besluit**:

| Uitkomst | Actie |
|---|---|
| WINNER | Zelfde hook + payoff, nieuwe variant, optioneel Promote €5-10 |
| TWEAK | 1 element aanpassen (meestal hook woord 1) |
| KILL | Geen budget, nieuwe hook-test |

---

## 5. Harde regels en afspraken

### Productwaarheid

- Proefperiode: **3 dagen gratis** (niet 14 in social copy)
- Geen em-dash in user-facing tekst

### Landing en links

| Situatie | URL |
|---|---|
| TikTok bio / Promote | `https://www.structuro.ai/tiktok?utm_...&utm_content={content_id}` |
| Niet voor koud verkeer | Direct `/registreren` of `structuro.eu/registreren` |

### Budget

- Promote **pas** bij organische **completion >40%**
- Onder **30% completion:** alleen hook vervangen, **geen** Promote
- €2-5 testbudget is ok, geen opschalen op KILL-posts

### Wie doet wat

| Rol | Wie |
|---|---|
| Content maken | Canva + jij (CapCut) |
| Data invullen | Jij (TikTok cijfers, later PostHog deels auto) |
| Analyse + advies | **Structuro Social Manager** (ClickUp) |
| Doctrines / security / deploy-review | **Structuro Superagent** (Structuro's List) |

### Metrics-automatisering (afspraak)

| Metric | Nu | Later |
|---|---|---|
| completion_pct, avg_watch_sec | Handmatig uit TikTok app | Blijft handmatig tot hoog volume |
| lp_views, signups | Handmatig of 0 tot deploy | n8n PostHog → ClickUp |
| promote_budget_eur | Handmatig | Ads API als budget structureel wordt |

Geen unofficial TikTok scraping APIs.

### Analyse-timing

- **Voorlopig** na 48u mag, **definitief** pas na **3 dagen** (`post_date + 3`)
- Agent scheduled + `@mention` op status **Analyse**

---

## 6. Beslisboom (Social Manager)

| completion_pct | lp_views | signups | Advies |
|---|---|---|---|
| <30% | * | * | Nieuwe hook, zelfde payoff. Geen Promote. **KILL/TWEAK** |
| 30-40% | * | * | 1 woord hook tweaken, opnieuw testen |
| >40% | laag | * | Video ok: fix bio, CTA, LP |
| >40% | ok | 0 | LP/registratie probleem, geen nieuwe video yet |
| >40% | ok | ≥1 | **WINNER:** verdubbel hook + payoff, nieuwe content_id |

---

## 7. ClickUp (twee agents, twee lists)

### Structuro Social Manager → Marketing > Social Content

- 22 custom fields, 8 statussen
- Wekelijks: Social Weekly Overview taak
- Trigger analyse: metrics + status Analyse + `@Structuro Social Manager`

### Structuro Superagent → Structuro's List

- 20 custom fields, 7 statussen (Ready/Live = review-trigger)
- Wekelijks: Product / Security / Doctrine review ankers
- **Niet** voor social content taken

Verify: `clickup-verify-checklist.md`

---

## 8. Post van 13 jun: wat we nu doen

1. **Niet** verdubbelen, **niet** extra Promote
2. ClickUp-taak bijwerken: `learning_notes` = KILL hook + verkeerde LP
3. **Deploy** `/tiktok` + tracking
4. Bio-link fixen na deploy
5. Volgende video: zelfde thema (ADHD vastlopen), **nieuwe opener sec 0-1**

**Voorbeeld richting nieuwe hook (niet copy-paste blind):**

- Fout: uitleg over ADHD in slide 1
- Beter: herkenning of spanning in woord 1, bijv. cyclus/week 3 angle of "40 minuten staren" angle (hook-test uit SC-002)

Optioneel scherper agent-advies: beschrijf eerste 5 seconden shot-voor-shot in ClickUp-comment.

---

## 9. Tech-deploy checklist (kort)

Na merge/deploy controleren:

1. `https://www.structuro.ai/tiktok` laadt op mobiel
2. PostHog: `tiktok_landing_viewed` bij bezoek met UTM
3. CTA klik → `tiktok_landing_cta_clicked`
4. Registreren flow → `tiktok_signup_started` / `signup_completed`
5. Wachtwoord-reset → `/auth/wachtwoord-instellen` (geen auth-code-error loop)

---

## 10. Wekelijks ritme

| Wanneer | Wat |
|---|---|
| Ma 08:00 | Superagent: weekly product/security/doctrine comments |
| Ma 09:00 | Social Manager: Social Weekly Overview taak |
| Dagelijks 10:00 | Social Manager: posts met analysis_due_date = vandaag |
| Per post +3 dagen | Jij: metrics → Analyse → agent comment |
| Per nieuwe video | Flow sectie 4 volgen |

---

## 11. Volgende acties (vandaag / morgen)

| # | Actie | Eigenaar |
|---|---|---|
| 1 | Deploy `/tiktok` + tracking + auth fix | Dev |
| 2 | PostHog live test | Dev |
| 3 | Bio-link naar `/tiktok` | Niels |
| 4 | Supabase redirect allow list | Dev |
| 5 | Geen budget op post 13 jun | Niels |
| 6 | Volgende post voorbereiden in ClickUp (nieuwe hook) | Niels |
| 7 | Creative Center invullen vóór Canva | Niels |

---

## 12. Documentindex

| Vraag | Open dit |
|---|---|
| Hoe maak ik een video? | `tiktok-workflow.md` |
| ClickUp eenmalig opzetten? | `clickup-setup-checklist.md` |
| Kloppen mijn lists? | `clickup-verify-checklist.md` |
| Agent regels social? | `structuro-social-manager-clickup.md` |
| Agent regels product? | `structuro-superagent-clickup.md` |
| Canva prompts? | `tiktok-canva-prompts.md` |
| PostHog funnel? | `tiktok-posthog-dashboard.md` |
| **Status + afspraken vandaag** | **Dit document** |

---

## 13. Hero-layouts A–E × campagnes (alle vijf open)

**Principe:** vijf hero-layouts blijven beschikbaar. Per post kies je **campagne (copy)** + **hero (vorm)**. Config: `src/lib/tiktok/lpConfig.ts` en `docs/design/lp-config.jsx`.

### Hero-layouts

| Hero | Naam | Gebruik voor |
|---|---|---|
| **A** | Rust | Scherpe pijn in headline, weinig ruis |
| **B** | Live demo | App/energie-picker, video eindigt op product |
| **C** | Dark focus | Confronterende hook, donkere ad |
| **D** | One promise | Warm, editorial, retargeting / Instagram |
| **E** | Ochtendritueel | Payoff = 3 tikken / anti-lijst uitleg |

Design previews: `Structuro hero alternatieven.html` (Downloads/App).

### Campagnes (headline/copy)

| Campagne | utm_content (voorbeeld) | Theme |
|---|---|---|
| staren | hook_40min_staren | light |
| nietlui | hook_niet_lui | warm |
| cyclus | hook_week3_cyclus | light |
| geenlijsten | hook_geen_lijsten | light |
| weten | hook_weten_vs_beginnen | dark |

### Aanbevolen startcombinaties (default)

| Campagne | Default hero | Alternatieven om te testen |
|---|---|---|
| staren | **A** | B |
| nietlui | **A** | B (niet D als hook in video zacht is) |
| cyclus | **B** | A, B |
| geenlijsten | **E** | A, B |
| weten | **C** | A, C |

**Alle heroes A–E blijven toegestaan** via URL. Default is alleen het startpunt.

### Landing URL-template

```
https://www.structuro.ai/tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=tiktok_promote&utm_content={content_id}&campaign={campagne}&hero={A|B|C|D|E}
```

Voorbeeld cyclus + live demo:

```
https://www.structuro.ai/tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=tiktok_promote&utm_content=week3_v2&campaign=cyclus&hero=B
```

### ClickUp per post

Vul naast `landing_url` ook (handmatig of in description):

| Veld | Waarde |
|---|---|
| `lp_campaign` | staren / nietlui / cyclus / geenlijsten / weten |
| `lp_hero` | A / B / C / D / E |

Zelfde combo als in `landing_url`. Social Manager kan LP-match beoordelen.

### Vaste regels (onveranderd)

- Altijd `/tiktok`, nooit direct `/registreren` in bio
- Headline op LP = zelfde hook als slide 1 video
- `utm_content` = unieke `content_id` per post
