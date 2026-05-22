import { SeverityNumber } from "@opentelemetry/api-logs";
import { NextResponse } from "next/server";
import {
  getPosthogOtelLogger,
  schedulePosthogOtelLogFlush,
} from "@/lib/posthog/otelLogs";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

export const runtime = "nodejs";

/**
 * Tijdelijke smoke-test voor PostHog Logs (OpenTelemetry).
 *
 * - Lokaal (`NODE_ENV=development`): GET zonder geheim.
 * - Productie: zet `POSTHOG_OTEL_LOG_TEST_SECRET` en roep aan met `?secret=...`.
 */
async function getOtelLogsTest(request: Request) {
  const isDev = process.env.NODE_ENV === "development";
  const testSecret = process.env.POSTHOG_OTEL_LOG_TEST_SECRET?.trim();
  const provided = new URL(request.url).searchParams.get("secret")?.trim() ?? "";

  if (!isDev) {
    if (!testSecret || provided !== testSecret) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const logger = getPosthogOtelLogger("posthog-otel-logs-test");
  const stamp = new Date().toISOString();
  const body = `structuroai-mvp OTEL logs smoke test @ ${stamp}`;

  logger?.emit({
    body,
    severityNumber: SeverityNumber.INFO,
    attributes: {
      source: "api/posthog-otel-logs-test",
      test: true,
      iso_timestamp: stamp,
    },
  });

  schedulePosthogOtelLogFlush();

  return NextResponse.json({
    ok: true,
    emitted: Boolean(logger),
    message: body,
    hint: logger
      ? "PostHog (EU) → Logs: zoek op deze tekst of attribute source=api/posthog-otel-logs-test."
      : "Geen loggerProvider: zet NEXT_PUBLIC_POSTHOG_KEY en herstart `next dev`.",
  });
}

export const GET = withApiErrorTracking(
  "GET /api/posthog-otel-logs-test",
  getOtelLogsTest
);
