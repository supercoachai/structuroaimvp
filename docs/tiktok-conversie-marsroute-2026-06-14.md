# TikTok-conversie: marsroute zonder concierge

**Datum:** 14 juni 2026  
**Doel:** Koud TikTok-verkeer omzetten in signups en dagstarts, zonder betaalde ads te verspillen aan een lekke funnel.  
**Buiten scope:** concierge-onboarding (bewust overgeslagen).

---

## 1. Wat we weten (en wat niet)

### Bewijs (prior)

| Bron | Wat het zegt |
|------|----------------|
| 50+ interviews | Executieve frictie, lijst-overload, energie-golven en schaamte zijn kern; direct registreren zonder waarde voelt als drempel. |
| Productdata (~48 users) | Activatie-lek: veel signups, weinig eerste dagstart (~72,5% valt af vóór dagstart). |
| structuro.eu | Organische landing ~11% signup; beter dan koud direct naar `/registreren`, maar nog steeds geen garantie op activatie. |

### Ruis (geen bewijs)

| Bron | Waarom voorzichtig |
|------|---------------------|
| TikTok €2,50, n=54, 0 signups | Te klein om conclusies te trekken. Past elke verklaring (geo, taal, copy, frictie). |
| 85% België | Plausibel (NL/EN vs FR), niet bewezen. |

**Discipline:** Eén micro-run verschuift je overtuiging niet. Interviews + activatie-data wel.

---

## 2. Twee lekken, twee fixes

Smelt deze niet samen. Andere symptomen, andere oplossingen.

| Lek | Vraag | Hefbomen |
|-----|-------|----------|
| **Acquisitie** | Komt koud verkeer tot signup? | `/tiktok` i.p.v. `/registreren`, NL-only ads, emotionele hook, demo vóór formulier, lagere signup-frictie |
| **Activatie** | Doet een signup een dagstart? | Onboarding inkorten, sneller naar energie + 1 taak, geen uitleg-slides zonder actie |

**Volgorie:** Eerst acquisitie-architectuur shippen (bridge + tracking). Parallel activatie amputeren. **Paid ads uit** tot activatie structureel verbetert (richting >40% dagstart binnen 24u na signup).

---

## 3. Ideale funnel (doelbeeld)

```
TikTok (NL, 1 hook per video)
  → Bridge: /tiktok?campaign=…&hero=…  (niet /registreren)
  → Optioneel: structuro.eu zelftest (herkenning) → doorlink naar /tiktok
  → Signup: naam + e-mail (wachtwoord later / magic link / social)
  → Onboarding = core loop (5 stappen, eindigt in echte dagstart)
  → Eerste dopamine-hit: afgevinkte micro-stap of voltooide energie-keuze
```

**Principe:** Optimaliseer niet op aantal kliks, maar op **gevoelde waarde in de eerste 20–30 seconden** en **minimale executieve belasting per stap**.

---

## 4. Fase A: Traffic en targeting (nu)

### 4.1 Geo

- **Alleen Nederland** in TikTok Ads Manager tot je ≥100 relevante landing views per variant hebt.
- België en Frankrijk **uit**. App is NL/EN; Franstalig verkeer is ruis op klein budget.

### 4.2 Destinatie-URL (Promote + bio)

**Nooit meer:** `https://www.structuro.ai/registreren`  
**Altijd:** bridge op `/tiktok` met campagne + hero + content_id.

Template (bio / Promote):

```
https://www.structuro.ai/tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=tiktok_promote&utm_content={content_id}&campaign={campagne}&hero={A|B|C|D|E}
```

Voorbeelden (uit `src/lib/tiktok/lpConfig.ts`):

| Video-hook | `campaign` | Aanbevolen `hero` | Waarom |
|------------|------------|-------------------|--------|
| 9:47, 40 min staren | `staren` | `A` (rust) of `B` (demo) | Concrete pijn; B als video app laat zien |
| Niet lui / reframe | `nietlui` | `A` | Shame-free headline |
| Week 3 / cyclus | `cyclus` | `B` | Energie-demo past bij cyclus-angle |
| Anti to-do lijst | `geenlijsten` | `E` | Ochtendritueel-layout |
| Weten ≠ beginnen | `weten` | `C` | Donkere, confrontatie-layout |

Programmatisch (dev):

