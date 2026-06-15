# Structuro TikTok workflow (master)

Stap-voor-stap systeem voor content, Canva AI, CapCut, ClickUp Super Agent, landing en meting.

**Laatste update:** 14 juni 2026  
**Landingspagina:** https://www.structuro.ai/tiktok  
**Proefperiode in product:** 3 dagen (geen 14 dagen tenzij je dat apart activeert)

---

## De lus (elke week)

```
ClickUp idee → Script (Super Agent) → Canva slides → CapCut video
  → Organisch posten → 48u meten → Beslissen → Volgende hook-test
```

**Harde regel:** Promote pas als **organische completion >40%**. Onder 30% = alleen hook vervangen, geen budget.

---

## Fase 0: Eenmalige setup

| Wat | Waar | Check |
|---|---|---|
| ClickUp list + velden | Zie `clickup-setup-checklist.md` (master) + `structuro-social-manager-clickup.md` | List "Social Content" klaar |
| Super Agent | ClickUp AI Hub | Instructions + Knowledge geladen |
| Landingspagina live | structuro.ai/tiktok | PostHog `tiktok_landing_viewed` test |
| Bio-link | TikTok profiel | URL met utm_content per video |
| Supabase redirect | Auth settings | `/auth/wachtwoord-instellen` in allow list |

---

## Fase 1: Nieuwe video starten (5 min)

1. **ClickUp:** New task `TT-XXX | {video_id}` (bijv. `TT-014 | week3_v2`)
2. Vul `video_id` en `utm_content` (zelfde waarde)
3. **Landing URL template:**

```
https://www.structuro.ai/tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=tiktok_promote&utm_content={{video_id}}
```

4. **@Structuro TikTok Producer** in comment:

```
Maak een volledig script voor video_id={{video_id}}.
Thema: [bijv. week 3 cyclus / taakinitiatie / overweldigd].
Gebruik hook-type: [herkenning / spanning / tegen-intuïtief].
Max 20 seconden. Match LP-headline op /tiktok.
```

5. Kies hook-variant A/B/C uit agent-output → status **Script**

---

## Fase 2: Canva AI (10 min)

1. Formaat: TikTok 1080×1920, zwart `#000000`
2. Open `tiktok-canva-prompts.md` → kies hook-type → copy-paste prompt
3. Vervang `{{hook_tekst}}` en `{{video_id}}`
4. Export 6 PNG's → map `TT-XXX_canva/`
5. Checklist:
   - [ ] Slide 1 leesbaar op 25% zoom?
   - [ ] Hook = exact zelfde belofte als LP `/tiktok`
   - [ ] CTA zegt "3 dagen gratis" (productwaarheid)
   - [ ] Geen em-dash, geen lange alinea's

Status ClickUp: **Canva**

---

## Fase 3: CapCut (15-20 min)

1. Project 9:16, 1080×1920
2. Import Canva PNG's
3. **Slide 1:** Word-by-word animatie (niet fade)
4. **Slide 2-3:** Fade per zin, 0,3s delay
5. **Slide 4 (payoff):** Langzaam fade, geen haast
6. **Slide 5:** Optioneel 3-5s app-screenrecording (energie-check)
7. **Slide 6:** CTA + "3 dagen gratis · link in bio"
8. **Audio:** sec 0-4 stil of clock tick 30%, daarna lo-fi 20%
9. Export 1080p 30fps

Status ClickUp: **CapCut** → **Review**

---

## Fase 4: Posten (organisch eerst)

**Caption template:**

```
{{hook_1_zin}}
Structuro helpt je elke dag één haalbare stap kiezen.
3 dagen gratis → link in bio
#adhd #adhdtiktok #executievefuncties #productiviteit
```

**Bio-link:** zelfde URL als in ClickUp (`utm_content={{video_id}}`)

**Promote:** UIT tot metrics binnen zijn.

Status ClickUp: **Gepost** + postdatum in description

---

## Fase 5: Meten (48 uur na post)

### TikTok (Creator Analytics)

| Metric | ClickUp veld | Drempel |
|---|---|---|
| Gem. kijktijd | `avg_watch_sec` | Streef >8 sec |
| Completion % | `completion_pct` | >40% = Promote-kandidaat |
| CTR knop/bio | in notes | >0,5% is ok |

### PostHog

Funnel (filter `utm_content = {{video_id}}`):

1. `tiktok_landing_viewed`
2. `tiktok_landing_cta_clicked`
3. `tiktok_signup_started`
4. `signup_completed` (source=tiktok)

| Metric | ClickUp veld |
|---|---|
| LP views | `lp_views` |
| Signups | `signups` |

Status ClickUp: **Gemeten** → @Agent voor learnings

---

## Fase 6: Beslisboom

| Completion | LP views | Signups | Actie |
|---|---|---|---|
| <30% | * | * | Nieuwe hook, zelfde payoff. 3 subtasks A/B/C. Geen Promote. |
| 30-40% | * | * | 1 woord in hook tweaken, opnieuw posten. |
| >40% | laag | * | Video ok, fix bio-link of CTA in video. |
| >40% | ok | 0 | LP/ registratie flow checken. |
| >40% | ok | >0 | Promote €5-10 op `/tiktok?...&utm_content=winnaar` |

---

## Wekelijkse hook-batch (1 uur)

5 video's, **zelfde payoff**, alleen slide 1 verschilt.

Super Agent prompt:

```
Genereer 5 hook-varianten (A-E) voor payoff:
"Structuro = één haalbare stap per dag, max 3 taken."
Maak 5 ClickUp subtasks met Canva-ready prompts uit tiktok-canva-prompts.md.
Max 20 sec per video.
```

---

## LP ↔ video match (verplicht)

Landingspagina headline (NL):

> En in week 3 van je cyclus? Dan voelt alles 10x zwaarder.

Video hook moet **dezelfde belofte** herhalen binnen 2 seconden. Geen nieuw verhaal op de LP.

---

## Promote URL (alleen na >40% completion)

```
https://www.structuro.ai/tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=tiktok_promote&utm_content={{video_id}}
```

TikTok Promote instellingen:

| Setting | Waarde |
|---|---|
| Doel | Meer websitebezoeken |
| URL | `/tiktok?...` (niet direct `/registreren`) |
| CTA | Aanmelden |
| Land | NL |
| Leeftijd | 20-38 |
| Geslacht | Vrouw |
| Interesses | ADHD, Mental Health, Productivity |

---

## Documenten in deze map

| Bestand | Inhoud |
|---|---|
| `tiktok-workflow.md` | Dit overzicht |
| `structuro-social-manager-clickup.md` | Super Agent instructions + list setup |
| `tiktok-canva-prompts.md` | Copy-paste Canva AI prompts per hook-type |
| `tiktok-capcut-checklist.md` | CapCut export checklist |
| `tiktok-posthog-dashboard.md` | PostHog insights om aan te maken |

**Bronnen buiten docs:** `tiktok-ad-brief.md` (storyboard), retentie-rapport (diagnose metrics).

---

## Founding members (2026-specifiek)

TikTok test eerst je volgers. Laat founding members (48+) de eerste 3 seconden **uitkijken + saven** vóór Promote. Geen "like aub", wel: "Dit is de hook-test, blijf even hangen tot slide 4."

---

**Standaard + status (14 jun 2026):** `STRUCTURO-STANDAARD-SOCIAL-2026-06-14.md`

---

**Hero × campagne matrix:** `STRUCTURO-STANDAARD-SOCIAL-2026-06-14.md` §13 · config `src/lib/tiktok/lpConfig.ts`
