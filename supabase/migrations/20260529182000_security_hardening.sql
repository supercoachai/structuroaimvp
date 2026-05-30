-- Security hardening voor launch (Supabase advisor warnings dichten, non-destructief).
--
-- 1. get_og_waitlist_count() is een ongebruikte SECURITY DEFINER functie die door anon en
--    authenticated via /rest/v1/rpc aanroepbaar was. Execute intrekken (functie blijft bestaan
--    voor service_role/postgres), zodat hij niet publiek aanroepbaar is.
-- 2. og_waitlist en stripe_processed_events hebben RLS aan zonder policy. Effectief al
--    service_role-only, maar de advisor markeert dit als onduidelijk. Expliciete
--    service_role-policy maakt de intentie hard en dicht de INFO-melding.

-- PUBLIC-grant intrekken is nodig: REVOKE van alleen anon/authenticated laat de
-- impliciete PUBLIC EXECUTE-grant staan, waardoor de advisor blijft waarschuwen.
REVOKE EXECUTE ON FUNCTION public.get_og_waitlist_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_og_waitlist_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_og_waitlist_count() FROM authenticated;

DROP POLICY IF EXISTS "Service role only" ON public.og_waitlist;
CREATE POLICY "Service role only"
  ON public.og_waitlist
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role only" ON public.stripe_processed_events;
CREATE POLICY "Service role only"
  ON public.stripe_processed_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Publieke waitlist-INSERT policies hadden WITH CHECK (true) (advisor: "always true").
--    De app zelf insert via de service-role client (bypasst RLS), dus we kunnen de anon-INSERT
--    aanscherpen tot een echte validatie (geldig e-mailformaat + lengtegrenzen, gelijk aan de
--    app-validatie). Dit dicht de advisor-warning en blokkeert garbage/abuse via directe REST.
DROP POLICY IF EXISTS "wachtlijst_insert_anyone" ON public.wachtlijst;
CREATE POLICY "wachtlijst_insert_anyone"
  ON public.wachtlijst
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(email) <= 254
    AND char_length(name) <= 120
  );

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.waitlist_subscribers;
CREATE POLICY "Anyone can subscribe"
  ON public.waitlist_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (
    email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(email) <= 254
    AND char_length(name) <= 120
  );
