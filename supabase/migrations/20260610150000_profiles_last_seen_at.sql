-- DAU-signaal: laatste geauthenticeerde app-request (middleware, max 1x per 15 min).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_last_seen_at_idx
  ON public.profiles (last_seen_at DESC);

COMMENT ON COLUMN public.profiles.last_seen_at IS
  'Laatste geauthenticeerde app-request (middleware, max 1x per 15 min). Voor DAU-meting.';

-- Dagelijks activiteitenoverzicht (alleen via service role / admin RPC).
CREATE OR REPLACE FUNCTION public.admin_daily_activity_report(p_date date DEFAULT (NOW() AT TIME ZONE 'Europe/Amsterdam')::date)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  subscription_status text,
  last_seen_at timestamptz,
  last_login_at timestamptz,
  account_created_today boolean,
  dagstart boolean,
  checkin_energy text,
  top3_count integer,
  tasks_created integer,
  tasks_completed integer,
  shutdown boolean,
  app_opened boolean,
  engaged boolean,
  core_loop_complete boolean,
  last_activity_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH bounds AS (
    SELECT
      p_date AS d,
      (p_date::timestamp AT TIME ZONE 'Europe/Amsterdam') AS start_local,
      ((p_date + 1)::timestamp AT TIME ZONE 'Europe/Amsterdam') AS end_local
  )
  SELECT
    p.id AS user_id,
    p.email,
    p.display_name,
    p.subscription_status,
    p.last_seen_at,
    u.last_sign_in_at AS last_login_at,
    ((p.created_at AT TIME ZONE 'Europe/Amsterdam')::date = b.d) AS account_created_today,
    (COALESCE(p.last_dagstart_date = b.d, false) OR dc.id IS NOT NULL) AS dagstart,
    dc.energy_level AS checkin_energy,
    COALESCE(array_length(dc.top3_task_ids, 1), 0)::integer AS top3_count,
    COALESCE(tc.cnt, 0)::integer AS tasks_created,
    COALESCE(td.cnt, 0)::integer AS tasks_completed,
    (ds.id IS NOT NULL) AS shutdown,
    (
      p.last_seen_at IS NOT NULL
      AND (p.last_seen_at AT TIME ZONE 'Europe/Amsterdam')::date = b.d
    ) AS app_opened,
    (
      (p.created_at >= b.start_local AND p.created_at < b.end_local)
      OR (p.last_seen_at >= b.start_local AND p.last_seen_at < b.end_local)
      OR (u.last_sign_in_at >= b.start_local AND u.last_sign_in_at < b.end_local)
      OR dc.id IS NOT NULL
      OR COALESCE(tc.cnt, 0) > 0
      OR COALESCE(td.cnt, 0) > 0
      OR ds.id IS NOT NULL
      OR (p.last_dagstart_date = b.d)
    ) AS engaged,
    (
      (COALESCE(p.last_dagstart_date = b.d, false) OR dc.id IS NOT NULL)
      AND COALESCE(td.cnt, 0) > 0
      AND (ds.id IS NOT NULL)
    ) AS core_loop_complete,
    GREATEST(
      p.last_seen_at,
      u.last_sign_in_at,
      p.dagstart_completed_at,
      tc.latest,
      td.latest,
      ds.created_at
    ) AS last_activity_at
  FROM public.profiles p
  CROSS JOIN bounds b
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.daily_checkins dc ON dc.user_id = p.id AND dc.date = b.d
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS cnt, MAX(t.created_at) AS latest
    FROM public.tasks t
    WHERE t.user_id = p.id
      AND t.created_at >= b.start_local
      AND t.created_at < b.end_local
  ) tc ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS cnt, MAX(t.completed_at) AS latest
    FROM public.tasks t
    WHERE t.user_id = p.id
      AND t.completed_at IS NOT NULL
      AND t.completed_at >= b.start_local
      AND t.completed_at < b.end_local
  ) td ON true
  LEFT JOIN public.daily_shutdowns ds ON ds.user_id = p.id AND ds.date = b.d
  WHERE COALESCE(p.is_test, false) = false
    AND (
      (p.last_seen_at >= b.start_local AND p.last_seen_at < b.end_local)
      OR (p.created_at >= b.start_local AND p.created_at < b.end_local)
      OR (u.last_sign_in_at >= b.start_local AND u.last_sign_in_at < b.end_local)
      OR dc.id IS NOT NULL
      OR COALESCE(tc.cnt, 0) > 0
      OR COALESCE(td.cnt, 0) > 0
      OR ds.id IS NOT NULL
      OR p.last_dagstart_date = b.d
    )
  ORDER BY last_activity_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.admin_daily_activity_report(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_daily_activity_report(date) FROM anon;
REVOKE ALL ON FUNCTION public.admin_daily_activity_report(date) FROM authenticated;
