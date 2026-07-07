import posthog from "posthog-js";

/**
 * Koppelt de ingelogde user aan PostHog via identify().
 *
 * identify() merget de huidige anonieme distinct_id automatisch in user.id
 * (anoniem → geïdentificeerd) op het moment van login. Een expliciete alias()
 * is daarmee overbodig én schadelijk: die vuurde op elke auth-state-change,
 * token-refresh en consent-wijziging opnieuw en produceerde tientallen dubbele
 * $create_alias-events per sessie. Dat vervuilde de identity-graph en elke
 * distinct-user-metric. Daarom gebruiken we hier bewust alléén identify().
 */
export function linkAnonymousDistinctToUser(
  userId: string,
  personProperties?: Record<string, unknown>,
  setOnceProperties?: Record<string, unknown>
): void {
  if (!userId) return;

  try {
    const personProps = personProperties ?? {};
    if (setOnceProperties && Object.keys(setOnceProperties).length > 0) {
      posthog.identify(userId, personProps, setOnceProperties);
    } else if (Object.keys(personProps).length > 0) {
      posthog.identify(userId, personProps);
    } else {
      posthog.identify(userId);
    }
  } catch {
    /* ignore */
  }
}
