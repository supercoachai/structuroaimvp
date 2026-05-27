-- Admin-only analytics views: geen SECURITY DEFINER bypass voor app-gebruikers.
-- Zie Supabase linter: security_definer_view (0010).

ALTER VIEW public.acquisitie_conversie SET (security_invoker = true);
ALTER VIEW public.kanaal_conversies SET (security_invoker = true);

REVOKE ALL ON public.acquisitie_conversie FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.kanaal_conversies FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.acquisitie_conversie TO service_role;
GRANT SELECT ON public.kanaal_conversies TO service_role;

COMMENT ON VIEW public.acquisitie_conversie IS
  'Kanaal → signup → betaald abonnement. Alleen via service_role (niet via PostgREST voor gebruikers).';

COMMENT ON VIEW public.kanaal_conversies IS
  'Wachtlijst per kanaal. Alleen via service_role (niet via PostgREST voor gebruikers).';
