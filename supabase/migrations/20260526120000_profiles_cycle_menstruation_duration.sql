-- Menstruatieduur voor dynamische cyclusfase-berekening in de app.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cycle_menstruation_duration integer;

COMMENT ON COLUMN profiles.cycle_menstruation_duration IS
  'Gemiddelde menstruatieduur in dagen (1 t/m cyclus-17), default 5 in app.';
