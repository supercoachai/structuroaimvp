# Launch readiness (Structuro MVP)

Korte checklist voor productie. Voer aan vóór echte gebruikers.

## Gegevens en compliance

- Cookiebanner en analytics: zie `ConsentBanner`, `consentStorage`, `GoogleAnalytics`; `NEXT_PUBLIC_GA_MEASUREMENT_ID` in Vercel.
- Account verwijderen: `POST /api/account/delete` vereist geldige Supabase service role (`createServiceRoleClient`); zonder key geeft de route 503.
- Privacy- en voorwaardenroutes: `/privacy`, `/terms`; middleware laat ze toe zonder sessie.

## Migratie na login

- `migrateLocalStorageAfterSignup` na sign-up en sign-in; toasts via `login.migrate*`.

## Legacy profielnamen in de database

- Script: **`supabase/migration_fix_placeholder_display_names.sql`** (eenmalig in SQL Editor uitvoeren voor productie nadat placeholders `Gebruiker`/`User`/leeg moeten worden e-mail-prefix). Zonder deze stap blijven bestaande DB-rijen ongewijzigd al doet nieuwe UI wel goede defaults.

## Observability (open punt)

- **Sentry** staat nog niet als dependency. Zinvol zodra `NEXT_PUBLIC_SENTRY_DSN` (plus server-ingest waar nodig) is ingericht. Zonder DSN geen productie-errorsamenvatting: acceptabel als bewuste keuze met risico.

## Prestaties en flows

- Zie **`docs/perf.md`** voor Lighthouse/backlog op middleware (matcher sluit `/api` uit waar mogelijk).
- Diepere refactor (TaskContext, focus-timer): zelfde doc en **`docs/flow-audit.md`**.
