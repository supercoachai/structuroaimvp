-- Handmatige app-trialverlenging per profiel (compensatie bij bugs).
-- Service_role schrijft app_trial_override_until; authenticated mag alleen lezen
-- (bewust niet in UPDATE-grant van 20260611120000_profiles_protect_subscription_columns).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_trial_override_until timestamptz NULL;

COMMENT ON COLUMN public.profiles.app_trial_override_until IS
  'Trial actief tot dit moment, los van created_at/signup_source. Alleen service_role schrijft; NULL = geen override.';

GRANT SELECT (app_trial_override_until) ON public.profiles TO authenticated;

DROP FUNCTION IF EXISTS public.profile_has_active_app_trial(timestamptz, text);

CREATE OR REPLACE FUNCTION public.profile_has_active_app_trial(
  p_created_at timestamptz,
  p_signup_source text,
  p_app_trial_override_until timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    (p_app_trial_override_until IS NOT NULL AND now() < p_app_trial_override_until)
    OR (
      p_created_at IS NOT NULL
      AND now() < (
        p_created_at + (
          CASE
            WHEN lower(trim(coalesce(p_signup_source, ''))) = 'adhd_cafe'
              AND (now() AT TIME ZONE 'UTC')::date <= DATE '2026-12-31'
              THEN interval '14 days'
            WHEN lower(trim(coalesce(p_signup_source, ''))) = 'jasper_podcast'
              THEN interval '7 days'
            ELSE interval '3 days'
          END
        )
      )
    );
$$;

COMMENT ON FUNCTION public.profile_has_active_app_trial(timestamptz, text, timestamptz) IS
  'App-trial actief? Override wint; anders duur per signup_source (spiegel trialConfig.ts).';

CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.profiles p
  SET
    subscription_status = 'trial_expired',
    updated_at = now()
  WHERE p.subscription_status = 'none'
    AND NOT public.profile_has_launch_grace(p.created_at, p.last_dagstart_date)
    AND NOT public.profile_has_active_app_trial(
      p.created_at,
      p.signup_source,
      p.app_trial_override_until
    );
$$;

-- Jasper-luisteraars: 7 compensatiedagen t/m 13 juli 2026 23:59:59 Europe/Amsterdam
UPDATE public.profiles
SET
  app_trial_override_until = (
    TIMESTAMP '2026-07-13 23:59:59' AT TIME ZONE 'Europe/Amsterdam'
  ),
  subscription_status = CASE
    WHEN subscription_status = 'trial_expired' THEN 'none'
    ELSE subscription_status
  END,
  updated_at = now()
WHERE lower(trim(email)) IN (
  'ozin1137@gmail.com',
  'lisettevanoorschot@gmail.com',
  'florianwagt@gmail.com',
  'mirandapompert@gmail.com',
  'johannesvanzessen@gmail.com',
  'pacvermaire@proton.me'
)
AND lower(trim(coalesce(signup_source, ''))) = 'jasper_podcast';
