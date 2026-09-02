import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  CHECKOUT_RESUME_COOKIE,
  attachCheckoutResumeCookie,
  decideCheckoutResumeMint,
} from "@/lib/checkoutResumeBinding";
import { createStripeServerClient } from "@/lib/stripeServer";
import { isRegistrationCheckoutEnabled } from "@/lib/stripe/registrationLaunch";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

export const runtime = "nodejs";

const MAX_SESSION_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * Bevestigt of ververst de resume-cookie. Mint nooit een cookie op alleen cs_.
 */
async function postBindSession(request: Request) {
  if (!isRegistrationCheckoutEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  let body: { session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const sessionId = body.session_id?.trim();
  if (!sessionId?.startsWith("cs_")) {
    return NextResponse.json({ error: "invalid_session_id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const resumeCookie = cookieStore.get(CHECKOUT_RESUME_COOKIE)?.value ?? null;

  if (decideCheckoutResumeMint({
    cookieToken: resumeCookie,
    sessionId,
    userId: null,
    stripeClientReferenceId: null,
  }) === "already_bound") {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "session_not_bound" }, { status: 403 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const stripe = createStripeServerClient(stripeKey);
  let checkoutSession;
  try {
    checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  const ownerId =
    (typeof checkoutSession.client_reference_id === "string" &&
      checkoutSession.client_reference_id) ||
    checkoutSession.metadata?.supabase_user_id ||
    null;

  if (
    decideCheckoutResumeMint({
      cookieToken: resumeCookie,
      sessionId,
      userId: user.id,
      stripeClientReferenceId: typeof ownerId === "string" ? ownerId : null,
    }) !== "owner"
  ) {
    return NextResponse.json({ error: "session_not_bound" }, { status: 403 });
  }

  const paid =
    checkoutSession.payment_status === "paid" ||
    checkoutSession.status === "complete";
  if (!paid) {
    return NextResponse.json({ error: "payment_not_complete" }, { status: 409 });
  }

  const createdMs = (checkoutSession.created ?? 0) * 1000;
  if (Date.now() - createdMs > MAX_SESSION_AGE_MS) {
    return NextResponse.json({ error: "session_expired" }, { status: 410 });
  }

  const res = NextResponse.json({ ok: true });
  return attachCheckoutResumeCookie(res, sessionId);
}

export const POST = withApiErrorTracking(
  "POST /api/checkout/bind-session",
  postBindSession
);
