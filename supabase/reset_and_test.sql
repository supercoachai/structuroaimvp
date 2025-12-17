-- Complete Database Reset & Test Script
-- ⚠️ WAARSCHUWING: Dit script verwijdert ALLE data en maakt alles opnieuw aan
-- Gebruik dit ALLEEN in een test omgeving!

-- Stap 1: Verwijder alle bestaande data (optioneel - alleen voor test)
-- UNCOMMENT DEZE REGELS ALLEEN ALS JE ALLES WILT WEGGOOIEN:
-- TRUNCATE TABLE tasks CASCADE;
-- TRUNCATE TABLE gamification_data CASCADE;
-- TRUNCATE TABLE user_insights CASCADE;
-- TRUNCATE TABLE daily_checkins CASCADE;
-- TRUNCATE TABLE daily_shutdowns CASCADE;

-- Stap 2: Verwijder de tasks tabel als deze bestaat (voor volledige reset)
-- DROP TABLE IF EXISTS tasks CASCADE;

-- Stap 3: Maak tasks tabel opnieuw aan met ALLE kolommen
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  priority INTEGER,
  due_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in minuten
  source TEXT DEFAULT 'regular', -- 'regular', 'focus_remainder', 'parked_thought', etc.
  completed_at TIMESTAMP WITH TIME ZONE,
  reminders INTEGER[] DEFAULT '{}', -- array van minuten voor due time
  repeat TEXT DEFAULT 'none',
  impact TEXT DEFAULT '🌱', -- emoji
  energy_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  estimated_duration INTEGER,
  micro_steps JSONB DEFAULT '[]'::jsonb, -- array van micro-stappen
  not_today BOOLEAN DEFAULT FALSE, -- "niet vandaag" flag
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Stap 4: Voeg ontbrekende kolommen toe (als tabel al bestaat)
DO $$ 
BEGIN
  -- micro_steps
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'micro_steps'
  ) THEN
    ALTER TABLE tasks ADD COLUMN micro_steps JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE '✓ micro_steps kolom toegevoegd';
  END IF;

  -- not_today
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'not_today'
  ) THEN
    ALTER TABLE tasks ADD COLUMN not_today BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✓ not_today kolom toegevoegd';
  END IF;

  -- source
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'source'
  ) THEN
    ALTER TABLE tasks ADD COLUMN source TEXT DEFAULT 'regular';
    RAISE NOTICE '✓ source kolom toegevoegd';
  END IF;

  -- energy_level
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'energy_level'
  ) THEN
    ALTER TABLE tasks ADD COLUMN energy_level TEXT DEFAULT 'medium';
    RAISE NOTICE '✓ energy_level kolom toegevoegd';
  END IF;

  -- estimated_duration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'estimated_duration'
  ) THEN
    ALTER TABLE tasks ADD COLUMN estimated_duration INTEGER;
    RAISE NOTICE '✓ estimated_duration kolom toegevoegd';
  END IF;
END $$;

-- Stap 5: Herstel RLS policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Stap 6: Herstel indexes
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_done_idx ON tasks(done);
CREATE INDEX IF NOT EXISTS tasks_due_at_idx ON tasks(due_at);
CREATE INDEX IF NOT EXISTS tasks_user_done_idx ON tasks(user_id, done);
CREATE INDEX IF NOT EXISTS tasks_not_today_idx ON tasks(user_id, not_today);
CREATE INDEX IF NOT EXISTS tasks_source_idx ON tasks(user_id, source);

-- Stap 7: Herstel updated_at trigger
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Stap 8: Verifieer alle kolommen
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- Stap 9: Test query (verwijder deze na testen)
-- SELECT COUNT(*) as total_tasks FROM tasks;

