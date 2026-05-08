import Stripe from "stripe";

/**
 * Pinned API version. Bumping this requires reviewing
 * Subscription/Invoice property paths (e.g. current_period_end
 * moved to items in newer versions).
 *
 * package.json: stripe major 17 (<18). Types still expose Subscription.current_period_end at this pin.
 *
 * Stripe Node types default to LatestApiVersion; runtime pin uses cast below.
 */
export const STRIPE_API_VERSION_PINNED = "2024-06-20";

/** Single factory so every server route hits the same API version. */
export function createStripeServerClient(secretKey: string): Stripe {
  /* SDK types only list LatestApiVersion; runtime still accepts pinned date strings. */
  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION_PINNED,
    typescript: true,
  } as unknown as Stripe.StripeConfig);
}

/**
 * Period end as Unix timestamp in seconds for DB `toISOString()` math.
 *
 * Verified for stripe@17 + API `2024-06-20`: `Stripe.Subscription.current_period_end` is a number
 * (`node_modules/stripe/types/Subscriptions.d.ts`). Fallback reads first item when present for
 * forward compatibility if we bump the pinned version later.
 */
export function subscriptionCurrentPeriodEndUnix(sub: Stripe.Subscription): number {
  const root = sub.current_period_end;
  if (typeof root === "number" && Number.isFinite(root)) {
    return root;
  }
  const items = sub.items?.data;
  const firstItem = items?.[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined;
  const fallback =
    typeof firstItem?.current_period_end === "number"
      ? firstItem.current_period_end
      : null;
  if (fallback !== null && Number.isFinite(fallback)) {
    return fallback;
  }
  throw new Error(
    `[stripe] subscription ${sub.id}: missing current_period_end (check pinned API vs Stripe docs)`
  );
}
