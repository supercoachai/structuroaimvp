-- Security hardening (Fase 5): search_path, anon RPC, RLS initplan

ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.consume_ai_micro_steps_quota(integer) FROM anon;

DROP POLICY IF EXISTS "Users read own ai usage" ON public.ai_daily_usage;
CREATE POLICY "Users read own ai usage"
  ON public.ai_daily_usage
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);
