-- V2 card-cohort (na 2026-07-28): geen legacy 3-dagen app-trial meer.
-- expire_trials() zette none → trial_expired ook zonder Stripe; dat verwart metrics.
-- Spiegel: src/lib/stripe/v2CardTrial.ts + trialConfig event-bronnen + gift_comp.

CREATE OR REPLACE FUNCTION public.profile_skips_legacy_app_trial(
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
    AND p_created_at >= timestamptz '2026-07-28T08:00:00+00'
    AND lower(trim(coalesce(p_signup_source, ''))) NOT IN (
      'adhd_cafe',
      'jasper_podcast',
      'gift_comp'
    );
$$;

COMMENT ON FUNCTION public.profile_skips_legacy_app_trial(timestamptz, text) IS
  'V2 card-cohort zonder event/gift: geen legacy app-trial (spiegel v2CardTrial.ts).';

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
  CASE
    WHEN public.profile_skips_legacy_app_trial(p_created_at, p_signup_source) THEN false
    ELSE (
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
      )
    )
  END;
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
    AND NOT public.profile_skips_legacy_app_trial(p.created_at, p.signup_source)
    AND NOT public.profile_has_active_app_trial(
      p.created_at,
      p.signup_source,
      p.app_trial_override_until
    );
$$;

-- Corrigeer v2-cohort die ten onrechte trial_expired kregen zonder Stripe-abonnement.
UPDATE public.profiles p
SET
  subscription_status = 'none',
  updated_at = now()
WHERE p.subscription_status = 'trial_expired'
  AND public.profile_skips_legacy_app_trial(p.created_at, p.signup_source)
  AND (
    p.stripe_subscription_id IS NULL
    OR trim(p.stripe_subscription_id) = ''
  );
