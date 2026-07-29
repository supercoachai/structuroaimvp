"use client";

import { V2_NAME_MIN_LEN } from "./v2DisplayName";
import { patchV2Settings, readV2Settings } from "./v2Settings";

/** Session flag: na Google/e-mail account-save nog één naamstap tonen. */
export const V2_POST_ACCOUNT_NAME_FLAG = "v2_ask_name_after_auth";

const PLACEHOLDER_NAMES = new Set([
  "jij",
  "you",
  "gebruiker",
  "user",
  "anonymous",
]);

/** Eerste woord van een volledige naam; leeg/placeholder → "". */
export function firstNameFromDisplay(raw: string | null | undefined): string {
  if (!raw || !String(raw).trim()) return "";
  const first = String(raw).trim().split(/\s+/)[0] ?? "";
  if (!isMeaningfulPreferredName(first)) return "";
  return first.slice(0, 80);
}

export function isMeaningfulPreferredName(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length < V2_NAME_MIN_LEN) return false;
  return !PLACEHOLDER_NAMES.has(trimmed.toLowerCase());
}

export function markV2PostAccountNamePending(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(V2_POST_ACCOUNT_NAME_FLAG, "1");
  } catch {
    /* privémodus */
  }
}

export function peekV2PostAccountNamePending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(V2_POST_ACCOUNT_NAME_FLAG) === "1";
  } catch {
    return false;
  }
}

export function consumeV2PostAccountNamePending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const pending = window.sessionStorage.getItem(V2_POST_ACCOUNT_NAME_FLAG) === "1";
    if (pending) window.sessionStorage.removeItem(V2_POST_ACCOUNT_NAME_FLAG);
    return pending;
  } catch {
    return false;
  }
}

export function dismissV2PostAccountNamePrompt(): void {
  patchV2Settings({ postAccountNamePromptDismissed: true });
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(V2_POST_ACCOUNT_NAME_FLAG);
  } catch {
    /* ignore */
  }
}

/**
 * Toon de post-auth naamstap alleen als we die nog niet hebben afgerond/geskipt
 * en er nog geen bewuste aanspreeknaam in localStorage staat.
 * Google-metadata mag prefillen, maar telt hier niet als "al gevraagd".
 */
export function shouldShowV2PostAccountNamePrompt(opts?: {
  profilePreferredName?: string | null;
  profileDisplayName?: string | null;
}): boolean {
  if (typeof window === "undefined") return false;
  if (readV2Settings().postAccountNamePromptDismissed) return false;
  if (isMeaningfulPreferredName(opts?.profilePreferredName)) return false;
  if (isMeaningfulPreferredName(opts?.profileDisplayName)) return false;
  try {
    if (isMeaningfulPreferredName(window.localStorage.getItem("structuro_user_name"))) {
      return false;
    }
  } catch {
    /* ignore */
  }
  return true;
}

/** Prefill uit auth metadata (Google full_name / given_name). */
export function prefillNameFromUserMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string {
  if (!metadata) return "";
  const given = metadata.given_name ?? metadata.givenName;
  if (typeof given === "string") {
    const fromGiven = firstNameFromDisplay(given);
    if (fromGiven) return fromGiven;
  }
  const full =
    metadata.full_name ?? metadata.fullName ?? metadata.name ?? metadata.full_name_string;
  if (typeof full === "string") return firstNameFromDisplay(full);
  return "";
}

export const V2_POST_ACCOUNT_NAME_PATH = "/onboarding?name=1";
