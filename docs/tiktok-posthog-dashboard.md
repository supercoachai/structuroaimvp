# PostHog dashboard: TikTok acquisitie

Welke insights, funnels en filters je in PostHog aanmaakt voor **structuro.ai/tiktok**, per video via **`utm_content`**, en wat de cijfers betekenen.

**Project:** Structuro App (structuro.ai)  
**Timezone project:** UTC (reken in comments om naar NL indien nodig)  
**Attributie:** `utm_content` = ClickUp `video_id`

---

## 1. Kern-events (canoniek)

Gedefinieerd in `src/lib/analytics-events.ts`:

| Event | Rol in funnel |
|---|---|
| `tiktok_landing_viewed` | Iemand laadde `/tiktok` met TikTok-attributie |
| `tiktok_landing_cta_clicked` | Klik op primaire CTA op de TikTok-landingspagina |
| `tiktok_signup_started` | Start registratie (TikTok-pad) |
| `signup_completed` | Account succesvol aangemaakt |
| `onboarding_completed` | Onboarding afgerond (kwaliteit signup) |
| `dagstart_completed` | Eerste dagstart afgerond (activatie) |

**Parallel (breder):** `acquisition_landing_viewed` en `acquisition_signup_started` vuren ook; voor TikTok-dashboard filter je op `is_tiktok = true` of op TikTok-events hierboven.

---

## 2. Event properties (filter en breakdown)

Van `acquisitionAnalytics.ts` / client capture:

| Property | Gebruik |
|---|---|
| `utm_content` | **Per video** (hoofdfilter) |
| `utm_campaign` | Bijv. `tiktok_promote` vs organisch |
| `utm_source` | Verwacht `tiktok` |
| `utm_medium` | Bijv. `paid_social` |
| `landing_path` | `/tiktok` |
| `source` | Opgeloste bron, vaak `tiktok` |
| `is_tiktok` | `true` voor TikTok-segment |
| `has_ttclid` | TikTok click ID aanwezig |
| `referrer_domain` | Bijv. tiktok.com |
| `entry_url` | Volledige eerste URL |
| `funnel` | `acquisition` |
| `channel` | `server` of client |

**`tiktok_landing_cta_clicked`** (component) stuurt minimaal `landing_path`, `source`; combineer in funnels met session/person en overige UTM's uit first touch waar beschikbaar.

**`signup_completed`:** `signup_source`, optioneel `utm_campaign`, `channel`.

---

## 3. Dashboard aanmaken

1. PostHog → **Dashboards** → **New dashboard**
2. Naam: **TikTok Acquisition**
3. Voeg onderstaande insights toe (elk apart aanmaken, dan pin op dashboard).

---

## 4. Insights om aan te maken

### 4.1 TikTok landingsviews per dag

- **Type:** Trends
- **Event:** `tiktok_landing_viewed`
- **Math:** Total count (of Unique users)
- **Date range:** Last 30 days
- **Breakdown:** `utm_content` (top 10)
- **Filter:** `landing_path` = `/tiktok`

**Betekenis:** Hoeveel verkeer elke video via bio-link of ads naar de LP stuurt. Lage views + hoge TikTok completion = bio-link of CTA in video fixen, niet de hook.

---

### 4.2 LP views per video (snapshot)

- **Type:** Trends (of SQL later)
- **Event:** `tiktok_landing_viewed`
- **Math:** Unique users
- **Filter:** `utm_content` = `{{video_id}}` (vervang per analyse)
- **Interval:** dag

**ClickUp veld:** `lp_views` (kies unique users over 48u na post).

---

### 4.3 CTA click rate (per video)

Maak twee trends of één formula insight:

**A. CTA clicks**

- Event: `tiktok_landing_cta_clicked`
- Filter: `utm_content` = video_id

**B. Rate**

- Formula: `B / A` als je A = unique `tiktok_landing_viewed` en B = unique `tiktok_landing_cta_clicked` (zelfde filter en periode)

**Betekenis:**

| CTA rate | Interpretatie |
|---|---|
| < 5% | LP-headline mismatch of zwakke intent na video |
| 5-15% | Normaal voor warm TikTok-verkeer |
| > 15% | Sterke hook + LP-match; check of mobile layout CTA goed zichtbaar is |

**ClickUp:** `lp_cta_clicks`

---

### 4.4 Funnel: TikTok video → signup

- **Type:** Funnel
- **Window:** 7 days (TikTok-conversie is vaak same-session)
- **Order:** Ordered
- **Steps:**

| Step | Event | Extra filter |
|---|---|---|
| 1 | `tiktok_landing_viewed` | `utm_content` = `{{video_id}}` |
| 2 | `tiktok_landing_cta_clicked` | zelfde `utm_content` |
| 3 | `tiktok_signup_started` | zelfde `utm_content` |
| 4 | `signup_completed` | `signup_source` contains `tiktok` of person had step 1 |

**Betekenis per stap:**

| Overgang | Gezond | Actie bij leak |
|---|---|---|
| 1 → 2 | > 8% | LP UX, CTA tekst, laadsnelheid |
| 2 → 3 | > 40% | Registratiepagina frictie |
| 3 → 4 | > 60% | Form errors, e-mail confirm, in-app browser |

