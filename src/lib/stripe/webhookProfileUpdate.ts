import type Stripe from "stripe";

type ProfileDb = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{
          data: { stripe_last_event_at?: string | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (row: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

/**
 * Past profiel-update alleen toe als event.created nieuwer is dan stripe_last_event_at.
 * Voorkomt dat invoice.payment_failed een recent payment_succeeded overschrijft.
 */
export async function applyStripeProfileUpdateIfFresh(
  profileDb: ProfileDb,
  customerId: string,
  event: Stripe.Event,
  update: Record<string, unknown>
): Promise<boolean> {
  const eventCreatedMs = event.created * 1000;
  const { data: prof, error: readErr } = await profileDb
    .from("profiles")
    .select("stripe_last_event_at")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (readErr) {
    console.error("[stripe-webhook] stripe_last_event_at read failed", readErr);
  }

  const lastMs = prof?.stripe_last_event_at
    ? new Date(prof.stripe_last_event_at).getTime()
    : 0;

  if (lastMs > eventCreatedMs) {
    console.log(
      `[stripe-webhook] Skip stale ${event.type} for ${customerId} ` +
        `(event ${eventCreatedMs} < last ${lastMs})`
    );
    return false;
  }

  const { error: upErr } = await profileDb
    .from("profiles")
    .update({
      ...update,
      stripe_last_event_at: new Date(eventCreatedMs).toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (upErr) {
    console.error("[stripe-webhook] profile update failed", upErr);
    return false;
  }

  return true;
}

/** Zelfde guard voor checkout op user-id (nog geen stripe_customer_id op profiel). */
export async function applyStripeProfileUpdateByUserIdIfFresh(
  profileDb: ProfileDb,
  userId: string,
  event: Stripe.Event,
  update: Record<string, unknown>
): Promise<boolean> {
  const eventCreatedMs = event.created * 1000;
  const { data: prof, error: readErr } = await profileDb
    .from("profiles")
    .select("stripe_last_event_at")
    .eq("id", userId)
    .maybeSingle();

  if (readErr) {
    console.error("[stripe-webhook] stripe_last_event_at read failed", readErr);
  }

  const lastMs = prof?.stripe_last_event_at
    ? new Date(prof.stripe_last_event_at).getTime()
    : 0;

  if (lastMs > eventCreatedMs) {
    console.log(
      `[stripe-webhook] Skip stale ${event.type} for user ${userId} ` +
        `(event ${eventCreatedMs} < last ${lastMs})`
    );
    return false;
  }

  const { error: upErr } = await profileDb
    .from("profiles")
    .update({
      ...update,
      stripe_last_event_at: new Date(eventCreatedMs).toISOString(),
    })
    .eq("id", userId);

  if (upErr) {
    console.error("[stripe-webhook] profile update failed", upErr);
    return false;
  }

  return true;
}
