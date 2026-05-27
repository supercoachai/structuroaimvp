-- =============================================================================
-- Wachtlijst: één canonical tabel + migratie legacy tabellen (dedup op e-mail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.wachtlijst (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS wachtlijst_email_lower_unique
  ON public.wachtlijst (lower(email));

CREATE INDEX IF NOT EXISTS wachtlijst_created_at_idx
  ON public.wachtlijst (created_at DESC);

ALTER TABLE public.wachtlijst ENABLE ROW LEVEL SECURITY;

-- Geen client-policies: inserts lopen via service role (POST /api/waitlist/join).

-- waitlist_subscribers (EU-landing, client-side) → wachtlijst
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'waitlist_subscribers'
  ) THEN
    INSERT INTO public.wachtlijst (email, name, source, created_at)
    SELECT DISTINCT ON (lower(trim(ws.email)))
      lower(trim(ws.email)),
      coalesce(
        nullif(trim(ws.name), ''),
        split_part(lower(trim(ws.email)), '@', 1)
      ),
      coalesce(nullif(trim(ws.source), ''), 'eu_landing'),
      coalesce(ws.created_at, timezone('utc', now()))
    FROM public.waitlist_subscribers ws
    WHERE ws.email IS NOT NULL
      AND trim(ws.email) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM public.wachtlijst w
        WHERE lower(w.email) = lower(trim(ws.email))
      )
    ORDER BY lower(trim(ws.email)), coalesce(ws.created_at, timezone('utc', now())) ASC;
  END IF;
END $$;

-- og_waitlist (legacy OG, alleen e-mail) → wachtlijst
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'og_waitlist'
  ) THEN
    INSERT INTO public.wachtlijst (email, name, source, created_at)
    SELECT DISTINCT ON (lower(trim(og.email)))
      lower(trim(og.email)),
      split_part(lower(trim(og.email)), '@', 1),
      'og_waitlist',
      coalesce(og.created_at, timezone('utc', now()))
    FROM public.og_waitlist og
    WHERE og.email IS NOT NULL
      AND trim(og.email) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM public.wachtlijst w
        WHERE lower(w.email) = lower(trim(og.email))
      )
    ORDER BY lower(trim(og.email)), coalesce(og.created_at, timezone('utc', now())) ASC;
  END IF;
END $$;

-- Normaliseer bestaande e-mails naar lowercase (idempotent)
UPDATE public.wachtlijst
SET email = lower(trim(email))
WHERE email <> lower(trim(email));
