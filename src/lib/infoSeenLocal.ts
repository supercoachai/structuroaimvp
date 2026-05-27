/** Eerste-bezoek hint voor info-icoon animatie (per apparaat). */
const INFO_SEEN_PREFIX = "info_seen_";
const INFO_DISMISSED_PREFIX = "info_dismissed_";

export function hasInfoSeenLocally(infoId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(`${INFO_SEEN_PREFIX}${infoId}`) === "true";
  } catch {
    return true;
  }
}

export function markInfoSeenLocally(infoId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${INFO_SEEN_PREFIX}${infoId}`, "true");
  } catch {
    /* ignore */
  }
}

export function loadDismissedInfoKeysLocally(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${INFO_DISMISSED_PREFIX}all`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is string => typeof k === "string" && k.length > 0);
  } catch {
    return [];
  }
}

export function dismissInfoKeyLocally(infoId: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadDismissedInfoKeysLocally();
    if (current.includes(infoId)) return;
    localStorage.setItem(
      `${INFO_DISMISSED_PREFIX}all`,
      JSON.stringify([...current, infoId])
    );
  } catch {
    /* ignore */
  }
}
