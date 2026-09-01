/**
 * Dump hold-to-talk: Web Speech-transcript splitsen in dump-items.
 * Nooit een audio-bestand of "Audio · 0:14"-placeholder in de lijst.
 */

import { prepareDumpItems } from "./v2DumpSplit";

/** Legacy hold-to-talk fallback, bv. "Audio · 0:14". Niet als kicker tonen. */
export const V2_DUMP_AUDIO_PLACEHOLDER_RE =
  /^(?:audio|voice|opname|recording)\s*[·•.\-–—:]/i;

export function isV2DumpAudioPlaceholder(title: string): boolean {
  return V2_DUMP_AUDIO_PLACEHOLDER_RE.test(title.trim());
}

/** Kortere tik dan een echte hold: geen ghost-item. */
export const V2_DUMP_MIN_HOLD_MS = 1000;

/** Silence-timers uit tijdens hold-to-talk; stoppen gebeurt bij loslaten. */
export const V2_DUMP_HOLD_SILENCE_MS = 3_600_000;

export function formatV2DumpClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export type V2DumpVoiceCaptureReason = "ok" | "ignore" | "empty" | "fillers";

export type V2DumpVoiceCapture = {
  pieces: string[];
  reason: V2DumpVoiceCaptureReason;
};

/**
 * Transcript splitsen zoals getypte dump (en/and, kommallijst, fillers).
 * Leeg of alleen fillers: geen item. Korte hold zonder tekst: negeren.
 */
export function resolveV2DumpVoiceCapture(
  transcript: string | null | undefined,
  durationMs: number,
): V2DumpVoiceCapture {
  const raw = transcript ?? "";
  const pieces = prepareDumpItems(raw);
  if (pieces.length > 0) return { pieces, reason: "ok" };
  if (durationMs < V2_DUMP_MIN_HOLD_MS) return { pieces: [], reason: "ignore" };
  return {
    pieces: [],
    reason: raw.trim().length === 0 ? "empty" : "fillers",
  };
}
