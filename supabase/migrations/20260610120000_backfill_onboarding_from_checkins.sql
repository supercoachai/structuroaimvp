-- Gebruikers die ooit een dagstart deden zijn per definitie geactiveerd.
UPDATE public.profiles
SET
  onboarding_completed = true,
  onboarding_version = GREATEST(COALESCE(onboarding_version, 0), 2),
  updated_at = now()
WHERE onboarding_completed IS NOT TRUE
  AND id IN (
    SELECT DISTINCT user_id
    FROM public.daily_checkins
    WHERE user_id IS NOT NULL
  );