**Hoofd-KPI:** stap 1 → 4 conversion (unieke persons). Streef **> 2%** als experiment; **> 5%** is sterk voor cold TikTok.

---

### 4.5 Signups per video (totaal)

- **Type:** Trends
- **Event:** `signup_completed`
- **Filter:** eerste touch of event property `utm_content` = video_id (als meegegeven op signup)
- **Breakdown:** `utm_content` of `signup_source`

**ClickUp:** `signups`

**Let op:** Person-on-events mode: UTM op signup-event kan afwijken van huidige person property. Filter op **signup event properties** waar beschikbaar.

---

### 4.6 Activatie na TikTok signup

- **Type:** Funnel
- **Steps:**
  1. `signup_completed` (filter tiktok / utm_content)
  2. `onboarding_completed`
  3. `dagstart_completed`

**Window:** 14 days

**Betekenis:** Meet of TikTok-leads echt de app gebruiken. Lage 2→3: onboarding te lang voor ADHD-doelgroep.

---

### 4.7 Paid vs organisch (campaign breakdown)

- **Type:** Trends
- **Event:** `tiktok_landing_viewed`
- **Breakdown:** `utm_campaign`
- **Filters:** `utm_source` = `tiktok`

Vergelijk `tiktok_promote` (paid) met campagnes zonder paid of met andere campaign-namen.

**Betekenis:** Promote alleen als organisch **completion > 40%** (TikTok Analytics, niet PostHog). PostHog valideert of paid traffic niet alleen views maar signups oplevert.

---

### 4.8 Live check (laatste 48u)

- **Type:** Trends
- **Events:** `tiktok_landing_viewed`, `tiktok_signup_started`
- **Date range:** Last 2 days
- **Filter:** `utm_content` = nieuwste `video_id`

Gebruik na elke post om te zien of tracking werkt vóór je ClickUp op **Gemeten** zet.

---

## 5. Standaard filters (saved)

Maak in PostHog **Cohort** of herbruikbare filter sets:

| Naam | Filter |
|---|---|
| TikTok LP | `event` = `tiktok_landing_viewed` AND `landing_path` = `/tiktok` |
| TikTok traffic | `is_tiktok` = true OR `utm_source` = `tiktok` |
| Per video | `utm_content` = `{video_id}` |
| Promote campagne | `utm_campaign` = `tiktok_promote` |

---

## 6. URL-contract (tracking test)

Test-URL (vervang video id):

```
https://www.structuro.ai/tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=tiktok_promote&utm_content=TEST_hook_a
```

**Verwacht binnen 1 minuut:**

1. `acquisition_landing_viewed`
2. `tiktok_landing_viewed` met `utm_content` = `TEST_hook_a`

Klik CTA → `tiktok_landing_cta_clicked`.

Start registratie → `tiktok_signup_started`.

---

## 7. Koppeling ClickUp (48u ritueel)

| PostHog metric | ClickUp veld | Periode |
|---|---|---|
| Unique `tiktok_landing_viewed` | `lp_views` | 48u na post |
| Count `tiktok_landing_cta_clicked` | `lp_cta_clicks` | 48u |
| Unique `signup_completed` (tiktok + utm) | `signups` | 7d |

Comment op task:

```
@Structuro TikTok Producer metrics 48u:
completion_pct=[TikTok], lp_views=[X], cta=[Y], signups=[Z]
```

---

## 8. Beslisboom (cijfers + TikTok)

Combineer met Creator Analytics (`docs/tiktok-workflow.md`):

| TikTok completion | LP views (48u) | Signups (7d) | Actie |
|---|---|---|---|
| < 30% | * | * | Nieuwe hook, geen Promote |
| 30-40% | * | * | Hook tweaken |
| > 40% | laag | * | Bio-link, utm_content, CTA in video |
| > 40% | ok | 0 | LP/registratie debug (funnel 2-4) |
| > 40% | ok | > 0 | Promote €5-10, zelfde URL template |

---

## 9. Optionele vervolg-insights

| Insight | Waarom |
|---|---|
| Retention D1/D7 na `signup_completed` (tiktok) | TikTok-volume vs kwaliteit |
| Session replay filter entry `/tiktok` | Zie waar LP afhaakt |
| Error tracking op `/registreren` na tiktok | In-app browser issues |
| `checkout_started` / `subscription_started` | Monetisatie na 3-dagen trial |

---

## 10. Referenties in codebase

| Bestand | Inhoud |
|---|---|
| `src/lib/analytics-events.ts` | Eventnamen |
| `src/lib/posthog/acquisitionAnalytics.ts` | Server properties |
| `src/lib/posthog/acquisitionAnalyticsClient.ts` | Client + API backup |
| `src/lib/posthog/acquisitionAttribution.ts` | `is_tiktok`, UTM resolve |
| `src/components/tiktok/TikTokLandingClient.tsx` | CTA click event |

Dashboard link (na aanmaken): pin in ClickUp task template **Gemeten**.

---

## 11. Wat je nú niet hoeft te meten

- Ruwe `$pageview` zonder acquisition filter (te breed)
- Alleen `acquisition_landing_viewed` zonder TikTok-filter (vervuilt met andere campagnes)
- 14-dagen trial als KPI (product is **3 dagen** gratis start)
