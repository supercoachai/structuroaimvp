-- Account-delete completeness, AI-quota hardening, performance-indexen.

-- 1. Verwijder ai_daily_usage bij account-delete
CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM tasks                         WHERE user_id = p_user_id;
  DELETE FROM daily_checkins                WHERE user_id = p_user_id;
  DELETE FROM daily_shutdowns               WHERE user_id = p_user_id;
  DELETE FROM parked_thoughts               WHERE user_id = p_user_id;
  DELETE FROM user_insights                 WHERE user_id = p_user_id;
  DELETE FROM push_subscriptions            WHERE user_id = p_user_id;
  DELETE FROM shutdown_reminder_sends       WHERE user_id = p_user_id;
  DELETE FROM daystart_reminder_sends       WHERE user_id = p_user_id;
  DELETE FROM daystart_lunch_reminder_sends WHERE user_id = p_user_id;
  DELETE FROM ai_daily_usage                WHERE user_id = p_user_id;
  DELETE FROM profiles                      WHERE id      = p_user_id;

  INSERT INTO account_deletion_audit (user_id_hash)
  VALUES (encode(digest(p_user_id::text, 'sha256'), 'hex'));
END;
$$;

-- 2. AI-quota: server-side cap + peek zonder verbruik
CREATE OR REPLACE FUNCTION public.peek_ai_micro_steps_quota(p_limit integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_date date := (timezone('utc', now()))::date;
  v_count integer := 0;
  v_limit integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 30);

  SELECT count
  INTO v_count
  FROM public.ai_daily_usage
  WHERE user_id = v_uid
    AND feature = 'micro_steps'
    AND usage_date = v_date;

  IF v_count IS NULL THEN
    v_count := 0;
  END IF;

  IF v_count >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'limit', v_limit,
      'count', v_count
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_limit - v_count,
    'limit', v_limit,
    'count', v_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.peek_ai_micro_steps_quota(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_ai_micro_steps_quota(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_ai_micro_steps_quota(p_limit integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_date date := (timezone('utc', now()))::date;
  v_count integer;
  v_limit integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 30);

  INSERT INTO public.ai_daily_usage (user_id, feature, usage_date, count)
  VALUES (v_uid, 'micro_steps', v_date, 0)
  ON CONFLICT (user_id, feature, usage_date) DO NOTHING;

  SELECT count
  INTO v_count
  FROM public.ai_daily_usage
  WHERE user_id = v_uid
    AND feature = 'micro_steps'
    AND usage_date = v_date
  FOR UPDATE;

  IF v_count >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'limit', v_limit,
      'count', v_count
    );
  END IF;

  UPDATE public.ai_daily_usage
  SET count = count + 1
  WHERE user_id = v_uid
    AND feature = 'micro_steps'
    AND usage_date = v_date;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_limit - v_count - 1,
    'limit', v_limit,
    'count', v_count + 1
  );
END;
$$;

-- 3. Query-indexen (live workload)
CREATE INDEX IF NOT EXISTS tasks_user_id_created_at_desc_idx
  ON public.tasks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS daily_checkins_user_id_date_idx
  ON public.daily_checkins (user_id, date DESC);

CREATE INDEX IF NOT EXISTS parked_thoughts_user_id_created_at_idx
  ON public.parked_thoughts (user_id, created_at DESC);
