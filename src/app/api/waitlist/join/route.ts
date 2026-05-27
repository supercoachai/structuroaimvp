import { NextResponse } from "next/server";

import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { waitlistCorsHeaders } from "@/lib/wachtlijst/cors";
import { joinWaitlistCore } from "@/lib/wachtlijst/joinWaitlistCore";
import { getClientIp, isWaitlistRateLimited } from "@/lib/wachtlijst/rateLimit";

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null
): NextResponse {
  return NextResponse.json(body, { status, headers: waitlistCorsHeaders(origin) });
}

async function optionsWaitlistJoin(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: waitlistCorsHeaders(request.headers.get("origin")),
  });
}

async function postWaitlistJoin(request: Request) {
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

  const raw = body as Record<string, unknown>;
  const site = raw.site === "ai" ? "ai" : "eu";

  const result = await joinWaitlistCore({
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    source: raw.source != null ? String(raw.source) : undefined,
    site,
  });

  if (result.ok) {
    return jsonResponse({ ok: true, firstName: result.firstName }, 200, origin);
  }

  const status =
    result.type === "validation"
      ? 400
      : result.type === "already_exists"
        ? 409
        : result.type === "rate_limited"
          ? 429
          : 500;

  return jsonResponse(
    { ok: false, error: result.type, message: result.message ?? null },
    status,
    origin
  );
}

export const OPTIONS = withApiErrorTracking(
  "OPTIONS /api/waitlist/join",
  optionsWaitlistJoin
);
export const POST = withApiErrorTracking("POST /api/waitlist/join", postWaitlistJoin);
