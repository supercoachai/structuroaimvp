import { PostHog } from "posthog-node";
import { after } from "next/server";

import { sanitizeExceptionContext } from "./sanitizeExceptionContext";
import {
  type ServerEventRequestContext,
  withRequestClientContext,
  withServerEventContext,
} from "./serverEventContext";

let _client: PostHog | null = null;

export function getPostHogServerClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!_client) {
    _client = new PostHog(key, {
      host: "https://eu.i.posthog.com",
      // Batch i.p.v. flush per event: voorkomt AbortError wanneer serverless bevriest.
      flushAt: 15,
      flushInterval: 5000,
    });
  }
  return _client;
}

/** Flush na response (zelfde patroon als schedulePosthogOtelLogFlush). */
function schedulePostHogServerFlush(client: PostHog): void {
  try {
    after(async () => {
      try {
        await client.flush();
      } catch {
        /* ignore */
      }
    });
  } catch {
    void client.flush().catch(() => {});
  }
}

function getClient(): PostHog | null {
  return getPostHogServerClient();
}

export type ServerExceptionContext = {
  route?: string;
  method?: string;
  sessionId?: string | null;
  extra?: Record<string, unknown>;
};

/**
 * Server-side exception capture (Sentry-achtig). Geen user IDs; optioneel $session_id.
 */
export async function captureServerException(
  error: unknown,
  context?: ServerExceptionContext
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const err = error instanceof Error ? error : new Error(String(error));
  const sanitized = sanitizeExceptionContext(context?.extra);
  const properties: Record<string, unknown> = {
    ...sanitized,
    error_tracking: true,
    legitimate_interest: true,
    runtime: "nodejs",
    release:
      process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
      "local",
    environment:
      process.env.VERCEL_ENV?.trim() ||
      process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() ||
      "development",
  };
  if (context?.route) properties.route = context.route;
  if (context?.method) properties.method = context.method;
  if (context?.sessionId) properties.$session_id = context.sessionId;

  const distinctId = context?.sessionId ?? "server-anonymous";

  try {
    client.captureException(err, distinctId, properties);
    schedulePostHogServerFlush(client);
  } catch (captureErr) {
    /* Fallback als captureException faalt (bijv. ontbrekende errorPropertiesBuilder na bundling). */
    try {
      await captureServerEvent(distinctId, "$exception", {
        ...properties,
        $exception_message: err.message,
        $exception_type: err.name,
        $exception_stack_trace_raw: err.stack ?? "",
        error_tracking: true,
        legitimate_interest: true,
        runtime: "nodejs",
        capture_exception_fallback: true,
        capture_exception_error:
          captureErr instanceof Error ? captureErr.message : String(captureErr),
      });
    } catch {
      /* ignore */
    }
  }
}

export function daysSinceSignupFromIso(
  createdAtIso: string | null | undefined
): number {
  if (!createdAtIso) return 0;
  const t = new Date(createdAtIso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

/**
 * Server-side product events (Stripe). Gebruikt dezelfde project key als de client.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
  requestContext?: ServerEventRequestContext | null
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    client.capture({
      distinctId,
      event,
      properties: withRequestClientContext(
        withServerEventContext(properties),
        requestContext
      ),
    });
    schedulePostHogServerFlush(client);
  } catch {
    /* ignore */
  }
}
