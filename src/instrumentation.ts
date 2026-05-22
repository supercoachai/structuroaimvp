import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

import { captureServerException } from "@/lib/posthog/server";
import { extractPostHogSessionIdFromCookieHeader } from "@/lib/posthog/postHogCookie";

const DEFAULT_POSTHOG_LOGS_URL = "https://eu.i.posthog.com/i/v1/logs";

function createLoggerProvider(): LoggerProvider | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;

  const url =
    process.env.POSTHOG_OTEL_LOGS_URL?.trim() || DEFAULT_POSTHOG_LOGS_URL;

  return new LoggerProvider({
    resource: resourceFromAttributes({ "service.name": "structuroai-mvp" }),
    processors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url,
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
        }),
      ),
    ],
  });
}

/**
 * Buiten `register()` gezet zodat route handlers kunnen flushen voordat serverless bevriest.
 * Blijft `null` zolang er geen `NEXT_PUBLIC_POSTHOG_KEY` is of runtime ≠ nodejs.
 */
export let loggerProvider: LoggerProvider | null = null;

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (loggerProvider) return;

  const provider = createLoggerProvider();
  if (!provider) return;

  loggerProvider = provider;
  logs.setGlobalLoggerProvider(provider);
}

type RequestErrorContext = {
  routerKind?: string;
  routePath?: string;
  routeType?: string;
};

/**
 * Next.js hook voor onverwachte server/render errors (Sentry.captureException-stijl).
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: { cookie?: string | string[] } },
  context: RequestErrorContext
): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const cookieHeader = Array.isArray(request.headers.cookie)
    ? request.headers.cookie.join("; ")
    : request.headers.cookie;

  await captureServerException(err, {
    route: request.path,
    method: request.method,
    sessionId: extractPostHogSessionIdFromCookieHeader(cookieHeader),
    extra: {
      router_kind: context.routerKind,
      route_path: context.routePath,
      route_type: context.routeType,
    },
  });
}
