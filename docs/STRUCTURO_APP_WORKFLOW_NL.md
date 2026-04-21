# Structuro MVP: gedetailleerde app- en workflowbeschrijving (voor LLM / NotebookLM)

Dit document beschrijft **hoe de Structuro webapp (Next.js) in grote lijnen werkt**, inclusief gebruikersflows, technische poorten (middleware, cookies, overlays) en waar de logica in de codebase zit. Taal: Nederlands. Bedoeld om te delen met tools zoals **NotebookLM** of **Claude** als context.

---

## 1. Productdoel in één zin

Structuro is een **taak- en focus-app** voor mensen met ADHD-achtige denkpatronen: weinig frictie, **energie-gedreven planning**, **dagstart** (hoe voel je je vandaag, welke taken kies je), **focusmodus met timer**, **microstappen**, **parkeer een gedachte**, en **dagafsluiting**. Data leeft in **Supabase** (ingelogd) of **localStorage** (lokale demo-modus).

---

## 2. Techstack (relevant)

| Laag | Keuze |
|------|--------|
| Framework | **Next.js 15** (App Router) |
| UI | React, Tailwind-achtige utility classes, eigen CSS-variabelen (`globals.css`) |
| Backend / DB | **Supabase** (Postgres, Auth, RLS) |
| Auth | Supabase Auth; middleware past sessie aan |
| Client state | **React Context** (`TaskContext`), hooks, `localStorage` voor lokale modus |
| Edge | `middleware.ts` (Supabase session refresh + route guards) |

Belangrijke mappen:

- `src/app/` : routes (`page.tsx` per URL)
- `src/components/` : UI (o.a. `AppLayout`, `DayStartCheckIn`, `HomeCalm`, `TasksOverview`)
- `src/lib/` : domeinlogica (cookies, Supabase DB-helpers, duration helpers)
- `src/context/TaskContext.tsx` : takenlijst, sync lokaal vs Supabase
- `supabase/*.sql` : migraties (profielen, taken, check-ins, parked thoughts, enz.)

---

## 3. Authenticatie en toegang (high level)

### 3.1 Ingelogde gebruiker (Supabase)

- Zonder sessie: redirect naar **`/login`** (behalve login/auth/static assets).
- Met sessie: onboarding geldt als **afgerond** alleen als **`onboarding_completed === true` én `onboarding_version >= 2`** (huidige intro). Ontbrekende of oude versie: redirect naar **`/onboarding`**.
- Na voltooide onboarding: middleware stuurt een bezoek aan **`/onboarding`** door naar **`/`** (home), niet meer naar een aparte dagstart-URL.

### 3.2 Lokale modus (geen account)

- Cookie **`structuro_local_mode`** + onboarding-voortgang via **`LOCAL_ONBOARDING_DONE_COOKIE`** (middleware leest geen `localStorage`).
- Zelfde onboarding-flow, daarna redirect naar home.

### 3.3 Oude route `/dagstart`

- **`/dagstart` bestaat nog als technische route maar redirectt naar `/`** (middleware + `app/dagstart/page.tsx`).
- **Dagstart gebeurt als fullscreen overlay op home**, niet als aparte pagina in de flow.

---

## 4. Tijdzone en “vandaag”

Alle **kalenderdagen** voor dagstart, check-ins en cookies gebruiken **`Europe/Amsterdam`** via `getCalendarDateAmsterdam()` in `src/lib/dagstartCookie.ts` (formaat `YYYY-MM-DD`, `en-CA` locale).

Zo blijven server (Edge), browser en database het eens over wat “vandaag” is.

---

## 5. Dagstart: wat het is en wanneer het verschijnt

### 5.1 Doel

Dagstart = **verplichte check-in aan het begin van een nieuwe kalenderdag**: energie kiezen, **top 3-taken** (afhankelijk van energie: 1/2/3 slots), optioneel snel taken toevoegen, voorzorgsmodus bij te veel deadlines, enz. Component: **`DayStartCheckIn.tsx`**.

### 5.2 Twee bronnen van “dagstart af”

1. **Cookie `structuro_dagstart_datum`**  
   Waarde = Amsterdam-`YYYY-MM-DD` van de dag waarop dagstart is afgerond.  
   Gezet op de client na succesvol opslaan (`setDagstartCookieOnClient()`).

2. **Profiel (Supabase) `profiles.last_dagstart_date`** (+ energie-metadata)  
   Bij ingelogde users wordt na afronden ook **`updateProfileAfterDagstartComplete`** aangeroepen (`src/lib/supabase/profileDagstartDb.ts`).

