import { NextResponse } from "next/server";

import {
  captureAcquisitionLandingServer,
  captureAcquisitionSignupStartedServer,
  type AcquisitionEventPayload,
} from "@/lib/posthog/acquisitionAnalytics";
import { captureServerException } from "@/lib/posthog/server";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

// UUID v1-v8: PostHog's anonieme distinct_id is v7, losse acquisitie-id's zijn v4.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitize(raw: unknown, max = 128): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, max).replace(/[^a-zA-Z0-9_\-./:?&=%]/g, "");
}

function parsePayload(body: unknown): AcquisitionEventPayload | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const visitor_id = sanitize(b.visitor_id, 64);
  if (!UUID_RE.test(visitor_id)) return null;

  const landing_path = sanitize(b.landing_path, 200);
  if (!landing_path.startsWith("/")) return null;

  const source = sanitize(b.source, 64) || "direct";

  return {
    visitor_id,
    landing_path,
    source,
    utm_source: sanitize(b.utm_source as string) || null,
    utm_campaign: sanitize(b.utm_campaign as string) || null,
    utm_medium: sanitize(b.utm_medium as string) || null,
    utm_content: sanitize(b.utm_content as string) || null,
    referrer_domain: sanitize(b.referrer_domain as string) || null,
    is_tiktok: b.is_tiktok === true,
    has_ttclid: b.has_ttclid === true,
    entry_url: sanitize(b.entry_url as string, 512) || null,
  };
}

async function postAcquisitionLanding(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const payload = parsePayload(body);
  if (!payload) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    await captureAcquisitionLandingServer(payload);
  } catch (error) {
    await captureServerException(error, {
      route: "POST /api/analytics/acquisition-landing",
      method: "POST",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking(
  "POST /api/analytics/acquisition-landing",
  postAcquisitionLanding
);
