import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { createStripeServerClient } from "@/lib/stripeServer";
import { getAppOrigin } from "@/lib/appUrl";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Stripe Billing Portal voor de ingelogde gebruiker (abonnement beheren
 * vanuit /settings). Vereist een bestaande Stripe-customer op het profiel.
 */
async function postPortal(_request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: "service_role_key_missing" },
      { status: 503 }
    );
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  const customerId =
    typeof profile?.stripe_customer_id === "string"
      ? profile.stripe_customer_id.trim()
      : "";
  if (!customerId) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  }

  const stripe = createStripeServerClient(key);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppOrigin()}/settings`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "no_portal_url" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}

export const POST = withApiErrorTracking("POST /api/stripe/portal", postPortal);
