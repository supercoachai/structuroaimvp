-- Atomair account-data wissen + auditlog (geen PII).
-- Run eenmalig in Supabase SQL Editor.
--
-- Wijzigingen tov de oude per-tabel-DELETE-loop:
--   1. Alles in 1 transactie: partial-delete is niet meer mogelijk.
--   2. account_deletion_audit slaat alleen sha256(user_id) + timestamp op.
--   3. Functie alleen executeerbaar door service_role.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS account_deletion_audit (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id_hash TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL DEFAULT 'user_request'
);

CREATE INDEX IF NOT EXISTS account_deletion_audit_deleted_at_idx
  ON account_deletion_audit(deleted_at);

ALTER TABLE account_deletion_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages account deletion audit"
  ON account_deletion_audit;
CREATE POLICY "Service role manages account deletion audit"
  ON account_deletion_audit
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
  -- Volgorde irrelevant binnen transactie; alleen tabellen die echt bestaan.
  DELETE FROM tasks                    WHERE user_id = p_user_id;
  DELETE FROM daily_checkins           WHERE user_id = p_user_id;
  DELETE FROM daily_shutdowns          WHERE user_id = p_user_id;
  DELETE FROM parked_thoughts          WHERE user_id = p_user_id;
  DELETE FROM gamification_data        WHERE user_id = p_user_id;
  DELETE FROM user_insights            WHERE user_id = p_user_id;
  DELETE FROM push_subscriptions       WHERE user_id = p_user_id;
  DELETE FROM shutdown_reminder_sends  WHERE user_id = p_user_id;
  DELETE FROM profiles                 WHERE id      = p_user_id;

  INSERT INTO account_deletion_audit (user_id_hash)
  VALUES (encode(digest(p_user_id::text, 'sha256'), 'hex'));
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_account_data(UUID) TO service_role;
