-- Voornaam / aanspreeknaam in profiles (naast preferred_name voor bestaande data)
-- Run in Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
    RAISE NOTICE 'profiles.display_name toegevoegd';
  ELSE
    RAISE NOTICE 'profiles.display_name bestaat al';
  END IF;
END $$;
