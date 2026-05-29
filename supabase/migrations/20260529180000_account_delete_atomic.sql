-- Atomair account-data wissen + AVG-auditlog (geen PII).
--
-- Achtergrond: het privacybeleid (v1.1) belooft een werkende knop "Account verwijderen"
-- met directe verwijdering uit productie. De oude settings-knop wiste alleen localStorage.
-- Deze migratie levert de server-side basis: een SECURITY DEFINER functie die alle
-- gebruikersrijen in 1 transactie verwijdert en een geanonimiseerde auditrij wegschrijft.
--
-- Schema-afgestemd op de LIVE database (29 mei 2026): alleen tabellen die echt bestaan.
-- gamification_data staat wel in schema.sql maar bestaat NIET in de live DB; daarom niet genoemd.
--
-- NB over cascade: in de LIVE DB heeft profiles.id (en alle user-tabellen) ON DELETE CASCADE
-- naar auth.users (geverifieerd via pg_constraint: confdeltype='c'). schema.sql is op dit punt
-- verouderd (toont een kale REFERENCES zonder cascade). Deze functie verwijdert profiles + alle
-- user-rijen sowieso EXPLICIET, zodat de verwijdering atomair en auditbaar is en niet afhangt
-- van de cascade-configuratie. Werkt dus correct ongeacht of de cascade aanwezig is.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.account_deletion_audit (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id_hash TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL DEFAULT 'user_request'
);

CREATE INDEX IF NOT EXISTS account_deletion_audit_deleted_at_idx
  ON public.account_deletion_audit (deleted_at);

ALTER TABLE public.account_deletion_audit ENABLE ROW LEVEL SECURITY;

-- Geen policy = alleen service_role komt erbij. Expliciete policy voor leesbaarheid.
DROP POLICY IF EXISTS "Service role manages account deletion audit"
  ON public.account_deletion_audit;
CREATE POLICY "Service role manages account deletion audit"
  ON public.account_deletion_audit
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Volgorde binnen 1 transactie: partial-delete is onmogelijk.
  DELETE FROM tasks                         WHERE user_id = p_user_id;
  DELETE FROM daily_checkins                WHERE user_id = p_user_id;
  DELETE FROM daily_shutdowns               WHERE user_id = p_user_id;
  DELETE FROM parked_thoughts               WHERE user_id = p_user_id;
  DELETE FROM user_insights                 WHERE user_id = p_user_id;
  DELETE FROM push_subscriptions            WHERE user_id = p_user_id;
  DELETE FROM shutdown_reminder_sends       WHERE user_id = p_user_id;
  DELETE FROM daystart_reminder_sends       WHERE user_id = p_user_id;
  DELETE FROM daystart_lunch_reminder_sends WHERE user_id = p_user_id;
  DELETE FROM profiles                      WHERE id      = p_user_id;

  INSERT INTO account_deletion_audit (user_id_hash)
  VALUES (encode(digest(p_user_id::text, 'sha256'), 'hex'));
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account_data(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_account_data(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.delete_account_data(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(UUID) TO service_role;
