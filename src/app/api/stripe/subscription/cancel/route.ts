import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cancelSubscriptionAtPeriodEndForUser } from "@/lib/stripe/cancelSubscriptionAtPeriodEnd";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

export const runtime = "nodejs";

async function postCancelSubscription(_request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cancelSubscriptionAtPeriodEndForUser(user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking(
  "POST /api/stripe/subscription/cancel",
  postCancelSubscription
);
