-- Extra kolommen dagafsluiter (tabel: daily_shutdowns). Voer uit in Supabase SQL Editor indien nog niet aanwezig.

ALTER TABLE daily_shutdowns
  ADD COLUMN IF NOT EXISTS satisfaction_level text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS remembered_tasks jsonb;

COMMENT ON COLUMN daily_shutdowns.satisfaction_level IS 'low | good | great (voldaan na vandaag)';
COMMENT ON COLUMN daily_shutdowns.notes IS 'Optioneel; app gebruikt primair reflection voor reflectietekst';
COMMENT ON COLUMN daily_shutdowns.remembered_tasks IS 'JSON: taken gemarkeerd voor morgen (suggesties staan ook in parked_thoughts)';
