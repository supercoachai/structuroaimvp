import { NextResponse } from "next/server";

import {
  coachAanvraagMail,
  coachAanvraagToAddress,
  parseCoachAanvraag,
} from "@/lib/coachAanvraag/parseCoachAanvraag";
import { sendResendEmail } from "@/lib/email/resendClient";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { waitlistCorsHeaders } from "@/lib/wachtlijst/cors";
import { getClientIp, isWaitlistRateLimited } from "@/lib/wachtlijst/rateLimit";

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null
): NextResponse {
  return NextResponse.json(body, { status, headers: waitlistCorsHeaders(origin) });
}

async function optionsCoachAanvraag(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: waitlistCorsHeaders(request.headers.get("origin")),
  });
}

async function postCoachAanvraag(request: Request) {
  const origin = request.headers.get("origin");

  if (isWaitlistRateLimited(getClientIp(request))) {
    return jsonResponse({ ok: false, error: "rate_limited" }, 429, origin);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400, origin);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse({ ok: false, error: "invalid_body" }, 400, origin);
  }

  const parsed = parseCoachAanvraag(body as Record<string, unknown>);
  if (!parsed.ok) {
    return jsonResponse({ ok: false, error: "validation" }, 400, origin);
  }
  if (parsed.honeypot) {
    return jsonResponse({ ok: true }, 200, origin);
  }

  const { subject, text } = coachAanvraagMail(parsed.fields);
  const sent = await sendResendEmail({
    to: coachAanvraagToAddress(),
    subject,
    text,
    replyTo: parsed.fields.email,
    tags: [{ name: "kind", value: "coach_aanvraag" }],
  });

  if (!sent.ok) {
    return jsonResponse({ ok: false, error: "send_failed" }, 502, origin);
  }
  if (sent.skipped && process.env.VERCEL_ENV === "production") {
    return jsonResponse({ ok: false, error: "not_configured" }, 503, origin);
  }

  return jsonResponse({ ok: true }, 200, origin);
}

export const OPTIONS = withApiErrorTracking(
  "OPTIONS /api/coach-aanvraag",
  optionsCoachAanvraag
);
export const POST = withApiErrorTracking(
  "POST /api/coach-aanvraag",
  postCoachAanvraag
);
