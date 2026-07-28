import { describe, expect, it } from "vitest";

import {
  nextSilenceCheckDelayMs,
  shouldAutoStopOnSilence,
  speechLangForLocale,
  V2_SPEECH_SILENCE_AFTER_MS,
  V2_SPEECH_SILENCE_BEFORE_MS,
} from "./v2SpeechSilence";

describe("shouldAutoStopOnSilence", () => {
  it("waits longer before any speech", () => {
    expect(
      shouldAutoStopOnSilence({
        now: 1000,
        startedAt: 0,
        lastSpeechAt: null,
        silenceBeforeSpeechMs: V2_SPEECH_SILENCE_BEFORE_MS,
      }),
    ).toBe(false);

    expect(
      shouldAutoStopOnSilence({
        now: V2_SPEECH_SILENCE_BEFORE_MS,
        startedAt: 0,
        lastSpeechAt: null,
      }),
    ).toBe(true);
  });

  it("stops sooner after speech has started", () => {
    expect(
      shouldAutoStopOnSilence({
        now: 5000 + V2_SPEECH_SILENCE_AFTER_MS - 1,
        startedAt: 0,
        lastSpeechAt: 5000,
      }),
    ).toBe(false);

    expect(
      shouldAutoStopOnSilence({
        now: 5000 + V2_SPEECH_SILENCE_AFTER_MS,
        startedAt: 0,
        lastSpeechAt: 5000,
      }),
    ).toBe(true);
  });
});

describe("nextSilenceCheckDelayMs", () => {
  it("returns remaining time until the silence threshold", () => {
    expect(
      nextSilenceCheckDelayMs({
        now: 1000,
        startedAt: 0,
        lastSpeechAt: null,
        silenceBeforeSpeechMs: 5000,
      }),
    ).toBe(4000);

    expect(
      nextSilenceCheckDelayMs({
        now: 6000,
        startedAt: 0,
        lastSpeechAt: 5000,
        silenceAfterSpeechMs: 2800,
      }),
    ).toBe(1800);
  });
});

describe("speechLangForLocale", () => {
  it("maps locale to recognition language", () => {
    expect(speechLangForLocale("nl")).toBe("nl-NL");
    expect(speechLangForLocale("en")).toBe("en-US");
  });
});
