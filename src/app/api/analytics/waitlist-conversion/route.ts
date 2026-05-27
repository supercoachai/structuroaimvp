import { NextResponse } from "next/server";

import { captureWaitlistSignupServer } from "@/lib/posthog/waitlistAnalytics";
import { waitlistCorsHeaders } from "@/lib/wachtlijst/cors";
import { sanitizeWaitlistSourceParam } from "@/lib/wachtlijst/source";

/** @deprecated Gebruik POST /api/waitlist/join; blijft voor backwards compat. */
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: waitlistCorsHeaders(request.headers.get("origin")),
  });
}

/** @deprecated Gebruik POST /api/waitlist/join */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400, headers: waitlistCorsHeaders(origin) }
    );
  }

  const raw =
    body && typeof body === "object" && "source" in body
      ? String((body as { source?: unknown }).source ?? "")
      : "";
  const siteRaw =
    body && typeof body === "object" && "site" in body
      ? String((body as { site?: unknown }).site ?? "")
      : "eu";
  const site = siteRaw === "ai" ? "ai" : "eu";
  const source = sanitizeWaitlistSourceParam(raw) || "direct";

  await captureWaitlistSignupServer({ source, site });

  return NextResponse.json({ ok: true }, { headers: waitlistCorsHeaders(origin) });
}
