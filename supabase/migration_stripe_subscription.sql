-- Stripe-abonnement + webhook-idempotentie (Structuro betaalde launch)
-- Idempotent: veilig meerdere keren uitvoeren. Atomair via transactie.

BEGIN;

CREATE TABLE IF NOT EXISTS public.stripe_processed_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.stripe_processed_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.stripe_processed_events IS
  'Stripe webhook event.id; alleen service role schrijft.';

-- Alle profile-kolommen: nullable of default zodat bestaande rijen niet breken
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.subscription_status IS
  'none | active | cancelled | past_due | refunded | expired';
COMMENT ON COLUMN public.profiles.subscription_plan IS
  'monthly | yearly | null';
COMMENT ON COLUMN public.profiles.cancel_at_period_end IS
  'Gespiegeld van Stripe subscription.cancel_at_period_end.';
COMMENT ON COLUMN public.profiles.refunded_at IS
  'Tijdstip self-service of Stripe refund; max één self-service per e-mail (app-logica).';

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_email_refunded_idx
  ON public.profiles (lower(email))
  WHERE refunded_at IS NOT NULL;

COMMIT;
