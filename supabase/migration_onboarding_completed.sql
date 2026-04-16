-- onboarding_completed: eerste dagstart afgerond → geen onboarding-copy meer
-- Run in Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'profiles.onboarding_completed toegevoegd';
  ELSE
    RAISE NOTICE 'profiles.onboarding_completed bestaat al';
  END IF;
END $$;

-- Bestaande gebruikers die de oude onboarding al zagen: niet opnieuw lastig vallen
UPDATE public.profiles
SET onboarding_completed = TRUE
WHERE COALESCE(has_seen_onboarding, FALSE) = TRUE
  AND COALESCE(onboarding_completed, FALSE) = FALSE;
