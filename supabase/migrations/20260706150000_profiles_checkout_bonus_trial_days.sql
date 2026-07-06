-- Eenmalige bonus-trialdagen voor de Stripe-checkout, per account.
--
-- Use case: compensatie (bv. Jasper-luisteraar die door de trial- en
-- couponbug te vroeg tegen een kapotte checkout aanliep) door de eerste
-- betaalde maand X dagen later te laten ingaan. De checkout-routes lezen
-- deze kolom en geven hem door als subscription_data.trial_period_days;
-- kaart wordt gewoon direct vastgelegd en eventuele coupons blijven werken.
--
-- Beveiliging: migratie 20260611120000 heeft tabel-brede INSERT/UPDATE voor
-- authenticated/anon ingetrokken en alleen expliciete kolommen teruggegeven.
-- Deze nieuwe kolom staat bewust NIET in die GRANT-lijsten en is dus alleen
-- door service_role te schrijven; gebruikers kunnen zichzelf geen gratis
-- dagen geven.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS checkout_bonus_trial_days integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_checkout_bonus_trial_days_range;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_checkout_bonus_trial_days_range
  CHECK (checkout_bonus_trial_days >= 0 AND checkout_bonus_trial_days <= 90);

COMMENT ON COLUMN public.profiles.checkout_bonus_trial_days IS
  'Eenmalige Stripe-trialdagen bij de eerstvolgende checkout (service_role only). Wordt op 0 gezet zodra checkout.session.completed het abonnement activeert.';
