# Flow- en audit-nabespreking (na deepscan 2026-05-02)

Aanvulling op `launch-readiness.md`: wat waar staat en wat **nog** onder handen hoort voor een "schone" audit.

## Legacy profielnamen (display_name migration)

Het **herstellen van bestaande rijen** in productie-supabase deed de app niet automatisch voor je uit: daarvoor staat nu het script:

**`supabase/migration_fix_placeholder_display_names.sql`**

Eenmalig uitvoeren in de **SQL Editor** (staging eerst aan te raden). Het zet `display_name` (en zo nodig veilige harmonisatie voor `preferred_name`) van placeholders `Gebruiker`/`User`/leeg naar het **lokale deel van `auth.users.email`**.

Accounts met een echte naam alleen op `preferred_name` en fout op `display_name`: na deze update krijgt `display_name` het e-mail-prefix; `preferred_name` blijft behouden als die geen placeholder is.

## Security-patches toegepast in repo

- **`POST /api/tasks/batch`**: ownership-check op client-supplied `id` voor updates (403 bij ids die niet van de user zijn).
- **`/auth/callback`**: geen `x-forwarded-host`; alleen `origin` plus strikt relatief pad (geen `//`, geen schemes).

## Nog gepland voor productie-hardheid (audit)

| Punt |
|------|
| **Robuuste rate limits** (KV) op login-reset en schrijf-API's (§1.3). Nu alleen eerste batch-lijn; voor OG/wachtlijst onvoldoende. |
| **Sentry** met echte DSN; zonder observability voor launch risico zoals eerder besproken. |
| **TaskContext**, focus-interval, AppLayout-poller voor Lighthouse/renderwinst (zie `docs/perf.md`). |
| **Lighthouse 95+**: handmatig of CI-commando uitvoeren en resultaat archiveren. |
