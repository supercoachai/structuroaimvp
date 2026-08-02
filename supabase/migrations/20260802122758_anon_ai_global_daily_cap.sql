-- Globale dagcap voor anonieme AI-microstappen (circuit breaker over alle instances).
-- Alleen service_role; API route consume’t vóór echte AI-generatie (templates tellen niet).

CREATE TABLE IF NOT EXISTS public.ai_global_daily_usage (
  feature text NOT NULL,
  usage_date date NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (feature, usage_date)
);

COMMENT ON TABLE public.ai_global_daily_usage IS
  'Globale dagelijkse AI-tellingen (UTC-datum), o.a. anonieme microstappen.';

ALTER TABLE public.ai_global_daily_usage ENABLE ROW LEVEL SECURITY;

-- Geen policies voor anon/authenticated: alleen service_role via SECURITY DEFINER RPC.

CREATE OR REPLACE FUNCTION public.consume_anon_ai_micro_steps_global_quota(
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date := (timezone('utc', now()))::date;
  v_feature text := 'anon_micro_steps';
  v_count integer;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 10000);
BEGIN
  INSERT INTO public.ai_global_daily_usage (feature, usage_date, count)
  VALUES (v_feature, v_date, 0)
  ON CONFLICT (feature, usage_date) DO NOTHING;

  SELECT count
  INTO v_count
  FROM public.ai_global_daily_usage
  WHERE feature = v_feature
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

  UPDATE public.ai_global_daily_usage
  SET count = count + 1
  WHERE feature = v_feature
    AND usage_date = v_date;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_limit - v_count - 1,
    'limit', v_limit,
    'count', v_count + 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_anon_ai_micro_steps_global_quota(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_anon_ai_micro_steps_global_quota(integer) TO service_role;
