-- =============================================================================
-- TAAK 4 (UITGESTELD TOT OG LIVE): og_waitlist RLS – niet draaien tot de actie aan gaat.
-- =============================================================================
-- Service role blijft alles kunnen (RLS bypass). Geen SELECT/UPDATE/DELETE voor
-- client-rollen: wachtlijst is append-only vanuit de app.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.og_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS og_waitlist_created_at_idx
  ON public.og_waitlist (created_at DESC);

ALTER TABLE public.og_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can sign up to waitlist" ON public.og_waitlist;

CREATE POLICY "Anyone can sign up to waitlist"
  ON public.og_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Geen policy voor SELECT: PostgREST leest niet via client-keys.
-- Geen UPDATE/DELETE policies: immutable wachtlijst voor client-rollen.
