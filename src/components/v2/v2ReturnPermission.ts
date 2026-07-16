"use client";

import { patchV2Settings, readV2Settings } from "./v2Settings";

const SESSION_PENDING_KEY = "v2_return_permission_pending";

export function markReturnPermissionPending(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_PENDING_KEY, "1");
  } catch {
    // negeren
  }
}

export function consumeReturnPermissionPending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const pending = window.sessionStorage.getItem(SESSION_PENDING_KEY) === "1";
    if (pending) window.sessionStorage.removeItem(SESSION_PENDING_KEY);
    return pending;
  } catch {
    return false;
  }
}

export function shouldOfferReturnPermission(): boolean {
  const settings = readV2Settings();
  if (settings.reminderCadence !== "none") return false;
  if (settings.returnPermissionPromptDismissed) return false;
  return true;
}

export function dismissReturnPermissionPrompt(): void {
  patchV2Settings({ returnPermissionPromptDismissed: true });
}
