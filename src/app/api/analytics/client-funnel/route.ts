import { NextResponse } from "next/server";

import { captureClientFunnelServer } from "@/lib/posthog/clientFunnelAnalytics";
import { parseClientFunnelPayload } from "@/lib/posthog/parseClientFunnelPayload";
import { captureServerException } from "@/lib/posthog/server";
import { extractRequestClientContext } from "@/lib/posthog/serverEventContext";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

async function postClientFunnel(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = parseClientFunnelPayload(body);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    await captureClientFunnelServer(
      parsed.event,
      parsed.payload,
      extractRequestClientContext(request)
    );
  } catch (error) {
    await captureServerException(error, {
      route: "POST /api/analytics/client-funnel",
      method: "POST",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking(
  "POST /api/analytics/client-funnel",
  postClientFunnel
);
