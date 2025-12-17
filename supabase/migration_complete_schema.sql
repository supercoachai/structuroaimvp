-- Complete Schema Migration: Zorg dat alle kolommen bestaan
-- Run dit script in je Supabase SQL Editor om alle ontbrekende kolommen toe te voegen

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
    
    RAISE NOTICE '✓ micro_steps kolom toegevoegd';
  ELSE
    RAISE NOTICE '✓ micro_steps kolom bestaat al';
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
    
    RAISE NOTICE '✓ not_today kolom toegevoegd';
  ELSE
    RAISE NOTICE '✓ not_today kolom bestaat al';
  END IF;
END $$;

-- Voeg source kolom toe als deze nog niet bestaat
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE tasks 
    ADD COLUMN source TEXT DEFAULT 'regular';
    
    RAISE NOTICE '✓ source kolom toegevoegd';
  ELSE
    RAISE NOTICE '✓ source kolom bestaat al';
  END IF;
END $$;

-- Voeg energy_level kolom toe als deze nog niet bestaat
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'energy_level'
  ) THEN
    ALTER TABLE tasks 
    ADD COLUMN energy_level TEXT DEFAULT 'medium';
    
    RAISE NOTICE '✓ energy_level kolom toegevoegd';
  ELSE
    RAISE NOTICE '✓ energy_level kolom bestaat al';
  END IF;
END $$;

-- Voeg estimated_duration kolom toe als deze nog niet bestaat
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'estimated_duration'
  ) THEN
    ALTER TABLE tasks 
    ADD COLUMN estimated_duration INTEGER;
    
    RAISE NOTICE '✓ estimated_duration kolom toegevoegd';
  ELSE
    RAISE NOTICE '✓ estimated_duration kolom bestaat al';
  END IF;
END $$;

-- Verifieer alle kolommen
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

