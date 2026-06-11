-- peek_ai_micro_steps_quota mag alleen door ingelogde gebruikers worden aangeroepen.
-- Advisor WARN: anon kon de SECURITY DEFINER-functie via /rest/v1/rpc aanroepen.

REVOKE EXECUTE ON FUNCTION public.peek_ai_micro_steps_quota(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_ai_micro_steps_quota(integer) FROM anon;
