# Structuro MVP: code- en workflow-context voor AI-assistenten

Dit mapje is bedoeld om **zonder de volledige repo** te uploaden naar Claude (of vergelijkbare tools). Het beschrijft hoe de app in code is opgebouwd, welke flows er zijn, en waar je wat vindt.

**Repo:** StructuroAI MVP (Next.js 15, React 19, TypeScript, Tailwind CSS 4, Supabase).

---

## 1. Product in één zin

Webapp voor volwassenen met ADHD-achtige kenmerken: **dagstart/check-in**, **taken met prioriteiten en energiezones**, **focusmodus**, **agenda/herinneringen**, **gamification (XP, trofeeën)**, **instellingen** en **onboarding**.

---

## 2. Tech stack

| Onderdeel | Keuze |
|-----------|--------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS 4 (`@import "tailwindcss"` in `src/app/globals.css`) |
| Font | Inter via `next/font` in `src/app/layout.tsx` |
| Data (cloud) | Supabase (Auth + Postgres + RLS) |
| Data (fallback) | `localStorage` voor taken wanneer geen sessie of sync-pad |
| Analytics | Vercel Analytics, Speed Insights, optioneel Google Analytics component |

---

## 3. Belangrijkste mappen (src/)

```
src/
├── app/                    # App Router: pages, layouts, API routes
│   ├── layout.tsx          # Root: Inter, globals.css, AppProviders
│   ├── page.tsx            # Dashboard (HomeCalm)
│   ├── login/              # Auth UI
│   ├── auth/callback/      # Supabase OAuth callback
│   ├── onboarding/         # Onboarding flow shell
│   ├── dagstart/           # Dagelijkse check-in + “focus voor vandaag”
│   ├── todo/               # Taken & prioriteiten (TasksOverview)
│   ├── focus/              # Focus-sessie
│   ├── agenda/             # Planner
│   ├── gamification/       # Prestaties / XP / trofeeën (grote client page)
│   ├── settings/           # Profielnaam, export, wissen, rondleiding
│   ├── notificaties/       # Herinneringen-gerelateerd scherm
│   ├── shutdown/           # Dag afsluiten
│   ├── uitleg/             # Uitlegpagina
│   └── api/                # Route handlers (tasks, gamification, …)
├── components/             # UI + domeincomponenten (o.a. DayStartCheckIn, Sidebar)
├── components/layout/      # AppLayout (sidebar vs full-screen modus)
├── context/                # TaskContext (takenbron + sync)
├── contexts/               # SidebarContext
├── hooks/                  # useUser, useCheckIn, useOnboardingStatus, useMediaQuery, …
├── lib/                    # Utilities, Supabase-clients, domeinlogica
│   └── supabase/           # client.ts, server.ts, middleware.ts, *Db.ts
└── middleware.ts           # Dunne wrapper: roept updateSession() aan
```

**Providers** (`src/components/AppProviders.tsx`): `ErrorBoundary` → `GoogleAnalytics` → `TaskProvider` → `SidebarProvider` → `Suspense` → children. Analytics-componenten staan naast de boom.

---

## 4. Routes (pagina’s) en rol

| Pad | Bestand | Functie |
|-----|---------|---------|
| `/` | `app/page.tsx` | Dashboard (`HomeCalm`) |
| `/login` | `app/login/page.tsx` | Inloggen |
| `/onboarding` | `app/onboarding/page.tsx` | Eerste gebruik / intro (wordt door middleware naar `/dagstart` gestuurd na afronden) |
| `/dagstart` | `app/dagstart/page.tsx` | Check-in; na invullen “focus voor vandaag” |
| `/todo` | `app/todo/page.tsx` | `TasksOverview`: prioriteiten, energiekolommen, geparkeerde gedachten |
| `/focus` | `app/focus/page.tsx` | Focusmodus met taak |
| `/agenda` | `app/agenda/page.tsx` | Agenda/planner |
| `/gamification` | `app/gamification/page.tsx` | Prestaties, XP, trofeeën |
| `/settings` | `app/settings/page.tsx` | Instellingen, GDPR-export, data wissen |
| `/notificaties` | `app/notificaties/page.tsx` | Notificaties/herinneringen |
| `/shutdown` | `app/shutdown/page.tsx` | Dag afsluiten |
| `/uitleg` | `app/uitleg/page.tsx` | Uitleg |
| `/test`, `/test-data` | dev/test helpers | Niet voor eindgebruikers |