Middleware **stuurt niet meer door naar een aparte dagstart-pagina**. Als de DB zegt dat dagstart nog nodig is, mag de gebruiker wél `/` laden; de **client** toont de overlay.

### 5.3 UI: overlay op home (`AppLayout`)

Bestand: **`src/components/layout/AppLayout.tsx`**.

- **`dagstartDone`**: afgeleid van `isDagstartDoneTodayClient()` (cookie bevat vandaag’s datum).
- Als **`!dagstartDone`**: fullscreen **`DagstartOverlay`** (`src/components/DagstartOverlay.tsx`) met `DayStartCheckIn` en `onComplete` die cookie-state vernieuwt + `router.refresh()`.
- **Header + bottom tab-nav** blijven zichtbaar maar **`opacity` verlaagd + `pointer-events-none`** zolang dagstart niet klaar is (tabs ook `opacity-50`).
- **Focus-route** (`/focus`): geen normale shell, **geen** dagstart-overlay in die layout-tak (`shouldHideChrome`).

### 5.4 Eerste keer na onboarding (geen dubbele dagstart)

In **`OnboardingFlow.tsx`** bij `finish()`:

- Eerste taak + energie worden opgeslagen (Supabase of localStorage).
- **`setDagstartCookieOnClient()`** en voor ingelogde users **`updateProfileAfterDagstartComplete`** met gekozen energie.
- Redirect naar **`/`**.

Daardoor is **direct na onboarding geen tweede dagstart-gate** meer nodig: de “dag” is al ingevuld.

---

## 6. Hoofdnavigatie (ingelogde shell)

Zichtbaar op de meeste pagina’s via **`AppLayout`** + **`BottomTabNav`**:

| Tab | Route | Functie |
|-----|--------|---------|
| Start | `/` | Home (`HomeCalm`), o.a. kernfocus, start focus |
| Taken | `/todo` | `TasksOverview`, energiebord, prioriteiten, taak bewerken |
| Focus | `/focus` | Focusmodus (fullscreen donker, geen tab-balk) |
| Afsluiten | `/shutdown` | Dagafsluiting, tevredenheid, geparkeerde gedachten |

Extra: **Instellingen** `/settings` via icoon in header; **gamification** `/gamification`, **agenda** `/agenda`, **notificaties** `/notificaties`, **uitleg** `/uitleg` (vaak via submenu of links, niet altijd in bottom tabs).

Op **home** (`/`): **`TodoParkThoughtBar`** onder de content, boven de tabs: snel een gedachte parkeren.

---

## 7. Home (`/`)

Bestand: **`src/app/page.tsx`** rendert `AppLayout` + **`HomeCalm`**.

Kenmerken:

- Haalt **naam** uit `localStorage` / user metadata.
- Toont **kernfocus** (prioriteit 1 taak uit dagstart) met **duur in minuten** (`duration` / `estimatedDuration`).
- **“Start focus”** navigeert naar  
  `/focus?task=<id>&duration=<minuten>`  
  zodat de focus-pagina de **juiste geplande minuten** meekrijgt (niet een oude `localStorage`-waarde).

---

## 8. Taken (`/todo`)

**`TasksOverview.tsx`**: grote component voor backlog, “vandaag gekozen” slots, energiekolommen, focus starten, microstappen, editor.

- **Prioriteit 1–3** correspondeert met dagstart top-3.
- Nieuwe taken: **duur in minuten** (`duration` en `estimatedDuration` worden gelijk gezet waar van toepassing).
- **Start focus** bouwt URL met **`duration`** query param (via **`getTaskDurationMinutes`** in `src/lib/taskDurationMinutes.ts`).

---

## 9. Focus (`/focus`)

### 9.1 Layout

- **`AppLayout hideSidebar={true}`**: geen header/tabs, fullscreen werkbare focus-UI, donker thema.

### 9.2 Timer en duur (minuten als bron van waarheid)

- **`duration`** in state = **minuten** (integer).
- **Timer in seconden**: `timeLeft` en `duration * 60` waar nodig.
- Geplande minuten komen uit de taak via **`getTaskDurationMinutes(task)`** (`duration` of `estimatedDuration`, altijd minuten; strings worden geparsed).

**Belangrijk gedrag:**

- Focusduur komt alleen uit de **URL-query `duration`** (minuten) en uit **`getTaskDurationMinutes(task)`**. De oude localStorage-key **`focus_duration` wordt niet meer gelezen** en bij app-start eenmalig verwijderd.
- Sync van taak naar timer gebeurt alleen wanneer dat veilig is (o.a. niet tijdens lopende timer / pauze / time-up prompt; wel bij nieuwe taak of op het pre-start scherm).

