import { describe, expect, it } from "vitest";

import {
  compactNextSlide,
  compactPrevSlide,
  compactProgressIndex,
  ONBOARDING_COMPACT_MODE,
} from "./compactFlow";

describe("compactFlow", () => {
  it("is ingeschakeld", () => {
    expect(ONBOARDING_COMPACT_MODE).toBe(true);
  });

  it("slaat demo-slides over", () => {
    expect(compactNextSlide(0)).toBe(7);
    expect(compactNextSlide(7)).toBe("finish");
    expect(compactPrevSlide(7)).toBe(0);
  });

  it("berekent voortgang binnen eerste dag", () => {
    expect(
      compactProgressIndex({
        step: 0,
        firstDayEnergy: null,
        firstDayTaskPhaseVisible: false,
        firstTaskTitle: "",
        firstDayReady: false,
      })
    ).toBe(0);
    expect(
      compactProgressIndex({
        step: 7,
        firstDayEnergy: "medium",
        firstDayTaskPhaseVisible: true,
        firstTaskTitle: "Mail",
        firstDayReady: true,
      })
    ).toBe(4);
  });
});
