import { describe, expect, it } from "vitest";

import {
  COMPACT_CYCLE_SLIDE,
  COMPACT_NAME_SLIDE,
  COMPACT_PROGRESS_STEPS,
  COMPACT_WELCOME_SLIDE,
  compactNextSlide,
  compactPrevSlide,
  compactProgressIndex,
  ONBOARDING_COMPACT_MODE,
} from "./compactFlow";

describe("compactFlow", () => {
  it("is ingeschakeld", () => {
    expect(ONBOARDING_COMPACT_MODE).toBe(true);
  });

  it("toont precies 3 voortgangsstappen", () => {
    expect(COMPACT_PROGRESS_STEPS).toBe(3);
  });

  it("loopt in volgorde welkom -> cyclus -> naam -> finish", () => {
    expect(compactNextSlide(COMPACT_WELCOME_SLIDE)).toBe(COMPACT_CYCLE_SLIDE);
    expect(compactNextSlide(COMPACT_CYCLE_SLIDE)).toBe(COMPACT_NAME_SLIDE);
    expect(compactNextSlide(COMPACT_NAME_SLIDE)).toBe("finish");
  });

  it("loopt terug in omgekeerde volgorde", () => {
    expect(compactPrevSlide(COMPACT_NAME_SLIDE)).toBe(COMPACT_CYCLE_SLIDE);
    expect(compactPrevSlide(COMPACT_CYCLE_SLIDE)).toBe(COMPACT_WELCOME_SLIDE);
    expect(compactPrevSlide(COMPACT_WELCOME_SLIDE)).toBeNull();
  });

  it("berekent voortgang per stap", () => {
    expect(
      compactProgressIndex({
        step: COMPACT_WELCOME_SLIDE,
        firstDayEnergy: null,
        firstDayTaskPhaseVisible: false,
        firstTaskTitle: "",
        firstDayReady: false,
      })
    ).toBe(0);
    expect(
      compactProgressIndex({
        step: COMPACT_CYCLE_SLIDE,
        firstDayEnergy: null,
        firstDayTaskPhaseVisible: false,
        firstTaskTitle: "",
        firstDayReady: false,
      })
    ).toBe(1);
    expect(
      compactProgressIndex({
        step: COMPACT_NAME_SLIDE,
        firstDayEnergy: null,
        firstDayTaskPhaseVisible: false,
        firstTaskTitle: "",
        firstDayReady: false,
      })
    ).toBe(2);
  });
});
