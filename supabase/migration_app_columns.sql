-- Ontbrekende kolommen voor app-compatibiliteit (tasks)
-- Run in Supabase SQL Editor na schema.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'started') THEN
    ALTER TABLE tasks ADD COLUMN started BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✓ tasks.started toegevoegd';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'is_deadline') THEN
    ALTER TABLE tasks ADD COLUMN is_deadline BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✓ tasks.is_deadline toegevoegd';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'category') THEN
    ALTER TABLE tasks ADD COLUMN category TEXT;
    RAISE NOTICE '✓ tasks.category toegevoegd';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'repeat_until') THEN
    ALTER TABLE tasks ADD COLUMN repeat_until TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✓ tasks.repeat_until toegevoegd';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'repeat_weekdays') THEN
    ALTER TABLE tasks ADD COLUMN repeat_weekdays TEXT DEFAULT 'all';
    RAISE NOTICE '✓ tasks.repeat_weekdays toegevoegd';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'repeat_exclude_dates') THEN
    ALTER TABLE tasks ADD COLUMN repeat_exclude_dates JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE '✓ tasks.repeat_exclude_dates toegevoegd';
  END IF;
END $$;
