-- Top3-validatie alleen bij wijziging van top3/energie (niet bij cycle_phase, notes, etc.).

CREATE OR REPLACE FUNCTION public.daily_checkins_validate_top3()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed_count INTEGER;
  max_tasks INTEGER;
  task_id UUID;
  task_ok BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.top3_task_ids IS NOT DISTINCT FROM OLD.top3_task_ids
       AND NEW.energy_level IS NOT DISTINCT FROM OLD.energy_level THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.top3_task_ids IS NULL OR cardinality(NEW.top3_task_ids) IS NULL THEN
    RETURN NEW;
  END IF;

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
        AND COALESCE(t.not_today, FALSE) = FALSE
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
    AND COALESCE(t.done, FALSE) = FALSE
    AND COALESCE(t.not_today, FALSE) = FALSE;

  IF allowed_count <> cardinality(NEW.top3_task_ids) THEN
    RAISE EXCEPTION 'top3_task_ids bevat ongeldige of afgeronde taken';
  END IF;

  RETURN NEW;
END;
$$;
