import { NextResponse } from "next/server";

import {
  captureAcquisitionCtaClickedServer,
  type AcquisitionEventPayload,
} from "@/lib/posthog/acquisitionAnalytics";
import { parseAcquisitionEventPayload } from "@/lib/posthog/parseAcquisitionPayload";
import { captureServerException } from "@/lib/posthog/server";
import { extractRequestClientContext } from "@/lib/posthog/serverEventContext";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

function parseCtaPayload(
  body: unknown
): { payload: AcquisitionEventPayload; channel: "tiktok" | "organic" } | null {
  if (!body || typeof body !== "object") return null;
  const channelRaw = (body as Record<string, unknown>).channel;
  const channel = channelRaw === "organic" ? "organic" : channelRaw === "tiktok" ? "tiktok" : null;
  if (!channel) return null;
  const payload = parseAcquisitionEventPayload(body);
  if (!payload) return null;
  return { payload, channel };
}

async function postAcquisitionCtaClicked(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = parseCtaPayload(body);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    await captureAcquisitionCtaClickedServer(
      parsed.payload,
      parsed.channel,
      extractRequestClientContext(request)
    );
  } catch (error) {
    await captureServerException(error, {
      route: "POST /api/analytics/acquisition-cta-clicked",
      method: "POST",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking(
  "POST /api/analytics/acquisition-cta-clicked",
  postAcquisitionCtaClicked
);
