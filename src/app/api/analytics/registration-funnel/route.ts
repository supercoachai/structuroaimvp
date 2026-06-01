import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  captureRegistrationFunnelServer,
  type RegistrationFunnelEvent,
} from "@/lib/posthog/registrationFunnelAnalytics";
import { captureServerException } from "@/lib/posthog/server";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { isRegistrationCheckoutEnabled } from "@/lib/stripe/registrationLaunch";
import type { RegisterPlanId } from "@/lib/stripe/registerPlans";

function isPlanId(v: unknown): v is RegisterPlanId {
  return v === "monthly" || v === "yearly";
}

async function postRegistrationFunnel(request: Request) {
  if (!isRegistrationCheckoutEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" && "event" in body
      ? String((body as { event?: unknown }).event ?? "")
      : "";

  if (raw !== "signup_completed" && raw !== "registreren_plan_viewed") {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const event = raw as RegistrationFunnelEvent;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const b = body as Record<string, unknown>;
  const source =
    typeof b.source === "string" && b.source.trim()
      ? b.source.trim().slice(0, 64)
      : undefined;
  const utmCampaign =
    typeof b.utm_campaign === "string" && b.utm_campaign.trim()
      ? b.utm_campaign.trim().slice(0, 64)
      : b.utm_campaign === null
        ? null
        : undefined;
  const planId = isPlanId(b.plan_id) ? b.plan_id : undefined;
  const defaultPlanId = isPlanId(b.default_plan_id) ? b.default_plan_id : undefined;

  const properties: Record<string, unknown> = {};
  if (source) properties.source = source;
  if (utmCampaign !== undefined) properties.utm_campaign = utmCampaign;
  if (planId) properties.plan_id = planId;
  if (defaultPlanId) properties.default_plan_id = defaultPlanId;
  if (b.cancelled === true) properties.cancelled = true;
  if (b.resume === true) properties.resume = true;

  if (event === "registreren_plan_viewed" && !planId) {
    properties.default_plan_id = defaultPlanId ?? "monthly";
  }

  try {
    await captureRegistrationFunnelServer(user.id, event, properties);
  } catch (error) {
    await captureServerException(error, {
      route: "POST /api/analytics/registration-funnel",
      method: "POST",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking(
  "POST /api/analytics/registration-funnel",
  postRegistrationFunnel
);
