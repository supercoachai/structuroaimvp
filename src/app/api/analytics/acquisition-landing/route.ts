import { NextResponse } from "next/server";

import { captureAcquisitionLandingServer } from "@/lib/posthog/acquisitionAnalytics";
import { parseAcquisitionEventPayload } from "@/lib/posthog/parseAcquisitionPayload";
import { captureServerException } from "@/lib/posthog/server";
import { extractRequestClientContext } from "@/lib/posthog/serverEventContext";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

async function postAcquisitionLanding(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const payload = parseAcquisitionEventPayload(body);
  if (!payload) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    await captureAcquisitionLandingServer(
      payload,
      extractRequestClientContext(request)
    );
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
