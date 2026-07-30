-- AI-quota SECURITY DEFINER RPC's: geen EXECUTE meer voor authenticated.
-- Alleen service_role via de Next.js API-route (suggest-micro-steps).
-- Advisor WARN: authenticated_security_definer_function_executable.

DROP FUNCTION IF EXISTS public.peek_ai_micro_steps_quota(integer);
DROP FUNCTION IF EXISTS public.consume_ai_micro_steps_quota(integer);

CREATE OR REPLACE FUNCTION public.peek_ai_micro_steps_quota(
  p_user_id uuid,
  p_limit integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date := (timezone('utc', now()))::date;
  v_count integer := 0;
  v_limit integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 30);

  SELECT count
  INTO v_count
  FROM public.ai_daily_usage
  WHERE user_id = p_user_id
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

CREATE OR REPLACE FUNCTION public.consume_ai_micro_steps_quota(
  p_user_id uuid,
  p_limit integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date := (timezone('utc', now()))::date;
  v_count integer;
  v_limit integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 30);

  INSERT INTO public.ai_daily_usage (user_id, feature, usage_date, count)
  VALUES (p_user_id, 'micro_steps', v_date, 0)
  ON CONFLICT (user_id, feature, usage_date) DO NOTHING;

  SELECT count
  INTO v_count
  FROM public.ai_daily_usage
  WHERE user_id = p_user_id
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
  WHERE user_id = p_user_id
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

REVOKE ALL ON FUNCTION public.peek_ai_micro_steps_quota(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_ai_micro_steps_quota(uuid, integer) FROM PUBLIC;
-- Default privileges in Supabase geven anon/authenticated EXECUTE bij CREATE;
-- expliciet intrekken (REVOKE FROM PUBLIC is niet genoeg).
REVOKE EXECUTE ON FUNCTION public.peek_ai_micro_steps_quota(uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_ai_micro_steps_quota(uuid, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.peek_ai_micro_steps_quota(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_ai_micro_steps_quota(uuid, integer) TO service_role;
