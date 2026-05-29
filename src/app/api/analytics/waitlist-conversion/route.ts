import { NextResponse } from "next/server";

import { captureWaitlistSignupServer } from "@/lib/posthog/waitlistAnalytics";
import { captureServerException } from "@/lib/posthog/server";
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

  try {
    await captureWaitlistSignupServer({ source, site });
  } catch (error) {
    // CORS-headers behouden: deze route wordt cross-origin aangeroepen vanaf de EU-landing,
    // anders kan de browser de respons niet lezen. onRequestError vangt de throw ook,
    // maar we sturen hier expliciet naar PostHog met route-context.
    await captureServerException(error, {
      route: "POST /api/analytics/waitlist-conversion",
      method: "POST",
    });
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500, headers: waitlistCorsHeaders(origin) }
    );
  }

  return NextResponse.json({ ok: true }, { headers: waitlistCorsHeaders(origin) });
}
