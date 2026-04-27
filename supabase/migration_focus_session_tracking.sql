ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS focus_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS focus_exited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS focus_attempts INT NOT NULL DEFAULT 0;

UPDATE public.tasks
SET focus_attempts = 0
WHERE focus_attempts IS NULL;