```ts
import { buildTikTokLandingUrl } from "@/lib/tiktok/lpConfig";

buildTikTokLandingUrl({
  contentId: "post_2026_06_14_staren",
  campaign: "staren",
  hero: "B",
  medium: "paid_social",
});
```

### 4.3 Ads aan/uit

| Status | Regel |
|--------|-------|
| **Nu** | Paid TikTok **uit**. Max €0/dag tot funnel + activatie meetbaar beter. |
| **Later** | Herstart met **één** hook × **één** campaign × **één** hero, budget €5–10/dag, min. 7 dagen of 100+ LP views. |

---

## 5. Fase B: Bridge pages

### 5.1 `/tiktok` (structuro.ai, live na deploy)

**Staat al in repo** (`src/app/tiktok/`, `src/lib/tiktok/lpConfig.ts`):

- 5 campagnes (copy) × 5 hero-layouts (A–E)
- Hero **B**: client-side energie-picker demo (Laag/Midden/Hoog → 1–3 taken)
- CTA → `/registreren` met TikTok-attributie (`buildTikTokRegistrerenHref`)
- Events: `tiktok_landing_viewed`, `tiktok_landing_cta_clicked`, acquisition API fallback

**Hero-keuze (regel):**

- Video **zonder** app-beeld → hero **A** of **C**
- Video **met** dagstart/energie → hero **B**
- Retargeting / warm verkeer → **D** of **E**

### 5.2 structuro.eu zelftest (herkennings-kaarten)

**Staat al:** 6 kaarten in `structuro-eu-landing/js/landing-zelftest.js` + sectie in `index.html`.

**Gap:** Sticky toont score ("X van 6 herkenbaar") maar **geen CTA-knop** naar signup of `/tiktok`.

**Te bouwen (prioriteit hoog):**

1. Na ≥1 herkenning: blauwe sticky-CTA, bijv. *"3 dagen gratis proberen"*
2. Link naar `/tiktok?campaign=weten&hero=A&utm_source=structuro_eu&utm_medium=organic&utm_content=zelftest`
3. PostHog-event: `zelftest_recognition_toggled`, `zelftest_cta_clicked` (met count + tags)

**Copy-tweak voor koud scroll-verkeer (optioneel, A/B later):**

| Nu | Voorstel koud verkeer |
|----|------------------------|
| `STRUCTURO · EXECUTIEF` in panel | Weg of kleiner; focus op uitkomst |
| 6 kaarten direct zichtbaar | Mobile: max 2 zichtbaar + "Meer herkenning" |
| "6 van 6 = letterlijk voor jouw brein" | Zachter: "Meerdere punten? Dat is normaal bij ADHD." |

**Headline boven zelftest (toevoegen):**

> Gebruik MS To Do om alles bij te houden. Gebruik Structuro om het ook daadwerkelijk te doen.

Of emotioneel:

> Je weet wat je moet doen. Je begint alleen niet.

Mechanisme blijft **in het uitklap-panel**, niet in regel 1.

### 5.3 structuro.eu → app CTAs (breder)

Veel knoppen op structuro.eu gaan nog direct naar `/registreren`. Voor **TikTok- en paid-context** doorlinken naar `/tiktok`; organische hero-CTA mag op `/registreren` blijven tot je data hebt.

**Minimaal aanpassen:**

- Footer/pricing voor traffic met `?utm_source=tiktok` → rewrite naar `/tiktok` (client-side in `analytics.js` of query-param op ad-only landings)

---

## 6. Fase C: Copy-regels

### 6.1 Hook vs mechanisme

| Laag | Doel | Voorbeeld |
|------|------|-----------|
| **Hook (emotie)** | "Dit is mij" in 3 seconden | "Je weet wat je moet doen. Je begint alleen niet." |
| **Mechanisme (bewijs)** | Vertrouwen na klik | "Eerste stap zo klein dat je niet hoeft te plannen." |
| **CTA** | Lage drempel | "Start 3 dagen gratis" / "Geef me een schone lei" |

**Niet op koud verkeer:** Zeigarnik, DMN, "externe frontale kwab" in headline. **Wel:** achter klik, coach-pagina, Patricia-laag.

### 6.2 Registratiepagina (TikTok-traffic)

