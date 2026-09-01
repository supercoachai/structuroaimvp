# AGENTS.md

Context voor AI-agents die in deze repo werken. Korte feiten en conventies; strategie en doctrine staan in Obsidian (zie `.cursor/rules/obsidian-structuro-state.mdc`).

## Wat dit is

Structuro MVP: Next.js 15 (App Router) + React 19 + TypeScript, met Supabase (auth/db), PostHog (analytics/attributie), Stripe (betalingen) en de Vercel AI SDK. Doelgroep en productfilosofie: `docs/STRUCTURO_CONTEXT.md`.

## Stack & tooling

- **Runtime:** Node `>=20 <=24`. Package manager: **npm**.
- **Framework:** Next.js 15.5 (App Router), React 19.1.
- **Tests:** Vitest (`vitest.config.ts`). Plus legacy-tests via `scripts/run-legacy-tests.mjs`.
- **Styling:** Tailwind CSS v4.

## Belangrijkste commando's

| Doel | Commando |
|---|---|
| Dev-server (poort 3000) | `npm run dev` |
| Dev na cache-problemen | `npm run dev:clean` |
| Unit tests | `npm test` |
| Unit + legacy tests | `npm run test:all` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Volledige app-verify (build + routes + chunks) | `npm run verify` |
| Snelle verify (dev-server draait al) | `npm run verify:quick` |

## Local dev: cache-hygiëne

`npm run build` en `npm run verify` draaien **prebuild → `rm -rf .next`**. Doe dat **niet** terwijl `next dev` draait: de dev-server deelt dezelfde `.next`-map en krijgt dan 500's (`ENOENT` manifests, `Cannot find module './1331.js'`, webpack `__webpack_modules__ is not a function`, CSS 404's).

**Regels voor agents:**

1. Stop dev vóór `npm run build` of `npm run verify`, of gebruik alleen `npm run verify:quick` als dev al draait.
2. Na build+dev overlap: `npm run dev:clean` (kill poort 3000, schone `.next`, herstart dev).
3. Geen codebug in v2-componenten aannemen bij deze symptomen; eerst cache/processen checken.

## Verplichte werkwijze

1. **Verifieer na wijzigingen.** Bij routing, app-shell, pagina's, middleware of build-config: draai `npm run verify` (of `verify:quick`). Rapporteer pas "klaar" als het groen is. Zie `.cursor/rules/verify-after-changes.mdc`.
2. **Nieuwe pagina = route toevoegen** aan `scripts/app-routes.mjs`, anders faalt verify bewust.
3. **Gebruik de subagents:** `verifier` voordat je werk afrondt, `debugger` bij niet-triviale bugs.

## Harde regels (niet overtreden)

- **Geen em-dashes** (`—`) in user-facing strings. Zie `.cursor/rules/no-em-dashes.mdc`.
- **Beschermd testaccount:** nooit data-wipes / db-resets die dat account raken. Zie `.cursor/rules/protected-test-account.mdc` en `src/lib/protectedTestAccount.ts`.
- **Geen data/notities in git:** analyses, rapporten en werknotities horen in Obsidian, niet in de repo. Zie `.cursor/rules/no-data-in-git.mdc`.
- **Attributie-routing:** organisch verkeer naar `/onboarding` (legacy `/start` redirect), TikTok-verkeer naar `/tiktok`, nooit hardcoded TikTok-URL's op organische CTA's. Zie `.cursor/rules/structuro-context.mdc`.

## Prioriteit (1 september 2026)

Canoniek groeplan in Obsidian: `03 Groei/Pad naar 50 Warme 500 sep 2026.md`.

1. **P0 Warme 500 (5 dagen):** 50 geïnterviewden + daarna 100 LinkedIn-likers. 30 dagen cadeau, geen kaart (`gift_comp` + `app_trial_override_until`). Dag 25: €12,99.
2. **Rolling 5:** ma + do 5 professionals. Coach permanent gratis. Cliënten 30d cadeau. Geen medische claims.
3. **Lichte social:** 2 video’s/week, ManyChat STARTEN. Koud verkeer = bestaande 7d card-trial ná anonieme dagstart. Geen paid TikTok.

## Waar dingen staan

- App-routes & pagina's: `src/app/`
- Componenten: `src/components/`
- Libs (auth, supabase, posthog, i18n, tiktok): `src/lib/`
- Scripts (verify, export, setup): `scripts/`
- Productdocs: `docs/`
- Strategie/doctrine/metrics: Obsidian vault (niet in repo).
