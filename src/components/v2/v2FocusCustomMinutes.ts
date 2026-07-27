/** Bounds for opt-in custom focus duration (behind presets). */
export const V2_FOCUS_CUSTOM_MIN = 1;
export const V2_FOCUS_CUSTOM_MAX = 120;
export const V2_FOCUS_CUSTOM_BUCKET_KEY = "custom";

export function clampFocusCustomMinutes(n: number): number {
  return Math.max(
    V2_FOCUS_CUSTOM_MIN,
    Math.min(V2_FOCUS_CUSTOM_MAX, Math.round(n)),
  );
}

/** Parse user input; null if empty or out of bounds. */
export function parseFocusCustomMinutes(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return null;
  if (n < V2_FOCUS_CUSTOM_MIN || n > V2_FOCUS_CUSTOM_MAX) return null;
  return n;
}
