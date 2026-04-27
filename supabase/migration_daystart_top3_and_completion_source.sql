-- Phase 1 core fixes:
-- 1) Valideer daily_checkins.top3_task_ids tegen "vandaag | postponed_to vandaag | moved_to_tomorrow (gisteren)"
-- 2) Zorg dat done=true altijd started=true + completed_at zet
-- 3) Breid tasks.source uit met completion sources (focus_mode/quick_complete/manual)

-- ---- Tasks columns / constraints -------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS started BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_source_allowed_chk;

-- Bestaande legacy/source-varianten normaliseren voordat de CHECK actief wordt.
UPDATE public.tasks
SET source = CASE
  WHEN source IS NULL OR btrim(source) = '' THEN NULL
  WHEN source IN (
    'regular',
    'focus_remainder',
    'medication',
    'event',
    'focus_mode',
    'quick_complete',
    'manual'
  ) THEN source
  WHEN source IN ('focus', 'focus-session', 'focus_session', 'ignite') THEN 'focus_mode'
  WHEN source IN ('quick', 'quick_done', 'quick-done', 'checkbox', 'checkoff') THEN 'quick_complete'
  WHEN source IN ('direct', 'manual_done', 'manual-done') THEN 'manual'
  ELSE 'regular'
END;

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
      'manual'
    )
  );

CREATE OR REPLACE FUNCTION public.tasks_apply_completion_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(NEW.done, FALSE) = TRUE THEN
    -- Done impliceert altijd started=true (audit: geen done=true + started=false meer)
    NEW.started := TRUE;

    -- completion timestamp altijd vullen als deze ontbreekt
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := TIMEZONE('utc', NOW());
    END IF;

    -- Als geen expliciete source is meegegeven, markeer als quick_complete
    IF COALESCE(NEW.source, '') = '' OR NEW.source = 'regular' THEN
      NEW.source := 'quick_complete';
    END IF;
  ELSIF COALESCE(NEW.done, FALSE) = FALSE AND COALESCE(OLD.done, FALSE) = TRUE THEN
    -- Terugzetten naar open taak
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_apply_completion_defaults ON public.tasks;
CREATE TRIGGER trg_tasks_apply_completion_defaults
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.tasks_apply_completion_defaults();

-- ---- Daily checkins top3 validation ---------------------------------------------
CREATE OR REPLACE FUNCTION public.daily_checkins_validate_top3()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  allowed_count INTEGER;
  max_tasks INTEGER;
  task_id UUID;
  task_ok BOOLEAN;
BEGIN
  IF NEW.top3_task_ids IS NULL OR cardinality(NEW.top3_task_ids) IS NULL THEN
    RETURN NEW;
  END IF;

  -- dedupe op volgorde
  NEW.top3_task_ids := (
    SELECT ARRAY(
      SELECT DISTINCT x
      FROM unnest(NEW.top3_task_ids) AS x
    )
  );

  max_tasks := CASE NEW.energy_level
    WHEN 'low' THEN 1
    WHEN 'medium' THEN 2
    ELSE 3
  END;

  IF cardinality(NEW.top3_task_ids) > max_tasks THEN
    RAISE EXCEPTION 'Max % taken toegestaan voor energy level %', max_tasks, NEW.energy_level;
  END IF;

  FOREACH task_id IN ARRAY NEW.top3_task_ids
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = task_id
        AND t.user_id = NEW.user_id
        AND COALESCE(t.done, FALSE) = FALSE
        AND (
          (t.created_at AT TIME ZONE 'Europe/Amsterdam')::DATE = NEW.date
          OR t.postponed_to = NEW.date
          OR EXISTS (
            SELECT 1
            FROM public.daily_shutdowns ds
            WHERE ds.user_id = NEW.user_id
              AND ds.date = (NEW.date - INTERVAL '1 day')::DATE
              AND task_id = ANY(COALESCE(ds.moved_to_tomorrow_task_ids, ARRAY[]::UUID[]))
          )
        )
    ) INTO task_ok;

    IF NOT task_ok THEN
      RAISE EXCEPTION 'Task % is niet geldig voor top3 op datum %', task_id, NEW.date;
    END IF;
  END LOOP;

  SELECT COUNT(*)
  INTO allowed_count
  FROM unnest(NEW.top3_task_ids) i
  JOIN public.tasks t ON t.id = i
  WHERE t.user_id = NEW.user_id
    AND COALESCE(t.done, FALSE) = FALSE;

  IF allowed_count <> cardinality(NEW.top3_task_ids) THEN
    RAISE EXCEPTION 'top3_task_ids bevat ongeldige of afgeronde taken';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_daily_checkins_validate_top3 ON public.daily_checkins;
CREATE TRIGGER trg_daily_checkins_validate_top3
BEFORE INSERT OR UPDATE ON public.daily_checkins
FOR EACH ROW
EXECUTE FUNCTION public.daily_checkins_validate_top3();
