CREATE TABLE IF NOT EXISTS shutdown_reminder_sends (
  date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (date, user_id)
);

CREATE INDEX IF NOT EXISTS shutdown_reminder_sends_user_id_idx
  ON shutdown_reminder_sends(user_id);

ALTER TABLE shutdown_reminder_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages shutdown reminder sends"
  ON shutdown_reminder_sends;

CREATE POLICY "Service role manages shutdown reminder sends"
  ON shutdown_reminder_sends
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