**API** (selectie): `app/api/tasks/*`, `app/api/gamification/route.ts`, enz. Gebruikt voor server-side operaties waar nodig.

---

## 5. Authenticatie en middleware (kritiek)

**Bestanden:** `src/middleware.ts` → `src/lib/supabase/middleware.ts` (`updateSession`).

### 5.1 Supabase geconfigureerd

- Maakt server-side Supabase-client met cookies (`@supabase/ssr`).
- Haalt `user` op via `supabase.auth.getUser()`.
- Leest **`profiles.onboarding_completed`** voor ingelogde gebruikers.
- **Geen sessie** (geen user en geen auth-cookie): redirect naar `/login` (behalve login/auth paths).
- **Onboarding niet af**: alleen `/onboarding` toegestaan; andere paths → `/onboarding`.
- **Onboarding af** maar URL `/onboarding`: redirect naar **`/dagstart`** (niet naar home).
- Daarna: **`applyDagstartCookieGuard`**: als de dagstart-cookie niet op “vandaag (Amsterdam)” staat, wordt naar **`/dagstart`** gestuurd (met uitzonderingen voor login, auth, onboarding, api).

### 5.2 Lokale modus zonder account

- Cookie **`structuro_local_mode`**: anonieme flow zonder Supabase-user.
- Middleware gebruikt **`LOCAL_ONBOARDING_DONE_COOKIE`** (`localOnboardingCookie.ts`): tot die gezet is, redirect naar `/onboarding`.
- Zelfde dagstart-guard als hierboven na onboarding.

### 5.3 Supabase níet geconfigureerd (placeholder URL/key)

- `legacyCookieOnlyMiddleware`: gedrag op basis van auth-cookie en optioneel local mode; geen echte `getUser()`-flow.

### 5.4 Client-side user

- **`useUser`** (`src/hooks/useUser.ts`): `createClient()` browser, `getUser()` met timeout, `onAuthStateChange`.
- **`TaskContext`** gebruikt `useUser`: bij user → Supabase taken + realtime; anders → localStorage helpers.

---

## 6. Dagstart-cookie en “sidebar pas na dagstart”

- **Cookie:** `STRUCTURO_DAGSTART_COOKIE` (zie `src/lib/dagstartCookie.ts`).
- Waarde wordt gekoppeld aan **kalenderdatum Amsterdam** (`getCalendarDateAmsterdam`).
- Client zet de cookie o.a. vanuit `dagstart/page.tsx` wanneer check-in geladen is.
- **AppLayout** (`src/components/layout/AppLayout.tsx`): als dagstart voor vandaag **niet** klaar is (`shouldHideSidebar`), wordt een **vereenvoudigde layout** getoond (geen sidebar, wel scrollbare main + uitlog-knop). Na dagstart: normale layout met sidebar en menu-knop.

---

## 7. Taken: TaskContext en opslag

**Bestand:** `src/context/TaskContext.tsx`.

- Exporteert `Task` interface (prioriteit altijd `number | null`, mapping naar/van `LocalTask`).
- **Met Supabase-user:** `fetchTasksFromSupabase`, CRUD via `tasksDb`, `subscribeToTasks` voor live updates.
- **Zonder user:** `getTasksFromStorage` / `saveTasksToStorage` etc. uit `lib/localStorageTasks.ts`.
- Dispatch van custom event **`structuro_tasks_updated`** bij wijzigingen (o.a. voor dagstart-cookie polling in AppLayout).

**Supabase-laag:** `src/lib/supabase/tasksDb.ts` (server/client patterns volgens bestaande code).

---

## 8. Check-ins (dagstart-data)

- **`useCheckIn`** hook + **`src/lib/supabase/checkinsDb.ts`**: vandaag’s check-in (energie, top-3 taak-ids, etc.).
- **`DayStartCheckIn`** component verzamelt UI en callbacks; `dagstart/page.tsx` orkestreert navigatie naar `/todo` na afronden.

---

## 9. Geparkeerde gedachten

