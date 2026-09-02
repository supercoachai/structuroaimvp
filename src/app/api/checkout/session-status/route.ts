import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  CHECKOUT_RESUME_COOKIE,
  decideCheckoutResumeMint,
} from "@/lib/checkoutResumeBinding";
import { welcomeTaskEnabledFromCheckoutMetadata } from "@/lib/onboardingWelcomeTask";
import { createStripeServerClient } from "@/lib/stripeServer";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { isRegistrationCheckoutEnabled } from "@/lib/stripe/registrationLaunch";

export const runtime = "nodejs";

/** Betaald-boolean na checkout. Vereist resume-cookie of ingelogde eigenaar. */
async function getCheckoutSessionStatus(request: Request) {
  if (!isRegistrationCheckoutEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "invalid_session_id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const resumeCookie = cookieStore.get(CHECKOUT_RESUME_COOKIE)?.value ?? null;
  const alreadyBound =
    decideCheckoutResumeMint({
      cookieToken: resumeCookie,
      sessionId,
      userId: null,
      stripeClientReferenceId: null,
    }) === "already_bound";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!alreadyBound && !user?.id) {
    return NextResponse.json({ error: "session_not_bound" }, { status: 403 });
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

  if (!alreadyBound) {
    const ownerId =
      (typeof session.client_reference_id === "string" &&
        session.client_reference_id) ||
      session.metadata?.supabase_user_id ||
      null;
    if (
      decideCheckoutResumeMint({
        cookieToken: resumeCookie,
        sessionId,
        userId: user?.id,
        stripeClientReferenceId: typeof ownerId === "string" ? ownerId : null,
      }) !== "owner"
    ) {
      return NextResponse.json({ error: "session_not_bound" }, { status: 403 });
    }
  }

  const paid =
    session.payment_status === "paid" || session.status === "complete";

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
