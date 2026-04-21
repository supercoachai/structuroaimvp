-- onboarding_version: welke intro de gebruiker heeft afgerond (integer, oplopend bij nieuwe flows).
-- NULL of waarde < app-versie → middleware stuurt naar /onboarding.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'onboarding_version'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN onboarding_version INTEGER;
    RAISE NOTICE 'profiles.onboarding_version toegevoegd';
  ELSE
    RAISE NOTICE 'profiles.onboarding_version bestaat al';
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.onboarding_version IS
  'Afgeronde onboarding-flowversie (min. 2 voor huidige intro); NULL = nog niet op nieuwe versie.';
