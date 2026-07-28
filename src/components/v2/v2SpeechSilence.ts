/** Pure helpers for Dump speech silence / auto-stop. */

/** After the user spoke, stop after this much quiet (ms). */
export const V2_SPEECH_SILENCE_AFTER_MS = 2800;

/** If nothing was said yet, give this long before auto-stop (ms). */
export const V2_SPEECH_SILENCE_BEFORE_MS = 10000;

export function shouldAutoStopOnSilence(args: {
  now: number;
  startedAt: number;
  lastSpeechAt: number | null;
  silenceAfterSpeechMs?: number;
  silenceBeforeSpeechMs?: number;
}): boolean {
  const after = args.silenceAfterSpeechMs ?? V2_SPEECH_SILENCE_AFTER_MS;
  const before = args.silenceBeforeSpeechMs ?? V2_SPEECH_SILENCE_BEFORE_MS;
  if (args.lastSpeechAt == null) {
    return args.now - args.startedAt >= before;
  }
  return args.now - args.lastSpeechAt >= after;
}

/** Next timeout delay until a silence check should fire. */
export function nextSilenceCheckDelayMs(args: {
  now: number;
  startedAt: number;
  lastSpeechAt: number | null;
  silenceAfterSpeechMs?: number;
  silenceBeforeSpeechMs?: number;
}): number {
  const after = args.silenceAfterSpeechMs ?? V2_SPEECH_SILENCE_AFTER_MS;
  const before = args.silenceBeforeSpeechMs ?? V2_SPEECH_SILENCE_BEFORE_MS;
  if (args.lastSpeechAt == null) {
    return Math.max(0, before - (args.now - args.startedAt));
  }
  return Math.max(0, after - (args.now - args.lastSpeechAt));
}

export function speechLangForLocale(locale: string): string {
  return locale === "en" ? "en-US" : "nl-NL";
}
