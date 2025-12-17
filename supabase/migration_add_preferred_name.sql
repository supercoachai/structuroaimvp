-- Migration: Voeg preferred_name kolom toe aan profiles tabel
-- Run dit script in je Supabase SQL Editor

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'preferred_name'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN preferred_name TEXT;
    
    RAISE NOTICE '✓ preferred_name kolom toegevoegd aan profiles tabel';
  ELSE
    RAISE NOTICE '✓ preferred_name kolom bestaat al';
  END IF;
END $$;
