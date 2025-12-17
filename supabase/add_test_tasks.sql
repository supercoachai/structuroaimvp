-- Script om 10 testtaken toe te voegen met variërende energie-niveaus
-- ⚠️ Let op: Dit voegt taken toe voor de huidige ingelogde gebruiker
-- Run dit script in je Supabase SQL Editor

-- Vervang USER_ID_HIER met je eigen user_id (of gebruik auth.uid() als je ingelogd bent)
-- Je kunt je user_id vinden door: SELECT id FROM auth.users WHERE email = 'jouw@email.com';

-- Voor testdoeleinden: gebruik de eerste gebruiker (pas aan indien nodig)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Haal de eerste gebruiker op (of gebruik een specifieke)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  -- Als er geen gebruiker is, stop dan
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Geen gebruiker gevonden. Log eerst in.';
  END IF;

  -- Verwijder bestaande testtaken (optioneel - comment uit als je ze wilt behouden)
  -- DELETE FROM tasks WHERE user_id = test_user_id AND title LIKE 'Test: %';

  -- Voeg 10 testtaken toe met variërende energie-niveaus
  INSERT INTO tasks (user_id, title, done, priority, duration, energy_level, source, due_at, created_at, updated_at)
  VALUES
    -- Lage energie taken (3 stuks)
    (test_user_id, 'Test: Email beantwoorden', false, null, 15, 'low', 'regular', NOW() + INTERVAL '1 day', NOW(), NOW()),
    (test_user_id, 'Test: Boodschappenlijst maken', false, null, 10, 'low', 'regular', NOW() + INTERVAL '1 day', NOW(), NOW()),
    (test_user_id, 'Test: Kamer opruimen', false, null, 20, 'low', 'regular', NOW() + INTERVAL '2 days', NOW(), NOW()),
    
    -- Normale energie taken (4 stuks)
    (test_user_id, 'Test: Projectplanning opstellen', false, null, 45, 'medium', 'regular', NOW() + INTERVAL '1 day', NOW(), NOW()),
    (test_user_id, 'Test: Vergadering voorbereiden', false, null, 30, 'medium', 'regular', NOW() + INTERVAL '1 day', NOW(), NOW()),
    (test_user_id, 'Test: Rapport schrijven', false, null, 60, 'medium', 'regular', NOW() + INTERVAL '2 days', NOW(), NOW()),
    (test_user_id, 'Test: Presentatie maken', false, null, 90, 'medium', 'regular', NOW() + INTERVAL '3 days', NOW(), NOW()),
    
    -- Hoge energie taken (3 stuks)
    (test_user_id, 'Test: Complexe data-analyse uitvoeren', false, null, 120, 'high', 'regular', NOW() + INTERVAL '2 days', NOW(), NOW()),
    (test_user_id, 'Test: Volledige website redesign', false, null, 180, 'high', 'regular', NOW() + INTERVAL '4 days', NOW(), NOW()),
    (test_user_id, 'Test: Strategisch plan ontwikkelen', false, null, 150, 'high', 'regular', NOW() + INTERVAL '5 days', NOW(), NOW());

  RAISE NOTICE '✓ 10 testtaken toegevoegd voor gebruiker: %', test_user_id;
  RAISE NOTICE '  - 3 taken met lage energie (15-20 min)';
  RAISE NOTICE '  - 4 taken met normale energie (30-90 min)';
  RAISE NOTICE '  - 3 taken met hoge energie (120-180 min)';
END $$;

-- Bevestiging: toon de toegevoegde taken
SELECT 
  title,
  energy_level,
  duration,
  due_at::date as deadline
FROM tasks 
WHERE title LIKE 'Test: %'
ORDER BY energy_level, duration;
