import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import {
  createStripeServerClientFromEnv,
  findStripeSubscriptionForUser,
  profileFieldsFromStripeSubscription,
} from "@/lib/stripe/syncProfileSubscription";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Haalt het Stripe-abonnement van de ingelogde gebruiker op en schrijft het naar profiles.
 * Handig als checkout wel slaagde maar de webhook (nog) niet in Supabase landde.
 */
async function postSyncSubscription(_request: Request) {
  const stripe = await createStripeServerClientFromEnv();
  if (!stripe) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 }
    );
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: "service_role_key_missing" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select(
      "stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  const profileRow = profile as {
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  } | null;

  const found = await findStripeSubscriptionForUser(stripe, {
    stripeSubscriptionId:
      typeof profileRow?.stripe_subscription_id === "string"
        ? profileRow.stripe_subscription_id
        : null,
    stripeCustomerId:
      typeof profileRow?.stripe_customer_id === "string"
        ? profileRow.stripe_customer_id
        : null,
    email: user.email,
  });

  if (!found) {
    return NextResponse.json({ error: "subscription_not_found" }, { status: 404 });
  }

  const update = profileFieldsFromStripeSubscription(
    found.subscription,
    found.customerId
  );

  const profileDb = admin as any;

  const { error: upErr } = await profileDb
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    synced: true,
    status: update.subscription_status,
    current_period_end: update.subscription_current_period_end,
    stripe_subscription_id: update.stripe_subscription_id,
  });
}

export const POST = withApiErrorTracking(
  "POST /api/stripe/sync-subscription",
  postSyncSubscription
);
