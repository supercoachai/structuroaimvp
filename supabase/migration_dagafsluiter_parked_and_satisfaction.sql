-- Dagafsluiter: parked_thoughts typen + voldaan-niveau op daily_shutdowns
-- dagafsluiter_suggestie telt niet mee voor de max 10 focus-gedachten.

ALTER TABLE parked_thoughts
  ADD COLUMN IF NOT EXISTS thought_type TEXT NOT NULL DEFAULT 'focus_park';

ALTER TABLE parked_thoughts
  ADD COLUMN IF NOT EXISTS suggested_task_energy TEXT;

COMMENT ON COLUMN parked_thoughts.thought_type IS 'focus_park | dagafsluiter_suggestie';
COMMENT ON COLUMN parked_thoughts.suggested_task_energy IS 'low|medium|high van brontaak voor filter bij dagstart';

ALTER TABLE daily_shutdowns
  ADD COLUMN IF NOT EXISTS satisfaction_level TEXT;

COMMENT ON COLUMN daily_shutdowns.satisfaction_level IS 'low | good | great (voldaan na vandaag)';

-- Bestaande rijen: alleen focus-gedachten tellen mee voor de limiet
CREATE OR REPLACE FUNCTION public.enforce_parked_thoughts_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.thought_type, 'focus_park') <> 'focus_park' THEN
    RETURN NEW;
  END IF;
  IF (
    SELECT COUNT(*) FROM parked_thoughts
    WHERE user_id = NEW.user_id
      AND converted_to_task_id IS NULL
      AND COALESCE(thought_type, 'focus_park') = 'focus_park'
  ) >= 10 THEN
    RAISE EXCEPTION 'Maximaal 10 actieve geparkeerde gedachten per gebruiker';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
