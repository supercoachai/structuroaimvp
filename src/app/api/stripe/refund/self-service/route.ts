import { createClient } from "@/lib/supabase/server";
import { gateRefundServiceRole } from "@/lib/supabase/subscriptionRouteServiceRole";
import { sendRefundConfirmationEmail } from "@/lib/stripeRefundEmail";
import { createStripeServerClient } from "@/lib/stripeServer";
import {
  captureServerEvent,
  daysSinceSignupFromIso,
} from "@/lib/posthog/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export async function POST() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ success: false, reason: "stripe_not_configured" }, { status: 503 });
  }

  const gate = gateRefundServiceRole();
  if (!gate.ok) return gate.response;
  const admin = gate.admin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email) {
    return NextResponse.json({ success: false, reason: "unauthorized" }, { status: 401 });
  }

  const emailNorm = user.email.trim().toLowerCase();

  const { data: priorRefundRows, error: priorErr } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", emailNorm)
    .not("refunded_at", "is", null)
    .limit(1);

  if (priorErr) {
    console.error("[refund] prior refund check", priorErr);
    return NextResponse.json({ success: false, reason: "db_error" }, { status: 500 });
  }
  if (priorRefundRows && priorRefundRows.length > 0) {
    return NextResponse.json({ success: false, reason: "previous_refund_exists" });
  }

  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select(
      "stripe_subscription_id, stripe_customer_id, subscription_started_at, subscription_status, refunded_at, email, created_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json({ success: false, reason: "profile_error" }, { status: 500 });
  }
  const row = profile as {
    stripe_subscription_id?: string | null;
    stripe_customer_id?: string | null;
    subscription_started_at?: string | null;
    subscription_status?: string | null;
    refunded_at?: string | null;
    email?: string | null;
    created_at?: string | null;
  } | null;

  if (!row) {
    return NextResponse.json({ success: false, reason: "profile_error" }, { status: 500 });
  }

  const subId =
    typeof row.stripe_subscription_id === "string" ? row.stripe_subscription_id : null;
  const customerId =
    typeof row.stripe_customer_id === "string" ? row.stripe_customer_id : null;
  const startedAt =
    row.subscription_started_at != null ? String(row.subscription_started_at) : null;
  const status =
    typeof row.subscription_status === "string" ? row.subscription_status : null;

  if (!subId || !customerId) {
    return NextResponse.json({ success: false, reason: "no_subscription" });
  }
  if (status !== "active") {
    return NextResponse.json({ success: false, reason: "not_active" });
  }
  if (row.refunded_at != null) {
    return NextResponse.json({ success: false, reason: "previous_refund_exists" });
  }
  if (!startedAt) {
    return NextResponse.json({ success: false, reason: "no_start_date" });
  }
  if (Date.now() - new Date(startedAt).getTime() > FOURTEEN_DAYS_MS) {
    return NextResponse.json({ success: false, reason: "outside_14_days" });
  }

  const stripe = createStripeServerClient(stripeKey);

  const charges = await stripe.charges.list({
    customer: customerId,
    limit: 3,
  });
  const charge = charges.data.find((c) => c.paid && !c.refunded);
  if (!charge) {
    return NextResponse.json({ success: false, reason: "no_charge" });
  }

  const refund = await stripe.refunds.create({
    charge: charge.id,
    reason: "requested_by_customer",
  });

  await stripe.subscriptions.cancel(subId);

  const { error: updErr } = await (admin as any)
    .from("profiles")
    .update({
      subscription_status: "refunded",
      refunded_at: new Date().toISOString(),
      cancel_at_period_end: false,
      stripe_subscription_id: null,
    })
    .eq("id", user.id);

  if (updErr) {
    console.error("[refund] profile update", updErr);
    return NextResponse.json({ success: false, reason: "update_failed" }, { status: 500 });
  }

  const localeRaw = user.user_metadata?.locale;
  const locale: "nl" | "en" = localeRaw === "en" ? "en" : "nl";
  await sendRefundConfirmationEmail(user.email, locale);

  await captureServerEvent(user.id, "refund_requested", {
    days_since_signup: daysSinceSignupFromIso(row.created_at ?? undefined),
  });

  return NextResponse.json({ success: true, refund_id: refund.id });
}
