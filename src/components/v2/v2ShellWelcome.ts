/**
 * Eenmalige welkom-sheet na v2-shell update.
 * Elke ingelogde klant ziet dit één keer na deploy; daarna dismiss per userId.
 * Geen created_at-filter: cutover geldt voor iedereen die de nieuwe shell binnenkomt.
 */

const STORAGE_PREFIX = "v2_shell_welcome_seen:";

/** Bump dit bij een volgende shell-update die opnieuw een welkom verdient. */
export const V2_SHELL_WELCOME_VERSION = "2026-07-29";

export function v2ShellWelcomeStorageKey(
  userId: string,
  version: string = V2_SHELL_WELCOME_VERSION
): string {
  return `${STORAGE_PREFIX}${version}:${userId}`;
}

export function hasSeenV2ShellWelcome(
  userId: string,
  version: string = V2_SHELL_WELCOME_VERSION
): boolean {
  if (typeof window === "undefined") return true;
  if (!userId.trim()) return true;
  try {
    return window.localStorage.getItem(v2ShellWelcomeStorageKey(userId, version)) === "1";
  } catch {
    return true;
  }
}

export function markV2ShellWelcomeSeen(
  userId: string,
  version: string = V2_SHELL_WELCOME_VERSION
): void {
  if (typeof window === "undefined") return;
  if (!userId.trim()) return;
  try {
    window.localStorage.setItem(v2ShellWelcomeStorageKey(userId, version), "1");
  } catch {
    // Privémodus / blocked storage: negeren.
  }
}

export function shouldShowV2ShellWelcome(opts: {
  userId: string | null | undefined;
  seen?: boolean;
  version?: string;
}): boolean {
  const userId = opts.userId?.trim();
  if (!userId) return false;
  const version = opts.version ?? V2_SHELL_WELCOME_VERSION;
  const seen =
    opts.seen ??
    (typeof window !== "undefined" ? hasSeenV2ShellWelcome(userId, version) : true);
  return !seen;
}
