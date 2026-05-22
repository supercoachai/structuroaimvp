# Cyclus en “hormonale fase” in Structuro

De app voegt **optionele menstruatiecyclus-context** toe voor gebruikers die dat willen. Dit is **geen medische diagnose**; het is een **vereenvoudigd kalendermodel** om patronen te kunnen vergelijken met de dagstart (energie) en om zachte suggesties te tonen.

## Wanneer is het actief?

Alleen na **expliciete opt-in** in onboarding (`OnboardingFlow`, stuk “cyclus”) of later via **Instellingen** (`CycleSettingsSection` op `app/settings`). Zonder `cycle_tracking_consent_at` op `profiles` geldt dit niet.

## Welke data wordt opgeslagen?


| Locatie          | Velden                                                                                                          | Doel                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `profiles`       | `cycle_tracking_consent_at`, `cycle_last_period_start` (YYYY-MM-DD), `cycle_average_length` (21–35, default 28) | Consent en basis om de fase te berekenen                                                   |
| `daily_checkins` | `cycle_phase`                                                                                                   | De berekende fase op het moment van die dagstart (meegeslagen bij opslaan van de check-in) |


**Niet** opgeslagen: pijn, bloeding, symptomen, of data bij derden. Copy legt dit uit in `cycleLocale` (NL/EN onder `t("cycle.*")`).

## Hoe wordt de fase berekend?

Implementatie: `src/lib/cycle/calculatePhase.ts`, functie `calculateCyclePhase(lastPeriodStart, averageLength, today)`.

- **Menstruatie (menstrual):** ca. dag 1–5 van de cyclus.
- **Folliculair (follicular):** na menstruatie tot vlak voor ovulatie.
- **Ovulatie (ovulation):** rond dag `gemiddelde_cycluslengte − 14`, met een venster van ±1 dag.
- **Luteaal (luteal):** na ovulatie tot het einde van de cyclus.

De cyclusdag wordt herhaald modulo de gemiddelde lengte (rollover na een volledige cyclus).

**Stale / onbekend:** als de laatste menstruatiestart te oud is (meer dan `CYCLE_STALE_AFTER_CYCLES` volledige cycli zonder update; zie `src/lib/cycle/types.ts`), of bij ongeldige input, is de fase `"unknown"`. Dan geen betrouwbare fase voor analytics/UI.

**Client-side:** de hook `useCycleProfile` laadt profiel en berekent “vandaag” opnieuw met `calculateCyclePhase`.

## Waar merkt de gebruiker het?

1. **Onboarding:** optionele flow met uitleg (`CycleAboutModal`), daarna `CycleSetupForm` (laatste menstruatie, max. 60 dagen terug; gemiddelde cycluslengte).
2. **Dagstart (`DayStartCheckIn`):** bij het afronden van de check-in wordt **stil** `cycle_phase` meegestuurd naar `saveCheckIn` (samen met energie en top-3 taken). De fase **forceert geen** energiekeuze; het is context voor opslag en eventueel latere patronen.
3. **Suggestiekaart:** als `cycleSuggestionsEnabled()` true is (standaard; kill-switch: env `NEXT_PUBLIC_STRUCTURO_CYCLE_SUGGESTIONS` = `0`, `false`, `off`, `no`) **én** de gebruiker heeft consent, toont de stap met taakkeuze `CyclePhaseHint` met korte, niet-bindende tekst per fase (`hintMenstrual`, `hintFollicular`, `hintOvulation`, `hintLuteal` in `cycleLocale`). De hint is **per dag sluitbaar** (localStorage, Amsterdam-kalenderdag).
4. **Instellingen:** cyclus aan/uit, datum en lengte aanpassen, of alle cyclusdata wissen.

## Belangrijk voor agents

- De “hormonale fase” in code heet overal `**CyclePhase`**: `follicular` | `ovulation` | `luteal` | `menstrual` | `unknown`.
- Vertaling naar producttaal: **cyclusfase**, niet “hormonen meten”; geen claims over hormoonspiegels in de app.
- Wijzig aan **berekening** in `calculatePhase.ts` + types/copy; **opslag** via `cycleProfileDb.ts` en check-in payload in `DayStartCheckIn`.

