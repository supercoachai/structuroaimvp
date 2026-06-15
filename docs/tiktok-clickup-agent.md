> **Vervangen door:** [`structuro-social-manager-clickup.md`](structuro-social-manager-clickup.md) voor de actuele Social Manager setup. Dit bestand blijft als TikTok Producer legacy reference.

# ClickUp Super Agent: Structuro TikTok Producer

Volledige setup voor list **TikTok Content**, custom fields, en de copy-paste **Instructions** voor de Super Agent **Structuro TikTok Producer**.

**Doel:** Elke video van idee tot script, URL's, captions en learnings in één workflow. Alles matcht de landingspagina `/tiktok` en productwaarheid (3 dagen gratis proef).

**Landings-URL template (altijd hetzelfde patroon):**

```
https://www.structuro.ai/tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=tiktok_promote&utm_content={{video_id}}
```

Vervang `{{video_id}}` door de waarde in het veld `video_id` (bijv. `week3_v2`, `TT-014_hookA`).

---

## 1. Workspace-voorbereiding

| Stap | Actie |
|---|---|
| 1 | Maak Space of Folder **Marketing** (of gebruik bestaande) |
| 2 | Maak List **TikTok Content** |
| 3 | Zet list view: **Board** op status, plus **Table** voor metrics |
| 4 | Maak Super Agent in ClickUp AI Hub: naam **Structuro TikTok Producer** |
| 5 | Koppel agent aan list **TikTok Content** (scope: deze list + subtasks) |

---

## 2. Statussen (workflow)

Gebruik exact deze volgorde op het board:

| Status | Wanneer |
|---|---|
| **Idee** | Hook-thema gekozen, nog geen script |
| **Script** | Volledig script + hook-variant vastgelegd |
| **Canva** | Slides in Canva AI, export klaar of bezig |
| **CapCut** | Video gemonteerd, export bezig |
| **Review** | Laatste check (LP-match, 3 dagen CTA, ondertitels) |
| **Gepost** | Live op TikTok, bio-link gezet |
| **Gemeten** | 48u metrics ingevuld (TikTok + PostHog) |
| **Besluit** | Promote / hook-test / archive |

Optioneel: status **Gearchiveerd** voor afgesloten tests.

---

## 3. Custom fields (list TikTok Content)

Maak deze velden op list-niveau. Types zijn ClickUp-defaults.

| Veldnaam | Type | Verplicht | Gebruik |
|---|---|---|---|
| `video_id` | Short text | Ja | Unieke ID, gelijk aan `utm_content` |
| `utm_content` | Short text | Ja | Kopieer van `video_id` (voor PostHog-filter) |
| `landing_url` | URL | Ja | Volledige URL met UTM's |
| `hook_type` | Dropdown | Ja | herkenning, spanning, tegen_intuitief, cyclus, kosten |
| `hook_variant` | Dropdown | Nee | A, B, C, D, E |
| `payoff_theme` | Short text | Nee | Bijv. week 3 cyclus, taakinitiatie |
| `lp_headline_match` | Checkbox | Ja | Hook = LP binnen 2 sec |
| `script_slides` | Long text | Nee | Volledige slide-teksten |
| `caption_nl` | Long text | Nee | Post-caption |
| `post_date` | Date | Nee | Datum organisch gepost |
| `avg_watch_sec` | Number | Nee | TikTok Creator Analytics |
| `completion_pct` | Number | Nee | Percentage, streef >40 voor Promote |
| `lp_views` | Number | Nee | PostHog `tiktok_landing_viewed` |
| `lp_cta_clicks` | Number | Nee | PostHog `tiktok_landing_cta_clicked` |
| `signups` | Number | Nee | PostHog `signup_completed` (tiktok) |
| `promote_budget_eur` | Currency | Nee | Alleen na >40% completion |
| `learning_notes` | Long text | Nee | Agent + menselijke notities |

**Dropdown `hook_type` opties:** `herkenning`, `spanning`, `tegen_intuitief`, `cyclus`, `kosten`

**Task naming convention:** `TT-XXX | {{video_id}}` (bijv. `TT-014 | week3_v2`)

---

## 4. Super Agent: Structuro TikTok Producer

### 4.1 Triggers (wanneer de agent actief is)

Stel in ClickUp AI in:

| Trigger | Gedrag |
|---|---|
| **@mention** | `@Structuro TikTok Producer` in task comment of description |
| **Status → Script** | Optioneel: auto-suggest script als `script_slides` leeg is |
| **Status → Gemeten** | Vraag agent om learnings + beslisboom |
| **Scheduled** | Wekelijks: "Genereer 5 hook-varianten voor volgende batch" (maandag 09:00) |

