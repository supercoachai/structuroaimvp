-- P0 activatie-funnel op profiles (betrouwbaarder dan PostHog bij kleine volumes).
-- Alleen via service role / admin RPC.

CREATE OR REPLACE FUNCTION public.admin_activation_funnel_summary(p_days integer DEFAULT 90)
RETURNS TABLE (
  window_days integer,
  accounts integer,
  signed_in integer,
  has_task integer,
  onboarding_completed integer,
  first_dagstart integer,
  same_day_dagstart integer,
  password_setup integer,
  pct_signed_in numeric,
  pct_has_task numeric,
  pct_onboarding numeric,
  pct_dagstart numeric,
  pct_same_day_dagstart numeric,
  pct_password numeric,
  median_minutes_to_onboarding numeric,
  median_minutes_to_dagstart numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH bounds AS (
    SELECT
      GREATEST(p_days, 1) AS days,
      NOW() - (GREATEST(p_days, 1) || ' days')::interval AS since
  ),
  cohort AS (
    SELECT
      p.id,
      p.created_at,
      u.last_sign_in_at IS NOT NULL AS signed_in,
      EXISTS (SELECT 1 FROM public.tasks t WHERE t.user_id = p.id) AS has_task,
      p.onboarding_completed = true AS onboarding_done,
      p.last_dagstart_date IS NOT NULL AS ever_dagstart,
      p.last_dagstart_date = (p.created_at AT TIME ZONE 'Europe/Amsterdam')::date AS same_day_dagstart,
      p.password_setup_completed = true AS password_done,
      p.dagstart_completed_at,
      p.updated_at
    FROM public.profiles p
    CROSS JOIN bounds b
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE COALESCE(p.is_test, false) = false
      AND p.created_at >= b.since
  ),
  counts AS (
    SELECT
      COUNT(c.id)::integer AS accounts,
      COUNT(c.id) FILTER (WHERE c.signed_in)::integer AS signed_in,
      COUNT(c.id) FILTER (WHERE c.has_task)::integer AS has_task,
      COUNT(c.id) FILTER (WHERE c.onboarding_done)::integer AS onboarding_completed,
      COUNT(c.id) FILTER (WHERE c.ever_dagstart)::integer AS first_dagstart,
      COUNT(c.id) FILTER (WHERE c.same_day_dagstart)::integer AS same_day_dagstart,
      COUNT(c.id) FILTER (WHERE c.password_done)::integer AS password_setup
    FROM cohort c
  ),
  timing AS (
    SELECT
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (c.dagstart_completed_at - c.created_at)) / 60.0
      ) AS median_minutes_to_onboarding
    FROM cohort c
    WHERE c.onboarding_done AND c.dagstart_completed_at IS NOT NULL
  ),
  dag_timing AS (
    SELECT
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (c.dagstart_completed_at - c.created_at)) / 60.0
      ) AS median_minutes_to_dagstart
    FROM cohort c
    WHERE c.ever_dagstart AND c.dagstart_completed_at IS NOT NULL
  )
  SELECT
    b.days::integer AS window_days,
    cnt.accounts,
    cnt.signed_in,
    cnt.has_task,
    cnt.onboarding_completed,
    cnt.first_dagstart,
    cnt.same_day_dagstart,
    cnt.password_setup,
    ROUND(100.0 * cnt.signed_in / NULLIF(cnt.accounts, 0), 1) AS pct_signed_in,
    ROUND(100.0 * cnt.has_task / NULLIF(cnt.accounts, 0), 1) AS pct_has_task,
    ROUND(100.0 * cnt.onboarding_completed / NULLIF(cnt.accounts, 0), 1) AS pct_onboarding,
    ROUND(100.0 * cnt.first_dagstart / NULLIF(cnt.accounts, 0), 1) AS pct_dagstart,
    ROUND(100.0 * cnt.same_day_dagstart / NULLIF(cnt.accounts, 0), 1) AS pct_same_day_dagstart,
    ROUND(100.0 * cnt.password_setup / NULLIF(cnt.accounts, 0), 1) AS pct_password,
    ROUND(t.median_minutes_to_onboarding::numeric, 1) AS median_minutes_to_onboarding,
    ROUND(d.median_minutes_to_dagstart::numeric, 1) AS median_minutes_to_dagstart
  FROM bounds b
  CROSS JOIN counts cnt
  LEFT JOIN timing t ON true
  LEFT JOIN dag_timing d ON true;
$$;

CREATE OR REPLACE FUNCTION public.admin_activation_funnel_weekly(p_days integer DEFAULT 90)
RETURNS TABLE (
  week_start date,
  signups integer,
  onboarding integer,
  dagstart integer,
  dagstart_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH bounds AS (
    SELECT NOW() - (GREATEST(p_days, 1) || ' days')::interval AS since
  )
  SELECT
    date_trunc('week', p.created_at AT TIME ZONE 'Europe/Amsterdam')::date AS week_start,
    COUNT(*)::integer AS signups,
    COUNT(*) FILTER (WHERE p.onboarding_completed)::integer AS onboarding,
    COUNT(*) FILTER (WHERE p.last_dagstart_date IS NOT NULL)::integer AS dagstart,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE p.last_dagstart_date IS NOT NULL) / NULLIF(COUNT(*), 0),
      1
    ) AS dagstart_pct
  FROM public.profiles p
  CROSS JOIN bounds b
  WHERE COALESCE(p.is_test, false) = false
    AND p.created_at >= b.since
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_activation_funnel_by_source(p_days integer DEFAULT 90)
RETURNS TABLE (
  signup_source text,
  signups integer,
  onboarding integer,
  dagstart integer,
  dagstart_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH bounds AS (
    SELECT NOW() - (GREATEST(p_days, 1) || ' days')::interval AS since
  )
  SELECT
    COALESCE(NULLIF(TRIM(p.signup_source), ''), '(onbekend)') AS signup_source,
    COUNT(*)::integer AS signups,
    COUNT(*) FILTER (WHERE p.onboarding_completed)::integer AS onboarding,
    COUNT(*) FILTER (WHERE p.last_dagstart_date IS NOT NULL)::integer AS dagstart,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE p.last_dagstart_date IS NOT NULL) / NULLIF(COUNT(*), 0),
      1
    ) AS dagstart_pct
  FROM public.profiles p
  CROSS JOIN bounds b
  WHERE COALESCE(p.is_test, false) = false
    AND p.created_at >= b.since
  GROUP BY 1
  ORDER BY signups DESC, signup_source;
$$;

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
      WHEN b.onboarding_completed THEN 'onboarding_klaar'
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

REVOKE ALL ON FUNCTION public.admin_activation_funnel_summary(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_activation_funnel_summary(integer) FROM anon;
REVOKE ALL ON FUNCTION public.admin_activation_funnel_summary(integer) FROM authenticated;

REVOKE ALL ON FUNCTION public.admin_activation_funnel_weekly(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_activation_funnel_weekly(integer) FROM anon;
REVOKE ALL ON FUNCTION public.admin_activation_funnel_weekly(integer) FROM authenticated;

REVOKE ALL ON FUNCTION public.admin_activation_funnel_by_source(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_activation_funnel_by_source(integer) FROM anon;
REVOKE ALL ON FUNCTION public.admin_activation_funnel_by_source(integer) FROM authenticated;

REVOKE ALL ON FUNCTION public.admin_activation_funnel_users(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_activation_funnel_users(integer) FROM anon;
REVOKE ALL ON FUNCTION public.admin_activation_funnel_users(integer) FROM authenticated;
