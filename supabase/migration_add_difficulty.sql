-- Migration: Voeg difficulty kolom toe aan tasks tabel
-- Run dit script in je Supabase SQL Editor

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'difficulty'
  ) THEN
    ALTER TABLE tasks 
    ADD COLUMN difficulty TEXT DEFAULT 'auto'; -- 'auto', 'easy', 'medium', 'hard'
    
    RAISE NOTICE '✓ difficulty kolom toegevoegd aan tasks tabel';
  ELSE
    RAISE NOTICE '✓ difficulty kolom bestaat al';
  END IF;
END $$;
