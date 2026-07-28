import { NextResponse } from "next/server";

import { cancelSubscriptionAtPeriodEndForUser } from "@/lib/stripe/cancelSubscriptionAtPeriodEnd";
import { verifySubscriptionCancelToken } from "@/lib/stripe/subscriptionCancelToken";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { captureServerEvent } from "@/lib/posthog/server";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function postOneClickCancel(request: Request) {
  let body: { token?: string } = {};
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const userId = verifySubscriptionCancelToken(body.token);
  if (!userId) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const result = await cancelSubscriptionAtPeriodEndForUser(userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    await captureServerEvent(userId, ANALYTICS_EVENTS.trial_cancelled_one_click, {
      channel: "server",
      subscription_id: result.subscriptionId,
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking(
  "POST /api/subscription/one-click-cancel",
  postOneClickCancel
);
