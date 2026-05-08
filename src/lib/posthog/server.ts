import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

function getClient(): PostHog | null {
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