### 4.2 Knowledge (upload of plak in Knowledge base)

Koppel deze bronnen aan de agent:

| Document | Pad / bron |
|---|---|
| Master workflow | `docs/tiktok-workflow.md` |
| Canva prompts | `docs/tiktok-canva-prompts.md` |
| CapCut checklist | `docs/tiktok-capcut-checklist.md` |
| PostHog dashboard | `docs/tiktok-posthog-dashboard.md` |
| Storyboard referentie | `tiktok-ad-brief.md` (repo root) |
| LP headline (NL) | "En in week 3 van je cyclus? Dan voelt alles 10x zwaarder." |
| Proefperiode | **3 dagen gratis**, niet 14 dagen in video/CTA |
| Landing URL | Template met `utm_content={{video_id}}` (zie boven) |

### 4.3 Skills (ClickUp AI skills of instructies)

| Skill | Doel |
|---|---|
| **Script schrijven** | 6 slides, max 28-30 sec, emotionele boog |
| **Hook-varianten** | 5x slide 1 (A-E), zelfde payoff |
| **Canva prompt genereren** | Copy-paste uit `tiktok-canva-prompts.md` |
| **Caption NL** | Hook + 3 dagen gratis + hashtags |
| **Metrics interpreteren** | Completion, LP views, signups, beslisboom |
| **ClickUp velden vullen** | `landing_url`, `script_slides`, `caption_nl` |

---

## 5. Instructions block (copy-paste volledig)

Plak onderstaand blok in **Super Agent → Instructions** zonder aan te passen, behalve eventueel je ClickUp list-naam.

```
Je bent de Structuro TikTok Producer voor ClickUp list "TikTok Content".

MERK & DOELGROEP
- Structuro: ADHD-vriendelijke dagstructuur (energie-check, max 3 taken, cyclus-aware).
- Doelgroep NL: vrouwen 20-38, ADHD / executive dysfunction, Nederlands.
- Toon: herkenning eerst, geen shame, geen hustle-cult. Geen placebo-productiviteit.

HARDE REGELS
1. Proefperiode in alle CTA's: "3 dagen gratis". Nooit "14 dagen" in video, caption of script.
2. Landings-URL altijd:
   https://www.structuro.ai/tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=tiktok_promote&utm_content={{video_id}}
   Vul {{video_id}} uit task field video_id.
3. LP-headline match verplicht binnen 2 seconden hook:
   "En in week 3 van je cyclus? Dan voelt alles 10x zwaarder."
   Of een hook die exact dezelfde belofte herhaalt (cyclus week 3, alles zwaarder).
4. Geen em-dash in user-facing tekst. Gebruik punt, komma of dubbele punt.
5. Video: zwart achtergrond, witte tekst, 1080x1920, 28-30 sec, 6 content slides + CTA slide.
6. Promote alleen aanbevelen als completion_pct > 40% (organisch, 48u na post).

EMOTIONELE BOOG (slides)
[schuld/herkenning] → [erkenning/naam] → [verdieping] → [cyclus payoff] → [app demo kort] → [positionering] → [CTA 3 dagen]

OUTPUT BIJ SCRIPT-VERZOEK
Lever altijd:
A) Hook (slide 1) in 2-3 zinnen, word-by-word geschikt
B) Slides 2-6 met label (executief/cognitief/cyclus/demo/positionering)
C) CTA slide: "3 dagen gratis proberen" + link in bio (geen 14 dagen)
D) caption_nl (max 150 woorden) + 4 hashtags: #adhd #adhdtiktok #executievefuncties #productiviteit
E) Canva-ready prompt (verwijs naar hook_type in docs/tiktok-canva-prompts.md)
F) Vul voorstel voor ClickUp fields: script_slides, caption_nl, landing_url, lp_headline_match=true

HOOK-TYPES (veld hook_type)
- herkenning: concrete scene (tijd, staren naar taken, schaamte)
- spanning: open loop ("niemand vertelt je dit over week 3")
- tegen_intuitief: mythe doorbreken (langer lijst = minder starten)
- cyclus: week 3, oestrogeen/dopamine, 10x zwaarder
- kosten: prijs van overweldiging, geen moraliseren

BIJ 5 VARIANTEN (A-E)
Zelfde payoff slides 2-6, alleen slide 1 wisselt. Maak 5 subtasks met hook_variant A t/m E.

BIJ STATUS GEMETEN
Lees avg_watch_sec, completion_pct, lp_views, signups. Pas beslisboom toe:
- completion < 30%: nieuwe hook, geen Promote, 3 subtasks A/B/C
- 30-40%: 1 woord hook tweaken
- > 40% + lage LP views: check bio-link en utm_content
- > 40% + signups 0: LP/registratie flow
- > 40% + signups > 0: Promote €5-10 met zelfde landing_url

POSTHOG (referentie voor metrics in comments)
Funnel per utm_content=video_id:
tiktok_landing_viewed → tiktok_landing_cta_clicked → tiktok_signup_started → signup_completed
Rapporteer aantallen in learning_notes.

Als informatie ontbreekt (video_id, hook_type), vraag één korte vraag en ga daarna door met aannames die je expliciet noemt.
```

