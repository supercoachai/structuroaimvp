-- Dagstart gate + metadata op profiles (Europe/Amsterdam logica in app)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_dagstart_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_dagstart_date DATE;
    RAISE NOTICE 'profiles.last_dagstart_date toegevoegd';
  ELSE
    RAISE NOTICE 'profiles.last_dagstart_date bestaat al';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'dagstart_energy'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN dagstart_energy TEXT;
    RAISE NOTICE 'profiles.dagstart_energy toegevoegd';
  ELSE
    RAISE NOTICE 'profiles.dagstart_energy bestaat al';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'dagstart_completed_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN dagstart_completed_at TIMESTAMPTZ;
    RAISE NOTICE 'profiles.dagstart_completed_at toegevoegd';
  ELSE
    RAISE NOTICE 'profiles.dagstart_completed_at bestaat al';
  END IF;
END $$;
