import { after } from "next/server";

import { normalizeAnonDistinctId } from "@/lib/posthog/anonDistinctCookie";
import { getPostHogServerClient } from "@/lib/posthog/server";

/**
 * Koppel anonieme server-side funnel-events (visitor_id) aan de ingelogde user.
 *
 * Client-side identify()/alias() faalt bij cookieless/auto-deny: er zijn sinds
 * de acquisitie-launch vrijwel geen $identify/$create_alias events. Alle
 * funnel-events gaan via posthog-node, dus de merge moet ook server-side.
 *
 * distinctId = canonical user.id, alias = anonieme visitor/posthog id.
 */
export async function aliasAnonymousDistinctToUserServer(
  userId: string,
  anonDistinctId: string | null | undefined
): Promise<boolean> {
  const anonId = normalizeAnonDistinctId(anonDistinctId);
  if (!userId || !anonId) return false;
  if (anonId === userId.toLowerCase()) return false;

  const client = getPostHogServerClient();
  if (!client) return false;

  try {
    client.alias({
      distinctId: userId,
      alias: anonId,
    });
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
    return true;
  } catch {
    return false;
  }
}

/**
 * Eerste geldige anon-id uit metadata / cookie / next-path / request body.
 * Sla geen user.id als "anon" op.
 */
export function resolveAnonDistinctIdForAlias(input: {
  userId: string;
  fromMetadata?: unknown;
  fromCookie?: string | null;
  fromNextPath?: string | null;
  fromBody?: string | null;
}): string | null {
  const candidates = [
    input.fromMetadata,
    input.fromCookie,
    input.fromNextPath,
    input.fromBody,
  ];
  for (const raw of candidates) {
    const id = normalizeAnonDistinctId(
      typeof raw === "string" ? raw : null
    );
    if (id && id !== input.userId.toLowerCase()) return id;
  }
  return null;
}
