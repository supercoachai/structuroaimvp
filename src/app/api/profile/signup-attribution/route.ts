import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import {
  sanitizeSignupAttributionValue,
  shouldApplySignupAttributionWrite,
} from "@/lib/signupAttributionWritePolicy";

export const runtime = "nodejs";

async function postSignupAttribution(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { source?: unknown; utm_campaign?: unknown };
  try {
    body = (await request.json()) as {
      source?: unknown;
      utm_campaign?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const proposed = sanitizeSignupAttributionValue(
    typeof body.source === "string" ? body.source : ""
  );
  const campaign = sanitizeSignupAttributionValue(
    typeof body.utm_campaign === "string" ? body.utm_campaign : ""
  );

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "server_error" }, { status: 503 });
  }

  const { data: profile, error: readError } = await admin
    .from("profiles")
    .select("signup_source")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("[signup-attribution] read", readError.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const decision = shouldApplySignupAttributionWrite({
    currentSource: (profile?.signup_source as string | null) ?? null,
    proposedSource: proposed,
  });

  if (decision === "already_set") {
    return NextResponse.json({ ok: true });
  }
  if (decision === "skip_empty") {
    return NextResponse.json({ error: "invalid_source" }, { status: 400 });
  }
  if (decision === "reject_entitlement") {
    return NextResponse.json({ error: "forbidden_source" }, { status: 403 });
  }

  const { data: written, error: writeError } = await admin
    .from("profiles")
    .update({
      signup_source: proposed,
      ...(campaign ? { signup_utm_campaign: campaign } : {}),
    })
    .eq("id", user.id)
    .is("signup_source", null)
    .select("id");

  if (writeError) {
    console.error("[signup-attribution] write", writeError.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!written || written.length === 0) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking(
  "POST /api/profile/signup-attribution",
  postSignupAttribution
);