---

## 6. Voorbeeld-DM's (@mention in ClickUp)

### Nieuw script

```
@Structuro TikTok Producer
Maak een volledig script voor video_id=week3_v2.
hook_type: cyclus
Thema: week 3, alles voelt 10x zwaarder.
Max 30 seconden. Match LP-headline op /tiktok.
Zet output in script_slides en caption_nl.
```

### Hook-batch

```
@Structuro TikTok Producer
Genereer 5 hook-varianten (A-E) voor payoff "max 3 taken, energie-check eerst".
video_id prefix: week3_batch_
Maak 5 subtasks met Canva prompts uit tiktok-canva-prompts.md.
```

### Na metrics

```
@Structuro TikTok Producer
Task TT-014 | week3_v2 staat op Gemeten.
completion_pct=52, lp_views=89, signups=2, avg_watch_sec=9.1
Wat is het besluit? Update learning_notes.
```

### Canva-hulp

```
@Structuro TikTok Producer
Geef Canva AI prompt voor hook_type=herkenning, hook_tekst:
"9:47. Je staart al 40 minuten naar je taken. Niks gedaan."
```

---

## 7. PostHog events reference (voor agent + mens)

Canonieke eventnamen (`src/lib/analytics-events.ts`):

| Event | Wanneer |
|---|---|
| `acquisition_landing_viewed` | Elke marketing landing view (server + client) |
| `tiktok_landing_viewed` | Extra event als `is_tiktok=true` (pad `/tiktok` of UTM) |
| `acquisition_signup_started` | Gebruiker start registratie vanaf marketing |
| `tiktok_signup_started` | Idem, TikTok-attributie |
| `tiktok_landing_cta_clicked` | Klik op primaire CTA op `/tiktok` |
| `signup_completed` | Account aangemaakt (`signup_source`, UTM's) |
| `onboarding_completed` | Onboarding afgerond (retentie) |
| `dagstart_completed` | Eerste echte productwaarde |

**Properties op acquisition events** (`acquisitionAnalytics.ts`):

- `landing_path`, `source`, `utm_source`, `utm_medium`, `utm_campaign`, **`utm_content`**
- `is_tiktok`, `has_ttclid`, `referrer_domain`, `entry_url`
- `funnel`: `"acquisition"`
- `channel`: `"server"` of client-equivalent

**Filter per video:** `utm_content` = waarde van `video_id` in ClickUp.

**Invullen in ClickUp na 48u:**

- `lp_views`: unieke persons of totaal events `tiktok_landing_viewed` met filter
- `lp_cta_clicks`: `tiktok_landing_cta_clicked`
- `signups`: `signup_completed` waar first-touch/source tiktok en zelfde `utm_content`

Zie `docs/tiktok-posthog-dashboard.md` voor exacte insights.

---

## 8. Checklist eerste run

- [ ] List **TikTok Content** + alle custom fields
- [ ] Super Agent instructions geplakt
- [ ] Knowledge: 4 docs + ad-brief
- [ ] Test task `TT-001 | test_hook` + @mention script
- [ ] `landing_url` opent `/tiktok` met juiste UTM's
- [ ] PostHog live event bij bezoek test-URL
- [ ] CTA in script zegt **3 dagen gratis**

---

## 9. Gerelateerde documenten

| Bestand | Inhoud |
|---|---|
| `tiktok-workflow.md` | End-to-end weekly loop |
| `tiktok-canva-prompts.md` | Canva AI copy-paste |
| `tiktok-capcut-checklist.md` | Montage en export |
| `tiktok-posthog-dashboard.md` | Insights en funnels |
