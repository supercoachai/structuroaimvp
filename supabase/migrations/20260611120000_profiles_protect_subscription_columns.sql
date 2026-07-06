-- Bescherm subscription/stripe-kolommen op profiles tegen client-side writes.
-- Live PoC (jun 2026): authenticated kon subscription_status en stripe_* zelf wijzigen.
-- Fix: tabel-brede GRANTs intrekken, alleen kolommen die de app echt schrijft teruggeven.
-- Geverifieerd op payload-niveau in src (geen spread van user-input naar subscription-kolommen).

REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
REVOKE INSERT, UPDATE ON public.profiles FROM anon;

GRANT INSERT (
  id,
  display_name,
  preferred_name,
  email,
  onboarding_completed,
  onboarding_version
) ON public.profiles TO authenticated;

GRANT UPDATE (
  display_name,
  preferred_name,
  email,
  onboarding_completed,
  onboarding_version,
  last_dagstart_date,
  dagstart_energy,
  dagstart_completed_at,
  dismissed_info_keys,
  cycle_tracking_consent_at,
  cycle_last_period_start,
  cycle_average_length,
  cycle_menstruation_duration,
  signup_source,
  signup_utm_campaign,
  last_seen_at
) ON public.profiles TO authenticated;

COMMENT ON TABLE public.profiles IS
  'User profile. Subscription/stripe-kolommen alleen via service_role (webhook/sync). Kolommen alleen SELECT voor authenticated: app_trial_override_until (zie 20260706160000).';
