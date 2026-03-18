-- Voeg category toe aan tasks + onboarding status aan profiles
-- Run in Supabase Dashboard → SQL Editor

-- 1) Tasks: category (text, default 'werk')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tasks'
      AND column_name = 'category'
  ) THEN
    ALTER TABLE tasks
      ADD COLUMN category TEXT DEFAULT 'werk';
    RAISE NOTICE '✓ tasks.category kolom toegevoegd';
  ELSE
    RAISE NOTICE '✓ tasks.category kolom bestaat al';
  END IF;
END $$;

-- 2) Profiles: has_seen_onboarding (boolean, default false)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name = 'has_seen_onboarding'
  ) THEN
    ALTER TABLE profiles
      ADD COLUMN has_seen_onboarding BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✓ profiles.has_seen_onboarding kolom toegevoegd';
  ELSE
    RAISE NOTICE '✓ profiles.has_seen_onboarding kolom bestaat al';
  END IF;
END $$;

