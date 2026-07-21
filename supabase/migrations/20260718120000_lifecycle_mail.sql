-- Lifecycle mail: opt-out + idempotent send-log + candidate view.
-- Triggers/segmentatie in app (src/lib/lifecycleMail); Supabase = ground truth.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unsubscribe_lifecycle boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.unsubscribe_lifecycle IS
  'True = geen lifecycle-mails meer (AVG opt-out). Service-role of unsubscribe-token.';

CREATE TABLE IF NOT EXISTS public.lifecycle_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  cohort_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_id, cohort_key)
);

CREATE INDEX IF NOT EXISTS lifecycle_email_log_user_id_idx
  ON public.lifecycle_email_log (user_id);

CREATE INDEX IF NOT EXISTS lifecycle_email_log_template_sent_idx
  ON public.lifecycle_email_log (template_id, sent_at DESC);

COMMENT ON TABLE public.lifecycle_email_log IS
  'Idempotentie voor lifecycle-mails: (user_id, template_id, cohort_key) uniek.';

ALTER TABLE public.lifecycle_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages lifecycle email log"
  ON public.lifecycle_email_log;

CREATE POLICY "Service role manages lifecycle email log"
  ON public.lifecycle_email_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON public.lifecycle_email_log FROM PUBLIC;
REVOKE ALL ON public.lifecycle_email_log FROM anon;
REVOKE ALL ON public.lifecycle_email_log FROM authenticated;
GRANT ALL ON public.lifecycle_email_log TO service_role;

-- Candidate view: profiles + auth email + checkin aggregates.
-- Alleen service_role (auth.users join).
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
  'Lifecycle candidates (geen paid/trialing, geen unsubscribe). Audience off/test/all filtert in app; default off = v1 merkt niets.';

REVOKE ALL ON public.lifecycle_candidates_v1 FROM PUBLIC;
REVOKE ALL ON public.lifecycle_candidates_v1 FROM anon;
REVOKE ALL ON public.lifecycle_candidates_v1 FROM authenticated;
GRANT SELECT ON public.lifecycle_candidates_v1 TO service_role;
