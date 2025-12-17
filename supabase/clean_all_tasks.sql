-- Script om alle taken en gerelateerde data te verwijderen
-- ⚠️ WAARSCHUWING: Dit verwijdert ALLE taken en agenda items!
-- Run dit script in je Supabase SQL Editor

-- Verwijder alle taken (inclusief medicatie taken)
DELETE FROM tasks;

-- Verwijder alle daily check-ins
DELETE FROM daily_checkins;

-- Verwijder alle daily shutdowns
DELETE FROM daily_shutdowns;

-- Verwijder alle user insights
DELETE FROM user_insights;

-- Reset gamification data (behoud streaks en badges, reset alleen task counts)
UPDATE gamification_data 
SET 
  total_tasks_completed = 0,
  updated_at = NOW();

-- Bevestiging
SELECT 
  'Alle taken verwijderd' as status,
  COUNT(*) as remaining_tasks
FROM tasks;
