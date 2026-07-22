"use client";

import { patchV2Settings, readV2Settings } from "./v2Settings";
import type { V2State } from "./V2Context";

export const CYCLE_OPTIN_PROMPT_LINE =
  "Wil je je cyclus meenemen? Optioneel. Je kunt dit altijd later aanzetten.";

/** Eerste focus-win of shutdown: pas daarna soft-prompts zoals cyclus/account. */
export function markV2FirstValue(now = new Date()): void {
  const settings = readV2Settings();
  if (settings.firstValueAt) return;
  patchV2Settings({ firstValueAt: now.toISOString() });
}

export function hasV2FirstValue(): boolean {
  return Boolean(readV2Settings().firstValueAt);
}

export function shouldShowCycleOptInPrompt(state: V2State): boolean {
  if (typeof window === "undefined") return false;
  if (state.cyclusOptIn) return false;
  const settings = readV2Settings();
  if (settings.cycleOptInPromptDismissed) return false;
  if (!settings.firstValueAt) return false;
  return true;
}

/** Eenmalig: wegklikken of afronden van setup. */
export function dismissCycleOptInPrompt(): void {
  patchV2Settings({ cycleOptInPromptDismissed: true });
}
