-- EENMALIG: draai NA migration_onboarding_version.sql.
-- Zet bij alle profielen met oude "afgerond" de vlag terug, zodat iedereen de nieuwe intro ziet.
-- De app-check gebruikt ook onboarding_version; NULL/<2 stuurt naar /onboarding.
-- Deze UPDATE is optioneel als je onboarding_completed expliciet wilt resetten; anders volstaat ontbrekende versie.

UPDATE public.profiles
SET onboarding_completed = false
WHERE onboarding_completed = true;
