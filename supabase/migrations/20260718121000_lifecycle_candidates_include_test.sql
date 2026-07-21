-- Include is_test in candidate view; app filtert audience (off/test/all).
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
  ) AS last_checkin_date
FROM public.profiles p
INNER JOIN auth.users u ON u.id = p.id
WHERE u.email IS NOT NULL
  AND length(trim(u.email)) > 0
  AND coalesce(p.unsubscribe_lifecycle, false) = false
  AND coalesce(p.subscription_status, 'none') NOT IN ('active', 'trialing');

COMMENT ON VIEW public.lifecycle_candidates_v1 IS
  'Lifecycle candidates. App filtert audience: off (default) / test / all. V1 merkt niets tot ALLOW_V1.';

REVOKE ALL ON public.lifecycle_candidates_v1 FROM PUBLIC;
REVOKE ALL ON public.lifecycle_candidates_v1 FROM anon;
REVOKE ALL ON public.lifecycle_candidates_v1 FROM authenticated;
GRANT SELECT ON public.lifecycle_candidates_v1 TO service_role;
