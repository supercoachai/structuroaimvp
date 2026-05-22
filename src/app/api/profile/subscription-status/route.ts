import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

export const runtime = "nodejs";

/** Polling na Stripe-checkout: laatste subscription state voor ingelogde gebruiker. */
async function getSubscriptionStatus(_request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_current_period_end")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const status =
    profile && typeof profile.subscription_status === "string"
      ? profile.subscription_status
      : null;
  const current_period_end =
    profile?.subscription_current_period_end != null
      ? String(profile.subscription_current_period_end)
      : null;

  return NextResponse.json({ status, current_period_end });
}

export const GET = withApiErrorTracking(
  "GET /api/profile/subscription-status",
  getSubscriptionStatus
);
