import type { Logger } from "@opentelemetry/api-logs";
import { after } from "next/server";
import { loggerProvider } from "@/instrumentation";

/** Server-side OTEL-logger naar PostHog Logs (alleen als instrumentation actief is). */
export function getPosthogOtelLogger(scope?: string): Logger | undefined {
  return loggerProvider?.getLogger(scope ?? "structuroai-mvp");
}

/**
 * Batch-processor stuurt logs pas na flush; in Route Handlers moet dit na de response,
 * anders bevriest de functie te vroeg. Zie PostHog Next.js logs-docs.
 */
export function schedulePosthogOtelLogFlush(): void {
  after(async () => {
    await loggerProvider?.forceFlush();
  });
}
