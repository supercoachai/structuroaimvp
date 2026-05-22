import { NextResponse } from "next/server";

import { captureServerException } from "@/lib/posthog/server";
import { isPosthogErrorTestAllowed } from "@/lib/posthog/errorTestAccess";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

export const runtime = "nodejs";

/**
 * Smoke-test voor PostHog Error Tracking (server-side).
 *
 * Preview: zet `POSTHOG_TEST_ENDPOINT=true` + `POSTHOG_ERROR_TEST_SECRET`, roep één keer aan:
 * `GET /api/posthog-error-test?secret=...` → exception in PostHog binnen ~30s.
 * Zet daarna flag uit vóór live (31 mei).
 */
async function getErrorTest(request: Request) {
  if (!isPosthogErrorTestAllowed(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stamp = new Date().toISOString();
  const message = `structuroai-mvp PostHog error smoke test @ ${stamp}`;

  await captureServerException(new Error(message), {
    route: "GET /api/posthog-error-test",
    extra: {
      test: true,
      source: "api/posthog-error-test",
      iso_timestamp: stamp,
    },
  });

  return NextResponse.json({
    ok: true,
    emitted: true,
    message,
    hint:
      "PostHog (EU) → Error Tracking: zoek op deze message of attribute source=api/posthog-error-test.",
  });
}

export const GET = withApiErrorTracking(
  "GET /api/posthog-error-test",
  getErrorTest
);
