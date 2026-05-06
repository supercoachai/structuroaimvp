-- =============================================================================
-- TAAK 3: CHECK constraints voor tekstlengtes (idiot-proofing)
-- =============================================================================
--
-- STAP 1 (verplicht, in Supabase SQL Editor op de DOEL-database):
-- Controleer of er al rijen zijn die de limiet overschrijden.
-- Als één van de counts > 0: eerst data opschonen of verlengen, GEEN constraints
-- toevoegen tot alles 0 is.
--
--   SELECT 'tasks' AS tbl, count(*)::bigint AS cnt
--   FROM public.tasks
--   WHERE length(title) > 280
--   UNION ALL
--   SELECT 'shutdowns_reflection', count(*)::bigint
--   FROM public.daily_shutdowns
--   WHERE reflection IS NOT NULL AND length(reflection) > 5000
--   UNION ALL
--   SELECT 'shutdowns_notes', count(*)::bigint
--   FROM public.daily_shutdowns
--   WHERE notes IS NOT NULL AND length(notes) > 5000
--   UNION ALL
--   SELECT 'parked_thoughts', count(*)::bigint
--   FROM public.parked_thoughts
--   WHERE length(content) > 2000;
--
-- STAP 2: Voer daarna dit hele bestand uit (of via supabase db push/migrate).
-- =============================================================================

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_title_length;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_title_length
  CHECK (length(title) <= 280);

ALTER TABLE public.daily_shutdowns
  DROP CONSTRAINT IF EXISTS shutdowns_reflection_length;

ALTER TABLE public.daily_shutdowns
  ADD CONSTRAINT shutdowns_reflection_length
  CHECK (reflection IS NULL OR length(reflection) <= 5000);

ALTER TABLE public.daily_shutdowns
  DROP CONSTRAINT IF EXISTS shutdowns_notes_length;

ALTER TABLE public.daily_shutdowns
  ADD CONSTRAINT shutdowns_notes_length
  CHECK (notes IS NULL OR length(notes) <= 5000);

ALTER TABLE public.parked_thoughts
  DROP CONSTRAINT IF EXISTS thoughts_content_length;

ALTER TABLE public.parked_thoughts
  ADD CONSTRAINT thoughts_content_length
  CHECK (length(content) <= 2000);
