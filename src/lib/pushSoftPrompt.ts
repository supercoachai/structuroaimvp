/**
 * Eenmalige soft herprompt voor bestaande users zonder web-push.
 * localStorage per browser; dismiss of accept zet de flag.
 */

export const PUSH_SOFT_PROMPT_DONE_KEY = "push_soft_prompt_done";

const BLOCKED_PATH_PREFIXES = [
  "/consent",
  "/login",
  "/registreren",
  "/auth",
  "/welkom/install",
  "/onboarding",
  "/privacy",
  "/terms",
] as const;

export function isPushSoftPromptDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PUSH_SOFT_PROMPT_DONE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markPushSoftPromptDone(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PUSH_SOFT_PROMPT_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isPushSoftPromptPathBlocked(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  return BLOCKED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

/**
 * Mag de eenmalige soft prompt getoond worden?
 * Caller checkt privacy-setup en push-support apart.
 */
export function shouldShowPushSoftPrompt(input: {
  privacySetupCompleted: boolean;
  permission: NotificationPermission | "unsupported";
  pathname: string;
  softPromptDone?: boolean;
}): boolean {
  if (!input.privacySetupCompleted) return false;
  if (input.softPromptDone ?? isPushSoftPromptDone()) return false;
  if (isPushSoftPromptPathBlocked(input.pathname)) return false;
  if (input.permission === "granted") return false;
  if (input.permission === "unsupported") return false;
  return true;
}
