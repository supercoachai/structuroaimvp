-- Magic-link gebruikers kiezen na onboarding een wachtwoord voor terugkerende login.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_setup_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.password_setup_completed IS
  'True nadat de gebruiker een inlogwachtwoord heeft gekozen.';

-- Bestaande gebruikers niet opnieuw door de post-onboarding stap sturen.
UPDATE public.profiles
SET password_setup_completed = true
WHERE onboarding_completed = true;
