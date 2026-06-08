import type Stripe from "stripe";

export async function getOrCreateStripeCustomer(
  stripe: Stripe,
  input: {
    userId: string;
    email: string;
    existingCustomerId?: string | null;
  }
): Promise<string> {
  const existing = input.existingCustomerId?.trim();
  if (existing) {
    try {
      const customer = await stripe.customers.retrieve(existing);
      if (!("deleted" in customer && customer.deleted)) {
        return existing;
      }
    } catch {
      /* fall through */
    }
  }

  const customer = await stripe.customers.create({
    email: input.email.trim().toLowerCase(),
    metadata: { supabase_user_id: input.userId },
  });
  return customer.id;
}
