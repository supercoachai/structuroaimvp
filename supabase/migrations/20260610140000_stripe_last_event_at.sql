-- Stripe webhook ordering: negeer out-of-order status-updates per customer.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_last_event_at timestamptz;

COMMENT ON COLUMN public.profiles.stripe_last_event_at IS
  'Unix-timestamp van laatst verwerkte Stripe webhook (event.created) voor status-sync.';
