-- Migratie: parked_thoughts tabel
-- Geparkeerde gedachten uit focus modus, max 10 actief per user (afgedwongen via trigger).

CREATE TABLE IF NOT EXISTS parked_thoughts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  converted_to_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS parked_thoughts_user_id_idx
  ON parked_thoughts(user_id, converted_to_task_id);

-- RLS
ALTER TABLE parked_thoughts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own parked thoughts" ON parked_thoughts;
CREATE POLICY "Users can view own parked thoughts" ON parked_thoughts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own parked thoughts" ON parked_thoughts;
CREATE POLICY "Users can insert own parked thoughts" ON parked_thoughts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own parked thoughts" ON parked_thoughts;
CREATE POLICY "Users can update own parked thoughts" ON parked_thoughts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own parked thoughts" ON parked_thoughts;
CREATE POLICY "Users can delete own parked thoughts" ON parked_thoughts
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger: max 10 actieve (niet-omgezette) gedachten per user
CREATE OR REPLACE FUNCTION public.enforce_parked_thoughts_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM parked_thoughts
    WHERE user_id = NEW.user_id AND converted_to_task_id IS NULL
  ) >= 10 THEN
    RAISE EXCEPTION 'Maximaal 10 actieve geparkeerde gedachten per gebruiker';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS parked_thoughts_limit_trigger ON parked_thoughts;
CREATE TRIGGER parked_thoughts_limit_trigger
  BEFORE INSERT ON parked_thoughts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_parked_thoughts_limit();
