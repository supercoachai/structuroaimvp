import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { createStripeServerClient, subscriptionCurrentPeriodEndUnix } from "@/lib/stripeServer";
import {
  captureServerEvent,
  daysSinceSignupFromIso,
} from "@/lib/posthog/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

function planFromPriceId(priceId: string): "monthly" | "yearly" | null {
  const m = process.env.STRIPE_PRICE_ID_MONTHLY;
  const y = process.env.STRIPE_PRICE_ID_YEARLY;
  if (m && priceId === m) return "monthly";
  if (y && priceId === y) return "yearly";
  return null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !key) {
    return NextResponse.json({ error: "Missing Stripe webhook config" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const stripe = createStripeServerClient(key);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
  }

  const sb = admin as unknown as {
    from: (name: string) => {
      insert: (row: { id: string }) => Promise<{ error: { code?: string; message: string } | null }>;
      delete: () => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  };

  const { error: insErr } = await sb.from("stripe_processed_events").insert({ id: event.id });
  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const profileDb = admin as any;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.supabase_user_id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subRef = session.subscription;
        const subId =
          typeof subRef === "string" ? subRef : subRef && "id" in subRef ? subRef.id : null;
        if (!userId || !customerId || !subId) {
          break;
        }
        const subscription = await stripe.subscriptions.retrieve(subId);
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = planFromPriceId(priceId ?? "");
        const periodEnd = new Date(
          subscriptionCurrentPeriodEndUnix(subscription) * 1000
        ).toISOString();
        const cancelAtEnd = Boolean(subscription.cancel_at_period_end);

        await profileDb
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_plan: plan,
            stripe_customer_id: customerId,
            stripe_subscription_id: subId,
            subscription_started_at: new Date().toISOString(),
            subscription_current_period_end: periodEnd,
            cancel_at_period_end: cancelAtEnd,
          })
          .eq("id", userId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;
        if (!customerId) break;

        let status: string;
        if (subscription.status === "past_due") {
          status = "past_due";
        } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
          status = "cancelled";
        } else if (subscription.status === "active" || subscription.status === "trialing") {
          status = subscription.cancel_at_period_end ? "cancelled" : "active";
        } else {
          status = "none";
        }

        const priceId = subscription.items.data[0]?.price?.id;
        const plan = planFromPriceId(priceId ?? "");

        const { error: upErr } = await profileDb
          .from("profiles")
          .update({
            subscription_status: status,
            subscription_plan: plan,
            stripe_subscription_id: subscription.id,
            subscription_current_period_end: new Date(
              subscriptionCurrentPeriodEndUnix(subscription) * 1000
            ).toISOString(),
            cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
          })
          .eq("stripe_customer_id", customerId);
        if (upErr) {
          console.error("subscription.updated profile update", upErr);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;
        if (!customerId) break;

        const { data: deletedProf } = await profileDb
          .from("profiles")
          .select("id, created_at")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        const periodEndSec = subscriptionCurrentPeriodEndUnix(subscription);
        const periodEnd = new Date(periodEndSec * 1000).toISOString();
        const pastPeriod = Date.now() > periodEndSec * 1000;
        const nextStatus = pastPeriod ? "expired" : "cancelled";
        await profileDb
          .from("profiles")
          .update({
            subscription_status: nextStatus,
            subscription_current_period_end: periodEnd,
            stripe_subscription_id: null,
            cancel_at_period_end: false,
          })
          .eq("stripe_customer_id", customerId);

        const delRow = deletedProf as { id: string; created_at: string | null } | null;
        if (delRow?.id) {
          await captureServerEvent(delRow.id, "subscription_cancelled", {
            days_since_signup: daysSinceSignupFromIso(delRow.created_at ?? undefined),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;
        await profileDb
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;
        let periodEndIso: string | undefined;
        const subRef = invoice.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          periodEndIso = new Date(subscriptionCurrentPeriodEndUnix(sub) * 1000).toISOString();
        }
        await profileDb
          .from("profiles")
          .update({
            subscription_status: "active",
            ...(periodEndIso ? { subscription_current_period_end: periodEndIso } : {}),
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const customerId =
          typeof charge.customer === "string"
            ? charge.customer
            : charge.customer?.id ?? null;
        if (!customerId) break;
        await profileDb
          .from("profiles")
          .update({
            subscription_status: "refunded",
            refunded_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("stripe webhook handler", event.type, err);
    await sb.from("stripe_processed_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
