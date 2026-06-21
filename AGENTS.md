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
| Unit tests | `npm test` |
| Unit + legacy tests | `npm run test:all` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Volledige app-verify (build + routes + chunks) | `npm run verify` |
| Snelle verify (dev-server draait al) | `npm run verify:quick` |

## Verplichte werkwijze

1. **Verifieer na wijzigingen.** Bij routing, app-shell, pagina's, middleware of build-config: draai `npm run verify` (of `verify:quick`). Rapporteer pas "klaar" als het groen is. Zie `.cursor/rules/verify-after-changes.mdc`.
2. **Nieuwe pagina = route toevoegen** aan `scripts/app-routes.mjs`, anders faalt verify bewust.
3. **Gebruik de subagents:** `verifier` voordat je werk afrondt, `debugger` bij niet-triviale bugs.

## Harde regels (niet overtreden)

- **Geen em-dashes** (`—`) in user-facing strings. Zie `.cursor/rules/no-em-dashes.mdc`.
- **Beschermd testaccount:** nooit data-wipes / db-resets die dat account raken. Zie `.cursor/rules/protected-test-account.mdc` en `src/lib/protectedTestAccount.ts`.
- **Geen data/notities in git:** analyses, rapporten en werknotities horen in Obsidian, niet in de repo. Zie `.cursor/rules/no-data-in-git.mdc`.
- **Attributie-routing:** organisch verkeer naar `/start`, TikTok-verkeer naar `/tiktok`, nooit hardcoded TikTok-URL's op organische CTA's. Zie `.cursor/rules/structuro-context.mdc`.

## Prioriteit (juni 2026)

1. Activatie P0: signup tot dagstart (frictie weg, magic link, compact onboarding).
2. Acquisitie P1: `/start` (organic) en `/tiktok` (social).
3. Geen paid TikTok tot activatie structureel >25%.

## Waar dingen staan

- App-routes & pagina's: `src/app/`
- Componenten: `src/components/`
- Libs (auth, supabase, posthog, i18n, tiktok): `src/lib/`
- Scripts (verify, export, setup): `scripts/`
- Productdocs: `docs/`
- Strategie/doctrine/metrics: Obsidian vault (niet in repo).
