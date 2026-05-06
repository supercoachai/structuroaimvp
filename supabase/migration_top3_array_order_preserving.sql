-- Zorg dat daily_checkins.top3_task_ids na dedupe de OPLOPENDE index-volgorde behoudt.
-- De oude `SELECT DISTINCT x FROM unnest(...) AS x` gaf geen gegarandeerde volgorde
-- (kan permuteren of omkeren; zie bug: top3 op /todo vs HomeCalm).
--
-- Dedupe: eerste voorkomen wint (min(ord)), daarna sorteren op eerste positie.
-- Run in Supabase SQL Editor op productie na deploy.

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

  NEW.top3_task_ids := COALESCE(
    (
      SELECT array_agg(x ORDER BY first_ord)
      FROM (
        SELECT x, min(ord) AS first_ord
        FROM unnest(NEW.top3_task_ids) WITH ORDINALITY AS u(x, ord)
        GROUP BY x
      ) deduped
    ),
    ARRAY[]::UUID[]
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
