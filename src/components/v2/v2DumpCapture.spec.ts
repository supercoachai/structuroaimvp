import { describe, expect, it } from "vitest";

import {
  formatV2DumpClock,
  isV2DumpAudioPlaceholder,
  resolveV2DumpVoiceCapture,
  V2_DUMP_AUDIO_PLACEHOLDER_RE,
  V2_DUMP_MIN_HOLD_MS,
} from "./v2DumpCapture";

describe("formatV2DumpClock", () => {
  it("formats local hours without padding and minutes with padding", () => {
    const morning = new Date(2026, 0, 15, 9, 5, 0);
    const evening = new Date(2026, 0, 15, 21, 12, 0);
    expect(formatV2DumpClock(morning.toISOString())).toBe("9:05");
    expect(formatV2DumpClock(evening.toISOString())).toBe("21:12");
  });

  it("returns empty for invalid dates", () => {
    expect(formatV2DumpClock("niet-een-datum")).toBe("");
  });
});

describe("resolveV2DumpVoiceCapture", () => {
  it("keeps a real transcript as dump pieces", () => {
    const result = resolveV2DumpVoiceCapture("Verzekering opzeggen", 1200);
    expect(result.reason).toBe("ok");
    expect(result.pieces).toEqual(["Verzekering opzeggen"]);
  });

  it("splits a spoken list into separate dump items", () => {
    const result = resolveV2DumpVoiceCapture(
      "boodschappen doen en was doen en auto ophalen en dokter bellen en tuin water geven",
      8_000,
    );
    expect(result.reason).toBe("ok");
    expect(result.pieces).toEqual([
      "boodschappen doen",
      "was doen",
      "auto ophalen",
      "dokter bellen",
      "tuin water geven",
    ]);
  });

  it("splits a long spoken chain into one item per thing", () => {
    const spoken =
      "melk en brood en eieren en wasmiddel en postzegels en apotheek en garage en kapper en belasting en verzekering";
    const result = resolveV2DumpVoiceCapture(spoken, 14_000);
    expect(result.reason).toBe("ok");
    expect(result.pieces).toHaveLength(10);
    expect(result.pieces[0]).toBe("melk");
    expect(result.pieces[9]).toBe("verzekering");
    expect(result.pieces.some((piece) => V2_DUMP_AUDIO_PLACEHOLDER_RE.test(piece))).toBe(
      false,
    );
  });

  it("strips fillers then splits the remaining tasks", () => {
    const result = resolveV2DumpVoiceCapture(
      "uh boodschappen doen en uhm was doen en ehm auto ophalen en ja en dokter bellen",
      6_000,
    );
    expect(result.reason).toBe("ok");
    expect(result.pieces).toEqual([
      "boodschappen doen",
      "was doen",
      "auto ophalen",
      "dokter bellen",
    ]);
  });

  it("ignores accidental short holds without speech", () => {
    const result = resolveV2DumpVoiceCapture("", V2_DUMP_MIN_HOLD_MS - 1);
    expect(result.pieces).toEqual([]);
    expect(result.reason).toBe("ignore");
  });

  it("does not insert an audio placeholder when transcription is empty after a real hold", () => {
    const result = resolveV2DumpVoiceCapture("", 14_200);
    expect(result.reason).toBe("empty");
    expect(result.pieces).toEqual([]);
    expect(result.pieces.some((piece) => V2_DUMP_AUDIO_PLACEHOLDER_RE.test(piece))).toBe(
      false,
    );
  });

  it("does not insert an audio placeholder when only fillers were heard", () => {
    const result = resolveV2DumpVoiceCapture("uhm ehm", 3200);
    expect(result.reason).toBe("fillers");
    expect(result.pieces).toEqual([]);
    expect(result.pieces.some((piece) => V2_DUMP_AUDIO_PLACEHOLDER_RE.test(piece))).toBe(
      false,
    );
  });

  it("ignores a short hold that only caught fillers", () => {
    const result = resolveV2DumpVoiceCapture("uh", 400);
    expect(result.reason).toBe("ignore");
    expect(result.pieces).toEqual([]);
  });
});

describe("isV2DumpAudioPlaceholder", () => {
  it("detects leftover audio kickers", () => {
    expect(isV2DumpAudioPlaceholder("Audio · 0:05")).toBe(true);
    expect(isV2DumpAudioPlaceholder("Audio · 0:14")).toBe(true);
    expect(isV2DumpAudioPlaceholder("Voice: 1:02")).toBe(true);
  });

  it("leaves real dump titles alone", () => {
    expect(isV2DumpAudioPlaceholder("Verzekering opzeggen")).toBe(false);
    expect(isV2DumpAudioPlaceholder("Audio mix afmaken")).toBe(false);
  });
});