### 9.3 Microstappen

Microstappen horen bij de taak (`microSteps` in Supabase / local). In focus kunnen stappen worden afgevinkt en toegevoegd; normalize-logica in **`src/lib/microSteps.ts`**.

### 9.4 Overige flows

- **DopamineAirlock** na voltooien (o.a. naar taken).
- **Park gedachte** tijdens focus (Supabase `parked_thoughts` of lokale taak).
- **Tijd om**: verlengen, voltooien, quotes.

---

## 10. Afsluiten (`/shutdown`)

**`DayShutdown.tsx`**: reflectie op de dag, tevredenheid, optioneel **geparkeerde gedachten** verwerken, koppeling met suggesties uit eerdere sessies (zie `parkedThoughtsDb.ts`, migraties).

---

## 11. Data en synchronisatie

### 11.1 TaskContext

**`src/context/TaskContext.tsx`**:

- Zonder user: taken uit **localStorage** (`localStorageTasks.ts`).
- Met user: **fetch** + **realtime subscription** Supabase (`tasksDb.ts`), updates terug naar API/local.

Takenvelden (conceptueel): o.a. `title`, `done`, `started`, `priority`, `duration`, `estimatedDuration` (beide **minuten** in app-domein), `energyLevel`, `microSteps`, `dueAt`, `source`, `notToday`, enz.

### 11.2 Check-ins

Dagelijkse check-in (energie + top 3 task-ids): **`useCheckIn`**, opslag in Supabase (`checkinsDb.ts`) of lokaal (`structuro_daily_checkins` in localStorage).

### 11.3 Events

Custom event **`structuro_tasks_updated`** wordt o.a. gefired na dagstart opslaan om UI overal te verversen.

---

## 12. Gamification en XP

**`/gamification`**: badges, XP (`xp.ts`), koppeling aan acties (focus, taken voltooien, enz.). Geen kern van de dagelijkse flow maar wel onderdeel van de app.

---

## 13. Analytics / toestemming

Er bestaat o.a. migratie **`migration_analytics_consent.sql`** en UI rond toestemming in settings (details in code). Niet kritiek voor de basisworkflow maar wél aanwezig in het product.

---

## 14. Veiligheid en testaccounts (voor ontwikkelaars)

Er is een **beschermd testaccount** (zie `src/lib/protectedTestAccount.ts` en Cursor rule). **Geen** scripts die alle data wissen voor dat account in productie of live tests.

---

## 15. Samenvatting van de gebruikersreis

1. **Login** of lokale modus.
2. **Onboarding** (slides + eerste dag: energie, eerste taak, microstappen-optioneel) tot `onboarding_completed`.
3. Redirect **naar home `/`**. Cookie + profiel zetten “dagstart vandaag af” zodat **geen tweede dagstart** volgt.
4. **Volgende dagen**: bij openen app op `/*` met geldige sessie: als cookie/DB zegt “nog geen dagstart vandaag” → **overlay Dagstart** boven home tot afgerond.
5. **Home**: kernfocus, start focus met correcte **minuten** in URL.
6. **Taken**: beheren, prioriteiten, focus starten metzelfde duration-logica.
7. **Focus**: timer op basis van minuten, microstappen, parkeren, afronden.
8. **Afsluiten**: dagreflectie en parked thoughts waar van toepassing.

---

## 16. Bestanden om als “entry points” te lezen

| Onderwerp | Bestanden |
|-----------|-----------|
| Route guards | `src/lib/supabase/middleware.ts` |
| Shell + dagstart overlay | `src/components/layout/AppLayout.tsx`, `src/components/DagstartOverlay.tsx` |
| Dagstart formulier | `src/components/DayStartCheckIn.tsx` |
| Onboarding | `src/components/onboarding/OnboardingFlow.tsx`, `src/app/onboarding/page.tsx` |
| Home | `src/components/HomeCalm.tsx`, `src/app/page.tsx` |
| Taken | `src/components/TasksOverview.tsx`, `src/app/todo/page.tsx` |
| Focus | `src/app/focus/page.tsx` |
| Taakduur helper | `src/lib/taskDurationMinutes.ts` |
| Dagstart cookie | `src/lib/dagstartCookie.ts` |
| Profiel na dagstart | `src/lib/supabase/profileDagstartDb.ts` |
| Taken API | `src/lib/supabase/tasksDb.ts`, `src/app/api/tasks/route.ts` |

---

*Document gegenereerd als vaste referentie voor LLM-context. Bij wijzigingen in de codebase dit bestand bijwerken.*
