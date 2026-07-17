import posthog from "posthog-js";

/** Bewaart anonieme distinct_id voor cross-sessie context (alleen vóór identify). */
export const ANON_DISTINCT_STORAGE_KEY = "structuro_ph_anon_did";

/** Laatste user.id waarvoor we al identify() hebben gedaan in deze browser. */
export const IDENTIFIED_USER_STORAGE_KEY = "structuro_ph_identified_uid";

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function removeStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Sla de anonieme distinct_id op zolang we nog niet geïdentificeerd zijn.
 * Na identify mag dit niet meer overschreven worden (voorkomt alias-churn).
 */
export function persistAnonymousDistinctIdForStitch(): void {
  if (typeof window === "undefined") return;
  if (readStorage(IDENTIFIED_USER_STORAGE_KEY)) return;

  try {
    const id = posthog.get_distinct_id?.();
    if (!id || typeof id !== "string") return;
    if (id.length < 8) return;
    writeStorage(ANON_DISTINCT_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/**
 * Koppel anonieme acquisitie-events aan de ingelogde user.
 * Alleen identify() – géén alias(). Herhaald alias() inflateert $create_alias
 * en fragmenteert identity (PostHog Scout / SDK guidance).
 */
export function linkAnonymousDistinctToUser(
  userId: string,
  personProperties?: Record<string, unknown>,
  setOnceProperties?: Record<string, unknown>
): void {
  if (!userId) return;

  try {
    const alreadyIdentified = readStorage(IDENTIFIED_USER_STORAGE_KEY) === userId;
    const current = posthog.get_distinct_id?.();
    const alreadyCurrent = typeof current === "string" && current === userId;
    const personProps = personProperties ?? {};
    const hasPersonProps = Object.keys(personProps).length > 0;
    const hasSetOnce =
      Boolean(setOnceProperties) && Object.keys(setOnceProperties!).length > 0;

    // Al geïdentificeerd als deze user: alleen person props bijwerken (bijv. e-mail na consent).
    if (alreadyIdentified && alreadyCurrent) {
      if (!hasPersonProps && !hasSetOnce) return;
      if (hasSetOnce) {
        posthog.identify(userId, personProps, setOnceProperties);
      } else {
        posthog.identify(userId, personProps);
      }
      return;
    }

    if (hasSetOnce) {
      posthog.identify(userId, personProps, setOnceProperties);
    } else if (hasPersonProps) {
      posthog.identify(userId, personProps);
    } else {
      posthog.identify(userId);
    }

    writeStorage(IDENTIFIED_USER_STORAGE_KEY, userId);
    removeStorage(ANON_DISTINCT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Wis stitch-flags bij logout (naast posthog.reset()). */
export function clearIdentityStitchOnLogout(): void {
  removeStorage(IDENTIFIED_USER_STORAGE_KEY);
  removeStorage(ANON_DISTINCT_STORAGE_KEY);
}
