import { NextResponse } from "next/server";

import { requestPasswordResetEmail } from "@/lib/auth/passwordResetRequest";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { getClientIp, isWaitlistRateLimited } from "@/lib/wachtlijst/rateLimit";

function mapResetError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") && m.includes("email")) {
    return "rate_limit_email";
  }
  if (m.includes("rate limit")) {
    return "rate_limit";
  }
  return "send_failed";
}

async function postRequestPasswordReset(request: Request) {
  const clientIp = getClientIp(request);
  if (isWaitlistRateLimited(clientIp)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email =
    body &&
    typeof body === "object" &&
    "email" in body &&
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email
      : null;

  if (!email?.trim()) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  // Direct naar client-pagina: Supabase zet recovery-tokens in de URL-hash (#).
  // Via /auth/callback verliest de server die hash en krijg je ten onrechte missing_code.
  const redirectTo = `${origin}/auth/wachtwoord-instellen`;

  try {
    const result = await requestPasswordResetEmail({
      email,
      redirectTo,
      clientIp,
    });

    if (!result.ok) {
      const status = result.error === "not_configured" ? 503 : 400;
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "send_failed";
    const code = mapResetError(message);
    const status = code.startsWith("rate_limit") ? 429 : 502;
    return NextResponse.json({ ok: false, error: code }, { status });
  }
}

export const POST = withApiErrorTracking(
  "/api/auth/request-password-reset",
  postRequestPasswordReset
);
