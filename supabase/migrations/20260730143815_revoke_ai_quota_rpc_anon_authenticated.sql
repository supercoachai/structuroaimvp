-- Expliciet EXECUTE intrekken voor anon/authenticated.
-- REVOKE FROM PUBLIC alleen is niet genoeg door Supabase default privileges.

REVOKE EXECUTE ON FUNCTION public.peek_ai_micro_steps_quota(uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_ai_micro_steps_quota(uuid, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.peek_ai_micro_steps_quota(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_ai_micro_steps_quota(uuid, integer) TO service_role;
