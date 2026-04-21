-- Dagafsluiter: taken doorschuiven naar morgen + parked_thoughts scheduled_for
-- Voer uit in Supabase SQL Editor als dagafsluiter faalt bij geselecteerde "morgen"-taken.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS postponed_to date,
  ADD COLUMN IF NOT EXISTS postponed_at timestamp with time zone;

ALTER TABLE parked_thoughts
  ADD COLUMN IF NOT EXISTS scheduled_for date;

-- Vereist voor filter in trigger (indien nog niet aanwezig)
ALTER TABLE parked_thoughts
  ADD COLUMN IF NOT EXISTS thought_type text NOT NULL DEFAULT 'focus_park';

ALTER TABLE parked_thoughts
  ADD COLUMN IF NOT EXISTS suggested_task_energy text;

-- KRITIEK: oude trigger telde alle rijen mee en blokkeerde dagafsluiter-suggesties bij 10 focus-gedachten
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
