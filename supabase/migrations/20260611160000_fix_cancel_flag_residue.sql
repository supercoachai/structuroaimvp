-- cancel_at_period_end is alleen betekenisvol voor echte Stripe-subscriptions.
-- App-managed trials (handmatige grants) kregen de vlag als residu, waardoor de
-- data verkeerd werd uitgelezen als "opgezegd" terwijl niemand had opgezegd.
--
-- 1. Schoon het residu op: vlag uit waar geen Stripe-subscription bestaat.
-- 2. Borg de invariant: de vlag mag alleen aanstaan met een stripe_subscription_id.
--    Alle Stripe-schrijfpaden (webhook updated/deleted, cancel-route, refund) zetten
--    deze twee velden consistent, dus de constraint breekt geen enkele betaalflow.

UPDATE public.profiles
SET cancel_at_period_end = false
WHERE stripe_subscription_id IS NULL
  AND cancel_at_period_end = true;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_cancel_flag_requires_stripe_sub
  CHECK (cancel_at_period_end = false OR stripe_subscription_id IS NOT NULL);
