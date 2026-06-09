-- Dagelijkse AI-quota per gebruiker (o.a. microstap-suggesties).

CREATE TABLE IF NOT EXISTS public.ai_daily_usage (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  feature text NOT NULL,
  usage_date date NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (user_id, feature, usage_date)
);

COMMENT ON TABLE public.ai_daily_usage IS
  'Dagelijkse AI-feature tellingen per gebruiker (UTC-datum).';

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ai usage"
  ON public.ai_daily_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Atomair: verbruik 1 AI-call als onder de limiet, anders geweigerd.
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_limit < 1 THEN
    RAISE EXCEPTION 'invalid_limit';
  END IF;

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

  IF v_count >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'limit', p_limit,
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
    'remaining', p_limit - v_count - 1,
    'limit', p_limit,
    'count', v_count + 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_micro_steps_quota(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_ai_micro_steps_quota(integer) TO authenticated;
