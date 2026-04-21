-- Dagafsluiter: daily_shutdowns aanmaken als die nog ontbreekt, plus ontbrekende kolommen.
-- Voer dit hele bestand uit in de Supabase SQL Editor (één keer).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS daily_shutdowns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  completed_task_ids UUID[],
  moved_to_tomorrow_task_ids UUID[],
  energy_level TEXT,
  satisfaction_level TEXT,
  reflection TEXT,
  notes TEXT,
  remembered_tasks JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, date)
);

-- Bestaande (oudere) tabellen: kolommen die later zijn toegevoegd
ALTER TABLE daily_shutdowns
  ADD COLUMN IF NOT EXISTS satisfaction_level text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS remembered_tasks jsonb;

COMMENT ON COLUMN daily_shutdowns.satisfaction_level IS 'low | good | great (voldaan na vandaag)';
COMMENT ON COLUMN daily_shutdowns.notes IS 'Optioneel; app gebruikt primair reflection voor reflectietekst';
COMMENT ON COLUMN daily_shutdowns.remembered_tasks IS 'JSON: taken gemarkeerd voor morgen (suggesties staan ook in parked_thoughts)';

CREATE INDEX IF NOT EXISTS daily_shutdowns_user_date_idx ON daily_shutdowns(user_id, date);

ALTER TABLE daily_shutdowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own shutdowns" ON daily_shutdowns;
DROP POLICY IF EXISTS "Users can insert own shutdowns" ON daily_shutdowns;
DROP POLICY IF EXISTS "Users can update own shutdowns" ON daily_shutdowns;

CREATE POLICY "Users can view own shutdowns" ON daily_shutdowns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shutdowns" ON daily_shutdowns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shutdowns" ON daily_shutdowns
  FOR UPDATE USING (auth.uid() = user_id);
