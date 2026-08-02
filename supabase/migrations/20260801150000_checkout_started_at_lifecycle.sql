-- Checkout-abandon recovery: ground truth voor "kaartstap bereikt, geen trial".
-- Gezet bij Stripe checkout-session / paywall-intent; lifecycle leest via candidates-view.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS checkout_started_at timestamptz;

COMMENT ON COLUMN public.profiles.checkout_started_at IS
  'Eerste keer dat de user de card-checkout-/abonnement-stap bereikte. Null = nooit. Voor lifecycle checkout-recover.';

CREATE OR REPLACE VIEW public.lifecycle_candidates_v1
WITH (security_invoker = false)
AS
SELECT
  p.id AS user_id,
  u.email,
  coalesce(nullif(trim(p.preferred_name), ''), nullif(trim(p.display_name), '')) AS preferred_name,
  p.created_at,
  p.signup_source,
  p.subscription_status,
  p.subscription_current_period_end,
  p.last_dagstart_date,
  p.unsubscribe_lifecycle,
  coalesce(p.is_test, false) AS is_test,
  p.app_trial_override_until,
  (
    SELECT count(*)::int
    FROM public.daily_checkins c
    WHERE c.user_id = p.id
  ) AS checkin_count,
  (
    SELECT max(c.date)
    FROM public.daily_checkins c
    WHERE c.user_id = p.id
  ) AS last_checkin_date,
  p.checkout_started_at
FROM public.profiles p
INNER JOIN auth.users u ON u.id = p.id
WHERE u.email IS NOT NULL
  AND length(trim(u.email)) > 0
  AND coalesce(p.unsubscribe_lifecycle, false) = false
  AND coalesce(p.subscription_status, 'none') <> 'active';

COMMENT ON VIEW public.lifecycle_candidates_v1 IS
  'Lifecycle candidates (geen active). Trialling blijft erin voor 7d card-trial drip. checkout_started_at voor abandon-recover.';

REVOKE ALL ON public.lifecycle_candidates_v1 FROM PUBLIC;
REVOKE ALL ON public.lifecycle_candidates_v1 FROM anon;
REVOKE ALL ON public.lifecycle_candidates_v1 FROM authenticated;
GRANT SELECT ON public.lifecycle_candidates_v1 TO service_role;
