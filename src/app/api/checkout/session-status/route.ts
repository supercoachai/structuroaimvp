import { welcomeTaskEnabledFromCheckoutMetadata } from "@/lib/onboardingWelcomeTask";
import { createStripeServerClient } from "@/lib/stripeServer";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { isRegistrationCheckoutEnabled } from "@/lib/stripe/registrationLaunch";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Publiek: Stripe session_id fungeert als eenmalig token na checkout. */
async function getCheckoutSessionStatus(request: Request) {
  if (!isRegistrationCheckoutEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "invalid_session_id" }, { status: 400 });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const stripe = createStripeServerClient(key);
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  const paid =
    session.payment_status === "paid" ||
    session.status === "complete";

  return NextResponse.json({
    paid,
    status: session.status,
    payment_status: session.payment_status,
    addWelcomeTask: welcomeTaskEnabledFromCheckoutMetadata(session.metadata),
  });
}

export const GET = withApiErrorTracking(
  "GET /api/checkout/session-status",
  getCheckoutSessionStatus
);
