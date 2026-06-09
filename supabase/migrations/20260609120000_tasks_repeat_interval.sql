-- Herhaling: vaste dag (planned) vs interval vanaf afvinken (completion).

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS repeat_anchor text DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS repeat_interval_days integer,
  ADD COLUMN IF NOT EXISTS repeat_next_due_at date;

COMMENT ON COLUMN tasks.repeat_anchor IS 'planned = vaste weekdag; completion = interval na afvinken.';
COMMENT ON COLUMN tasks.repeat_interval_days IS 'Aantal dagen tussen herhalingen bij repeat=interval (bijv. 14).';
COMMENT ON COLUMN tasks.repeat_next_due_at IS 'Volgende geplande dag voor interval-herhaling (YYYY-MM-DD).';