Huidige copy ("Start je gratis proefperiode" / "Maak eerst je account aan") is generiek.

**Boven formulier (TikTok-attributie, `source=tiktok`):**

```
Headline: Je herkende het net. Nu de eerste schone lei.
Sub: 3 dagen gratis. Geen streaks, geen badges, geen schuldgevoel.
Trust: Naam + e-mail. Wachtwoord kun je later instellen.
```

**CTA-knop:** "Ontlast mijn brein (3 dagen gratis)" i.p.v. alleen "Start gratis proefperiode".

Implementatie: conditional copy in `RegistrerenAccountClient.tsx` op `source=tiktok` of UTM.

### 6.3 Per herkennings-kaart (CTA-varianten)

| Kaart | CTA-voorstel |
|-------|----------------|
| Taakinitiatie | Activeer mijn startknop (3 dagen gratis) |
| Werkgeheugen | Toon me max 3 taken (3 dagen gratis) |
| Energie | Laat me op energie plannen (3 dagen gratis) |
| Tijdblindheid | Geef me een schone lei |
| Cyclus | Plan mee met mijn cyclus (3 dagen gratis) |
| Keuzestress | Minder keuzes vandaag (3 dagen gratis) |

---

## 7. Fase D: Signup-frictie verlagen

**Huidige staat:** Naam + e-mail + wachtwoord (min. 8 tekens) verplicht (`RegistrerenAccountClient.tsx`).

**Doel:** Wachtwoord is geen "stap", het is executieve uitputting op koud verkeer.

### 7.1 Magic link (prioriteit 1)

**Flow:**

1. Formulier: alleen voornaam + e-mail
2. `signInWithOtp` / magic link via Supabase
3. E-mail: "Bevestig en start je proefperiode"
4. Redirect → onboarding (wachtwoord optioneel in settings later)

**Supabase:** Email template + redirect URL `https://www.structuro.ai/auth/callback`.

### 7.2 Social login (prioriteit 2)

- Google (+ Apple op iOS later)
- Eén tik, direct onboarding
- Behoud TikTok-attributie in user metadata / PostHog op signup

### 7.3 Wachtwoord uitstellen (prioriteit 3, als magic link later)

- Genereer random wachtwoord server-side, stuur reset-link na onboarding
- Alleen fallback; magic link is schoner

**Volgorde:** Magic link **vóór** nieuwe landing-features bouwen. Grootste hefboom per engineering-uur.

---

## 8. Fase E: Onboarding inkorten

**Huidige staat:** `STEP_COUNT = 10` in `OnboardingFlowContent.tsx`.

### 8.1 Doel: 5 stappen = core loop

| # | Stap | Actie | Behouden / schrappen |
|---|------|-------|----------------------|
| 1 | **Naam** | Voornaam | Behouden (identiteit) |
| 2 | **Energie** | Laag / Normaal / Hoog | Behouden (productkern) |
| 3 | **Eerste taak** | 1 taak invoeren | Behouden (commitment) |
| 4 | **Micro-demo** | 1 taak → microstappen (kort) | Inkorten; geen lange animatie |
| 5 | **Start** | Echte dagstart / welkom | Eindigt in app, geen extra uitleg |

### 8.2 Kandidaten om te amputeren (voor later PR)

| Huidige slide (index) | Advies |
|------------------------|--------|
| Welkom animatie (1) | Verkorten of mergen met naam |
| Structuro kiest / zelf (3) | Default "Structuro kiest", skip slide |
| Focus modus (4) | Default aan, uitleg in tooltips |
| Cyclus opt-in (6) | Na eerste dagstart, niet in onboarding |
| Dagafsluiting uitleg (8) | Na eerste week |
| Klaar-slide (9) | Direct naar app |

### 8.3 Animatie-tempo

- `SLIDE_MS = 1200` → richting 600–800 ms voor ADHD-publiek
- Geen slide die alleen uitlegt; elke slide vraagt **één** handeling

### 8.4 Acceptatiecriterium

Na reductie: **>40%** van nieuwe signups doet binnen 24u een dagstart (meten via PostHog, zelfde cohort-definitie als nu).

---

## 9. Fase F: Meten

### 9.1 PostHog-funnel (acquisitie)

