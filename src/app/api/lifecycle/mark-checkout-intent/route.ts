import { NextResponse } from "next/server";

import { markCheckoutStartedAt } from "@/lib/lifecycleMail/markCheckoutStarted";
import { createClient } from "@/lib/supabase/server";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Markeer paywall-/checkout-intent (eerste keer /abonnement card-trial).
 * Idempotent. Auth: ingelogde user.
 */
async function postMarkCheckoutIntent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await markCheckoutStartedAt(user.id);
  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking(
  "POST /api/lifecycle/mark-checkout-intent",
  postMarkCheckoutIntent
);