- DB-laag: `src/lib/supabase/parkedThoughtsDb.ts` (+ SQL migrations onder `supabase/`).
- UI: `GeparkeerdeGedachtenSection.tsx`, gerelateerde modals in components.

---

## 10. Onboarding (profiel + lokaal)

- Server: `profiles.onboarding_completed` in Supabase.
- Client-mutaties: `src/lib/onboardingMutations.ts`, status-hook `useOnboardingStatus`.
- Lokaal: `LOCAL_ONBOARDING_COMPLETED_KEY` / cookies in `onboardingProfile.ts`, `localOnboardingCookie.ts`.
- UI-flow: `components/onboarding/OnboardingFlow.tsx` (groot; animaties en stappen).

---

## 11. Gamification

- Zwaar client-side scherm: `app/gamification/page.tsx` (veel inline styles + secties).
- API: `app/api/gamification/route.ts`.
- Hulpfuncties: o.a. `lib/xp.ts`, `lib/gamificationMeta.ts`, `lib/completionRewards.ts`.

---

## 12. Focus en overige domeinlib

- `app/focus/page.tsx` + `IgniteTimer`, `parkFocusTask`, enz.
- `lib/voorzorgsmodus.ts` + `VoorzorgsmodusModal.tsx` voor “voorzorgsmodus”-gedrag.
- `lib/resetStorage.ts`, `STRUCTURO_STORAGE_KEYS`: export/wissen in settings (let op beschermd testaccount).

---

## 13. Design en typografie

- Globale utility-achtige klassen in **`globals.css`**: o.a. `.structuro-page-title` en `.structuro-page-subtitle` (plain CSS, geen `@apply` in `@layer`, i.v.m. Tailwind v4-betrouwbaarheid).
- Verder Tailwind-utility classes in JSX.
- **`design-system.ts`**: kleuren/constanten voor sommige schermen.

---

## 14. Omgevingsvariabelen (indicatief)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL`: e-mail waarvan data **niet** gewist mag worden in dev (zie `lib/protectedTestAccount.ts`).
- Optioneel: `STRUCTURO_DEV_FORCE_ONBOARDING=1` in development om onboarding te forceren.

Zie ook root **`README.md`** en **`DATABASE_SETUP.md`**.

---

## 15. Database: SQL en migraties

Map **`supabase/`** (o.a. `schema.sql`, `migration_*.sql`).
- RLS en tabellen horen bij Supabase-project; exact schema kan wijzigen; altijd migraties in repo raadplegen.

---

## 16. Workflow voor ontwikkelaars

```bash
npm install
# .env.local met Supabase-keys
npm run dev # poort 3000, zie package.json scripts
npm run build
```

- **Prebuild** ruimt `.next` op (`prebuild` → `clean`).
- Lint: `npm run lint` (indien niet overgeslagen in build).

---

## 17. Projectregels (Cursor / team)

- **Beschermd testaccount:** nooit bulk-wissen of reset-scripts die dat account raken (`protectedTestAccount.ts`, env `NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL`).
- **Geen em-dash (U+2014)** in user-facing tekst (productregel in `.cursor/rules`).

---

## 18. Wat dit document níet is

Geen vervanging van de echte code: types, edge cases en alle props staan in de bronbestanden. Gebruik dit als **landkaart**; bij twijfel altijd het genoemde pad openen.

**Laatste tip voor uploads:** voor Claude volstaat vaak alleen dit **`README.md`**-bestand; het bevat de structuur en flow. Voeg desgewenst `DATABASE_SETUP.md` uit de root toe voor DB-stappen.

---

## 19. Optionele bestanden voor Claude Project Knowledge

Naast dit `README.md` liggen vier platte Markdown-bestanden in deze map. Bewerk ze lokaal en upload losse bestanden naar **Claude Project → Project Knowledge** (de mapstructuur van je machine zit daar niet in; plat houden scheelt klikwerk).

| Bestand | Doel |
|---------|------|
| `STATE.md` | Waar je staat, laatste beslissing, open vragen |
| `SOCIAL_TEMPLATE.md` | Vaste social-opmaak + voorbeeldpost |
| `SCHEMA.md` | DB-samenvatting (detail blijft in `supabase/`) |
| `CURSOR_PROMPTS.md` | Vaste prompts voor Cursor (meestal niet nodig in Claude) |
