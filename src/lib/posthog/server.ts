import { PostHog } from "posthog-node";

import { sanitizeExceptionContext } from "./sanitizeExceptionContext";

let _client: PostHog | null = null;

export function getPostHogServerClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!_client) {
    _client = new PostHog(key, {
      host: "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
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
    await client.flush();
  } catch {
    /* ignore */
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
  properties?: Record<string, unknown>
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    client.capture({ distinctId, event, properties });
    await client.flush();
  } catch {
    /* ignore */
  }
}
