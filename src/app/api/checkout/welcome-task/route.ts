import { createClient } from "@/lib/supabase/server";
import { welcomeTaskEnabledFromCheckoutMetadata } from "@/lib/onboardingWelcomeTask";
import { createStripeServerClient } from "@/lib/stripeServer";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { isRegistrationCheckoutEnabled } from "@/lib/stripe/registrationLaunch";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function getWelcomeTaskFromCheckout(request: Request) {
  if (!isRegistrationCheckoutEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "invalid_session_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const stripe = createStripeServerClient(key);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const sessionUserId =
    (typeof session.client_reference_id === "string" && session.client_reference_id) ||
    session.metadata?.supabase_user_id ||
    null;

  if (sessionUserId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    addWelcomeTask: welcomeTaskEnabledFromCheckoutMetadata(session.metadata),
  });
}

export const GET = withApiErrorTracking(
  "GET /api/checkout/welcome-task",
  getWelcomeTaskFromCheckout
);
