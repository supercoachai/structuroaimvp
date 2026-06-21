import posthog from "posthog-js";

/** Bewaart anonieme distinct_id voor cross-sessie merge bij login. */
export const ANON_DISTINCT_STORAGE_KEY = "structuro_ph_anon_did";

export function persistAnonymousDistinctIdForStitch(): void {
  if (typeof window === "undefined") return;
  try {
    const id = posthog.get_distinct_id?.();
    if (!id || typeof id !== "string") return;
    if (id.length < 8) return;
    localStorage.setItem(ANON_DISTINCT_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/**
 * Koppel anonieme acquisitie-events aan de ingelogde user.
 * Volgorde: alias (cross-sessie) → identify (zelfde sessie + person props).
 */
export function linkAnonymousDistinctToUser(
  userId: string,
  personProperties?: Record<string, unknown>,
  setOnceProperties?: Record<string, unknown>
): void {
  if (!userId) return;

  try {
    const stored = localStorage.getItem(ANON_DISTINCT_STORAGE_KEY);
    const current = posthog.get_distinct_id?.();
    const anonCandidate =
      stored && stored !== userId
        ? stored
        : current && current !== userId
          ? current
          : null;

    if (anonCandidate) {
      posthog.alias(userId, anonCandidate);
    }

    const personProps = personProperties ?? {};
    if (setOnceProperties && Object.keys(setOnceProperties).length > 0) {
      posthog.identify(userId, personProps, setOnceProperties);
    } else if (Object.keys(personProps).length > 0) {
      posthog.identify(userId, personProps);
    } else {
      posthog.identify(userId);
    }

    if (anonCandidate) {
      localStorage.removeItem(ANON_DISTINCT_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}
