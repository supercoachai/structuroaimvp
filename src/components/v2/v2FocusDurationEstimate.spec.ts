import { describe, expect, it } from "vitest";

import { estimateFocusDurationBucket } from "./v2FocusDurationEstimate";

describe("estimateFocusDurationBucket", () => {
  it("gebruikt bestaande taak-durationBucket", () => {
    expect(
      estimateFocusDurationBucket({
        title: "Rapport schrijven",
        taskDurationBucket: "short",
      }),
    ).toEqual({ durationBucket: "short", source: "task" });
  });

  it("schat lange taken via titel", () => {
    expect(
      estimateFocusDurationBucket({ title: "Rapport schrijven", energy: "medium" }),
    ).toEqual({ durationBucket: "long", source: "heuristic" });
  });

  it("schat middel via inbox-achtige titel", () => {
    expect(
      estimateFocusDurationBucket({ title: "Inbox op nul", energy: "medium" }),
    ).toEqual({ durationBucket: "medium", source: "heuristic" });
  });

  it("trekt lange schatting in bij lage energie", () => {
    expect(
      estimateFocusDurationBucket({ title: "Presentatie maken", energy: "low" }),
    ).toEqual({ durationBucket: "medium", source: "heuristic" });
  });

  it("valt terug op kort zonder signalen", () => {
    expect(estimateFocusDurationBucket({ title: "Dit ene ding", energy: null })).toEqual({
      durationBucket: "short",
      source: "fallback",
    });
  });

  it("valt terug op kort bij lege titel", () => {
    expect(estimateFocusDurationBucket({ title: "   " })).toEqual({
      durationBucket: "short",
      source: "fallback",
    });
  });
});
