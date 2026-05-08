import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createStripeServerClient } from "@/lib/stripeServer";

export const runtime = "nodejs";

export async function POST() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const subId =
    profile && typeof profile.stripe_subscription_id === "string"
      ? profile.stripe_subscription_id
      : null;
  if (!subId) {
    return NextResponse.json({ error: "No active subscription in account." }, { status: 400 });
  }

  const stripe = createStripeServerClient(key);
  await stripe.subscriptions.update(subId, { cancel_at_period_end: true });

  return NextResponse.json({ ok: true });
}
