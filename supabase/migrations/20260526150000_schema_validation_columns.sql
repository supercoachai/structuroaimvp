-- Idempotente kolommen voor deadline-, cyclus- en info-dismiss validatie.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS due_at timestamptz;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cycle_tracking_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS cycle_last_period_start date,
  ADD COLUMN IF NOT EXISTS cycle_average_length integer,
  ADD COLUMN IF NOT EXISTS cycle_menstruation_duration integer,
  ADD COLUMN IF NOT EXISTS dismissed_info_keys text[] DEFAULT '{}';

ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS cycle_phase text;

COMMENT ON COLUMN tasks.due_at IS 'Taak-deadline (kalenderdag via Amsterdam-logica in app).';
COMMENT ON COLUMN daily_checkins.cycle_phase IS 'Berekende cyclusfase bij dagstart-check-in.';
COMMENT ON COLUMN profiles.dismissed_info_keys IS 'Info-panel keys permanent verborgen via Niet meer tonen.';
