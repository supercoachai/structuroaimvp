-- Optioneel: synchroniseer analytics-toestemming met ingelogde gebruiker (cross-device).
-- Run in Supabase Dashboard → SQL Editor als je profiel-sync wilt.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'analytics_consent'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN analytics_consent TEXT
      CHECK (analytics_consent IS NULL OR analytics_consent IN ('granted', 'denied'));
    RAISE NOTICE '✓ profiles.analytics_consent toegevoegd';
  ELSE
    RAISE NOTICE '✓ profiles.analytics_consent bestaat al';
  END IF;
END $$;
