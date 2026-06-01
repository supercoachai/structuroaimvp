import { NextResponse } from "next/server";

import { createLocalDevUser, isLocalDevSignupEnabled } from "@/lib/dev/localSignup";
import { captureRegistrationFunnelServer } from "@/lib/posthog/registrationFunnelAnalytics";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

async function postDevSignup(request: Request) {
  if (!isLocalDevSignupEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const result = await createLocalDevUser({
    email: String(raw.email ?? ""),
    password: String(raw.password ?? ""),
    fullName: String(raw.full_name ?? raw.fullName ?? ""),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    await captureRegistrationFunnelServer(result.userId, "signup_completed", {
      source: "direct",
      channel: "server",
      dev_signup: true,
    });
  } catch {
    /* PostHog best-effort */
  }

  return NextResponse.json({ ok: true, userId: result.userId });
}

export const POST = withApiErrorTracking("POST /api/dev/signup", postDevSignup);