```
tiktok_landing_viewed
  → tiktok_landing_cta_clicked
  → acquisition_signup_started / tiktok_signup_started
  → signup_completed (bestaand event)
  → first_dagstart (bestaand event)
```

Breakdowns: `lp_campaign`, `lp_hero`, `utm_content`, `$geoip_country_code`.

### 9.2 Server-side fallback

Koude bezoekers zonder consent: `POST /api/analytics/acquisition-landing` en `acquisition-signup-started` vullen gaten in PostHog-client tracking.

### 9.3 Wanneer is een test "af"?

| Meting | Minimum |
|--------|---------|
| Landing A/B | 100 views per variant |
| Signup rate | 30+ clicks naar registratie per variant |
| Activatie | 20+ signups in cohort |

Onder die drempels: **geen** strategische conclusies, alleen kwalitatieve indrukken.

### 9.4 Dashboard

Zie `docs/tiktok-posthog-dashboard.md`:

- Dagelijks: LP views, CTA clicks, signup starts, signups, dagstarts
- Ratio's: LP→signup en signup→dagstart **apart** rapporteren

---

## 10. Implementatie-checklist

### Al gedaan (deploy na push)

- [x] `/tiktok` route + campagne × hero (`lpConfig.ts`)
- [x] Hero B energie-demo
- [x] TikTok → registreren attributie-URL
- [x] Acquisition analytics + consent voor marketing paths
- [x] Auth recovery hash-fix (`/auth/wachtwoord-instellen`)
- [x] Docs: workflow, ClickUp, social standaard §13

### Nog te doen (prioriteit)

| P | Taak | Bestand / gebied |
|---|------|------------------|
| **P0** | Supabase redirect URL: `/auth/wachtwoord-instellen` | Dashboard |
| **P0** | TikTok bio + ads → `/tiktok`, geo NL-only | Ads Manager |
| **P1** | Zelftest sticky CTA → `/tiktok` + events | `landing-zelftest.js`, `analytics.js` |
| **P1** | TikTok-conditional copy op `/registreren` | `RegistrerenAccountClient.tsx` |
| **P1** | Magic link signup | Supabase + registreren flow |
| **P2** | Google social login | Supabase provider + UI |
| **P2** | Onboarding 10 → 5 stappen | `OnboardingFlowContent.tsx` |
| **P2** | structuro.eu paid CTAs → `/tiktok` | `index.html`, `vercel.json` |
| **P3** | Per-kaart CTA-teksten op zelftest | `landing-zelftest.js` |
| **P3** | Herstart paid ads (1 variant) | Ads Manager |

---

## 11. Herstart paid ads (checklist)

Alleen als:

- [ ] Bridge live en bio wijst naar `/tiktok`
- [ ] Signup-frictie verlaagd (magic link of social)
- [ ] Onboarding ≤5 stappen of duidelijke verbetering signup→dagstart
- [ ] PostHog-funnel compleet zichtbaar
- [ ] Geo: **alleen NL**
- [ ] Eén video, één `campaign`, één `hero`, €5–10/dag, min. 7 dagen

**Stop-regel:** Na 100 LP views en <2% LP→signup start: copy/hero tweaken, niet budget verhogen.

---

## 12. Samenvatting in één zin

**Interviews zijn je bewijs; TikTok n=54 was ruis.** Ship bridge (`/tiktok` + zelftest-CTA), verlaag signup-frictie, kort onboarding tot de core loop, meet acquisitie en activatie apart, en betaal pas weer voor verkeer als de emmer minder lekt.

---

## Verwijzingen in repo

| Onderwerp | Pad |
|-----------|-----|
| LP-config (campagnes, heroes, URL-builder) | `src/lib/tiktok/lpConfig.ts` |
| TikTok landing components | `src/components/tiktok/` |
| Registreren-URL met attributie | `src/lib/tiktokLanding.ts` |
| Zelftest (6 kaarten) | `structuro-eu-landing/js/landing-zelftest.js` |
| Analytics events | `src/lib/analytics-events.ts` |
| Onboarding stappen | `src/components/onboarding/OnboardingFlowContent.tsx` |
| Social standaard §13 hero×campagne | `docs/STRUCTURO-STANDAARD-SOCIAL-2026-06-14.md` |
| TikTok workflow | `docs/tiktok-workflow.md` |
| Ad brief | `tiktok-ad-brief.md` |
