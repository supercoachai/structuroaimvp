-- Splits de drop-bucket 'onboarding_klaar' op zodat accounts die wel onboarding
-- afmaakten maar nog geen dagstart hebben gedaan (zoals Carlijn) niet meer
-- onterecht als "Onboarding afgerond" tellen. Voor de bestaande consumenten
-- (jarvis/briefing en /activiteit/funnel) blijft `'onboarding_klaar'` betekenen:
-- onboarding voltooid + minstens 1 dagstart. De nieuwe bucket
-- `'onboarding_klaar_zonder_dagstart'` vangt het gat dat anders onzichtbaar
-- bleef in admin_activation_funnel_users.drop_bucket.

CREATE OR REPLACE FUNCTION public.admin_activation_funnel_users(p_days integer DEFAULT 90)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  signup_source text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  last_seen_at timestamptz,
  onboarding_completed boolean,
  last_dagstart_date date,
  dagstart_completed_at timestamptz,
  password_setup_completed boolean,
  task_count integer,
  drop_bucket text,
  minutes_to_onboarding numeric,
  minutes_to_dagstart numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH bounds AS (
    SELECT NOW() - (GREATEST(p_days, 1) || ' days')::interval AS since
  ),
  base AS (
    SELECT
      p.id,
      p.email,
      p.display_name,
      p.signup_source,
      p.created_at,
      u.last_sign_in_at,
      p.last_seen_at,
      p.onboarding_completed,
      p.last_dagstart_date,
      p.dagstart_completed_at,
      p.password_setup_completed,
      p.updated_at,
      COALESCE(tc.cnt, 0)::integer AS task_count
    FROM public.profiles p
    CROSS JOIN bounds b
    LEFT JOIN auth.users u ON u.id = p.id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::integer AS cnt
      FROM public.tasks t
      WHERE t.user_id = p.id
    ) tc ON true
    WHERE COALESCE(p.is_test, false) = false
      AND p.created_at >= b.since
  )
  SELECT
    b.id AS user_id,
    b.email,
    b.display_name,
    b.signup_source,
    b.created_at,
    b.last_sign_in_at,
    b.last_seen_at,
    b.onboarding_completed,
    b.last_dagstart_date,
    b.dagstart_completed_at,
    b.password_setup_completed,
    b.task_count,
    CASE
      WHEN b.onboarding_completed AND b.last_dagstart_date IS NOT NULL THEN 'onboarding_klaar'
      WHEN b.onboarding_completed THEN 'onboarding_klaar_zonder_dagstart'
      WHEN b.task_count > 0 THEN 'onboarding_gestart_niet_af'
      WHEN b.last_seen_at IS NOT NULL THEN 'app_geopend_geen_taak'
      WHEN b.last_sign_in_at IS NOT NULL THEN 'signup_geen_app'
      ELSE 'nooit_terug'
    END AS drop_bucket,
    CASE
      WHEN b.onboarding_completed AND b.dagstart_completed_at IS NOT NULL THEN
        ROUND((EXTRACT(EPOCH FROM (b.dagstart_completed_at - b.created_at)) / 60.0)::numeric, 1)
      ELSE NULL
    END AS minutes_to_onboarding,
    CASE
      WHEN b.dagstart_completed_at IS NOT NULL THEN
        ROUND((EXTRACT(EPOCH FROM (b.dagstart_completed_at - b.created_at)) / 60.0)::numeric, 1)
      ELSE NULL
    END AS minutes_to_dagstart
  FROM base b
  ORDER BY b.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_activation_funnel_users(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_activation_funnel_users(integer) FROM anon;
REVOKE ALL ON FUNCTION public.admin_activation_funnel_users(integer) FROM authenticated;
