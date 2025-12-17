-- Migration: Voeg micro_steps kolom toe aan tasks tabel als deze nog niet bestaat
-- Run dit script in je Supabase SQL Editor

-- Voeg micro_steps kolom toe als deze nog niet bestaat
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'micro_steps'
  ) THEN
    ALTER TABLE tasks 
    ADD COLUMN micro_steps JSONB DEFAULT '[]'::jsonb;
    
    RAISE NOTICE 'micro_steps kolom toegevoegd aan tasks tabel';
  ELSE
    RAISE NOTICE 'micro_steps kolom bestaat al';
  END IF;
END $$;

-- Voeg not_today kolom toe als deze nog niet bestaat
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'not_today'
  ) THEN
    ALTER TABLE tasks 
    ADD COLUMN not_today BOOLEAN DEFAULT FALSE;
    
    RAISE NOTICE 'not_today kolom toegevoegd aan tasks tabel';
  ELSE
    RAISE NOTICE 'not_today kolom bestaat al';
  END IF;
END $$;

-- Verifieer dat de kolommen bestaan
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('micro_steps', 'not_today')
ORDER BY column_name;

