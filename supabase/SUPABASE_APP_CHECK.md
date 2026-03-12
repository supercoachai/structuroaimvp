# Supabase ↔ Structuro app – verificatie

Deze checklist bevestigt dat de app correct met Supabase is gekoppeld.

## ✅ Database ↔ app

| Onderdeel | Supabase | App (code) | Status |
|-----------|----------|------------|--------|
| **Taken** | Tabel `tasks`, kolom `user_id` | `src/lib/supabase/tasksDb.ts` → `.from("tasks")`, `.eq("user_id", userId)` | ✅ |
| **Taken kolommen** | schema.sql + migration_app_columns.sql (o.a. title, done, started, priority, due_at, duration, energy_level, micro_steps, not_today, category, repeat_*) | `TaskRow` in tasksDb.ts mapt alle velden (snake_case ↔ camelCase) | ✅ |
| **Dagstart** | Tabel `daily_checkins`, kolommen `user_id`, `date`, `energy_level`, `top3_task_ids` | `src/lib/supabase/checkinsDb.ts` → getCheckIn / upsert met onConflict "user_id,date" | ✅ |
| **RLS** | Policies op `tasks` en `daily_checkins`: SELECT/INSERT/UPDATE alleen waar `auth.uid() = user_id` | App gebruikt ingelogde user (Supabase Auth); RLS filtert automatisch op user_id | ✅ |

## ✅ Auth ↔ app

| Onderdeel | Werking |
|-----------|--------|
| **Gebruiker** | `useUser()` (src/hooks/useUser.ts) haalt huidige user op via `createClient().auth.getUser()` en `onAuthStateChange`. |
| **Taken per user** | TaskContext gebruikt `user?.id`; bij user → Supabase (fetchTasksFromSupabase, add/update/delete); zonder user → localStorage. |
| **Dagstart per user** | useCheckIn gebruikt `user?.id`; bij user → Supabase (getCheckInFromSupabase, upsertCheckInToSupabase); zonder user → localStorage. |
| **Middleware** | Zonder sessie én zonder cookie `structuro_local_mode` → redirect naar `/login`. Routes zoals /overzicht, /dagstart, /focus zijn daarmee beschermd. |
| **Auth callback** | `/auth/callback` wisselt code voor sessie en redirect naar app. |

## ✅ Omgevingsvariabelen

In `.env.local` (lokaal) of bij je host (Vercel etc.):

- `NEXT_PUBLIC_SUPABASE_URL` = je Supabase project URL (bijv. `https://xxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = je Supabase anon/public key

Zonder deze werkt de Supabase-client niet.

## ✅ Wat je in Supabase moet hebben gedaan

1. **Schema:** In SQL Editor `schema.sql` uitgevoerd (tabellen + RLS + policies).
2. **Migratie:** In SQL Editor `migration_app_columns.sql` uitgevoerd (extra kolommen op `tasks`).

Daarna klopt de koppeling tussen Supabase en de Structuro-app voor taken en dagstart.
