import { createClient } from "@/lib/supabase/server";
import { resolveProfileSignupSource } from "@/lib/posthog/signupAttribution";
import {
  DEFAULT_STRIPE_TRIAL_DAYS,
  resolveStripeTrialDaysForSignupSource,
} from "@/lib/stripe/trialConfig";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function getTrialConfig() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("signup_source, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const signupSource = resolveProfileSignupSource(
    profile?.signup_source as string | null,
    user.user_metadata as Record<string, unknown> | undefined
  );
  const status = (profile?.subscription_status as string | null) ?? null;

  const trialDays =
    status === "none" || status === null
      ? resolveStripeTrialDaysForSignupSource(signupSource)
      : 0;

  return NextResponse.json({
    trialDays,
    defaultTrialDays: DEFAULT_STRIPE_TRIAL_DAYS,
    signupSource,
    monthlyPriceEur: "12,99",
    hasSubscription: status !== "none" && status !== null,
  });
}

export const GET = withApiErrorTracking("GET /api/trial/config", getTrialConfig);
