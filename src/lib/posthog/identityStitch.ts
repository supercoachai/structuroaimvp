import posthog from "posthog-js";

import {
  clearAnonDistinctIdCookie,
  writeAnonDistinctIdCookie,
} from "@/lib/posthog/anonDistinctCookie";

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
    // Server-side alias na OAuth/magic link leest deze cookie in /auth/callback.
    writeAnonDistinctIdCookie(id);
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

    // Al geïdentificeerd als deze user: alleen person props bijwerken (bijv. $email).
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
    clearAnonDistinctIdCookie();
  } catch {
    /* ignore */
  }
}

/** Wis stitch-flags bij logout (naast posthog.reset()). */
export function clearIdentityStitchOnLogout(): void {
  removeStorage(IDENTIFIED_USER_STORAGE_KEY);
  removeStorage(ANON_DISTINCT_STORAGE_KEY);
  clearAnonDistinctIdCookie();
}

/**
 * Geeft de opgeslagen anonieme distinct_id terug voor meesturen met magic link.
 * Alleen zinvol als nog niet geïdentificeerd; anders null.
 */
export function getAnonymousDistinctIdForMagicLink(): string | null {
  if (typeof window === "undefined") return null;
  if (readStorage(IDENTIFIED_USER_STORAGE_KEY)) return null;
  try {
    const stored = readStorage(ANON_DISTINCT_STORAGE_KEY);
    if (stored && stored.length >= 8) return stored;
    const id = posthog.get_distinct_id?.();
    if (!id || typeof id !== "string" || id.length < 8) return null;
    return id;
  } catch {
    return null;
  }
}

function pendingAnonMetaKey(userId: string) {
  return `structuro_ph_pending_anon_${userId}`;
}

/**
 * Na cross-device magic link login: als er een posthog_anon_id in de
 * user_metadata zit (of eerder in localStorage is gesnapshot) én die
 * verschilt van de huidige distinct_id én we nog niet eerder aliased hebben,
 * stuur dan alias() om de personen te mergen.
 *
 * Snapshot meteen bij eerste session apply: latere updateUser({ data })
 * merge't meestal, maar kan op sommige configs metadata overschrijven.
 */
export function aliasAnonymousFromMetadataIfNeeded(
  userId: string,
  userMetadata: Record<string, unknown> | null | undefined
): void {
  const fromMeta = userMetadata?.posthog_anon_id;
  if (typeof fromMeta === "string" && fromMeta.length >= 8) {
    writeStorage(pendingAnonMetaKey(userId), fromMeta);
  }

  const anonId =
    (typeof fromMeta === "string" && fromMeta.length >= 8
      ? fromMeta
      : null) ?? readStorage(pendingAnonMetaKey(userId));
  if (!anonId || anonId.length < 8) return;

  try {
    const current = posthog.get_distinct_id?.();
    // Als de huidige distinct_id al de userId is (zelfde browser), is alias overbodig.
    if (current === userId) return;
    // Als de anonId dezelfde is als de huidige (nooit cross-device), is identify genoeg.
    if (current === anonId) return;

    const aliasedKey = `structuro_ph_aliased_${userId}`;
    if (readStorage(aliasedKey) === anonId) return;

    posthog.alias(anonId);
    writeStorage(aliasedKey, anonId);
    removeStorage(pendingAnonMetaKey(userId));
  } catch {
    /* ignore */
  }
}
