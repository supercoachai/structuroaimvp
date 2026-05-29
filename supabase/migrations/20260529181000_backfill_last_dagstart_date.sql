-- Backfill profiles.last_dagstart_date vanuit de echte laatste dagstart (daily_checkins).
--
-- Reden: last_dagstart_date werd pas later geintroduceerd en is voor sommige bestaande
-- testers NULL of achterstallig, terwijl ze wel daily_checkins-rijen hebben. Dat zou de
-- launch-grace (dagstart >= 19 april) ten onrechte ontzeggen aan een legitieme tester.
--
-- Veilig: zet de datum alleen VOORUIT naar de werkelijke laatste check-in; raakt nooit
-- gebruikersdata aan en verlaagt de waarde nooit.

UPDATE public.profiles p
SET last_dagstart_date = sub.max_date
FROM (
  SELECT user_id, MAX(date) AS max_date
  FROM public.daily_checkins
  GROUP BY user_id
) sub
WHERE p.id = sub.user_id
  AND (p.last_dagstart_date IS NULL OR p.last_dagstart_date < sub.max_date);
