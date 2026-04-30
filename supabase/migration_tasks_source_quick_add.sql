-- Voeg bron 'quick_add' toe (snelbalk onderaan). Vereist als je source = 'quick_add' wilt opslaan.
-- Draai in Supabase: SQL Editor → plakken → Run.

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_source_allowed_chk;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_source_allowed_chk
  CHECK (
    source IS NULL OR source IN (
      'regular',
      'focus_remainder',
      'medication',
      'event',
      'focus_mode',
      'quick_complete',
      'manual',
      'quick_add'
    )
  );
