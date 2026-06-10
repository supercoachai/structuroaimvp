-- Trial expiry: flip app-managed trials (status 'none') naar trial_expired.
-- Spiegelt profileHasAppAccessOrGrace + launchGrace + freeTrial + eventSignupTrial.
-- Helpers eerst: expire_trials() roept ze aan.

-- Launch grace (mirror launchGrace.ts)
CREATE OR REPLACE FUNCTION public.profile_has_launch_grace(
  p_created_at timestamptz,
  p_last_dagstart_date date
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    p_created_at IS NOT NULL
    AND (p_created_at AT TIME ZONE 'Europe/Amsterdam')::date < DATE '2026-05-31'
    AND p_last_dagstart_date IS NOT NULL
    AND p_last_dagstart_date >= DATE '2026-04-19'
    AND (now() AT TIME ZONE 'Europe/Amsterdam')::date <= DATE '2026-06-30';
$$;

-- Actieve app-proefperiode: 3 dagen default, 14 dagen voor adhd_cafe
CREATE OR REPLACE FUNCTION public.profile_has_active_app_trial(
  p_created_at timestamptz,
  p_signup_source text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    p_created_at IS NOT NULL
    AND now() < (
      p_created_at + (
        CASE
          WHEN lower(trim(coalesce(p_signup_source, ''))) = 'adhd_cafe'
            THEN interval '14 days'
          ELSE interval '3 days'
        END
      )
    );
$$;

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
    AND NOT public.profile_has_active_app_trial(p.created_at, p.signup_source);
$$;

REVOKE EXECUTE ON FUNCTION public.expire_trials() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_trials() FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_trials() FROM authenticated;

COMMENT ON FUNCTION public.expire_trials() IS
  'Zet verlopen app-trials (none) naar trial_expired; respecteert launch grace en event-trial duur.';

-- Testaccount-filter voor analytics (handmatig is_test=true zetten)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_test IS
  'Handmatig true voor testaccounts; analytics-events worden overgeslagen.';

-- pg_cron (indien extensie beschikbaar; anders Vercel Cron /api/cron/expire-trials)
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('structuro_expire_trials');
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'structuro_expire_trials',
      '*/30 * * * *',
      $$SELECT public.expire_trials();$$
    );
  END IF;
END;
$do$;
