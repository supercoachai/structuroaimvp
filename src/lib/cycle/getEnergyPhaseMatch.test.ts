import { describe, expect, it } from "vitest";
import {
  getEnergyPhaseMatch,
  getSuggestedEnergyForPhase,
} from "./getEnergyPhaseMatch";

describe("getSuggestedEnergyForPhase", () => {
  it("maps phases to suggested energy", () => {
    expect(getSuggestedEnergyForPhase("menstrual")).toBe("low");
    expect(getSuggestedEnergyForPhase("follicular")).toBe("medium");
    expect(getSuggestedEnergyForPhase("ovulation")).toBe("high");
    expect(getSuggestedEnergyForPhase("luteal")).toBe("low");
  });
});

describe("getEnergyPhaseMatch", () => {
  it("menstrual: low matches, medium soft, high strong", () => {
    expect(getEnergyPhaseMatch("menstrual", "low")).toEqual({
      match: "match",
      direction: "none",
    });
    expect(getEnergyPhaseMatch("menstrual", "medium")).toEqual({
      match: "soft-mismatch",
      direction: "higher",
    });
    expect(getEnergyPhaseMatch("menstrual", "high")).toEqual({
      match: "strong-mismatch",
      direction: "higher",
    });
  });

  it("follicular: medium matches, low/high soft", () => {
    expect(getEnergyPhaseMatch("follicular", "medium")).toEqual({
      match: "match",
      direction: "none",
    });
    expect(getEnergyPhaseMatch("follicular", "low")).toEqual({
      match: "soft-mismatch",
      direction: "lower",
    });
    expect(getEnergyPhaseMatch("follicular", "high")).toEqual({
      match: "soft-mismatch",
      direction: "higher",
    });
  });

  it("ovulation: high matches, medium soft, low strong", () => {
    expect(getEnergyPhaseMatch("ovulation", "high")).toEqual({
      match: "match",
      direction: "none",
    });
    expect(getEnergyPhaseMatch("ovulation", "medium")).toEqual({
      match: "soft-mismatch",
      direction: "lower",
    });
    expect(getEnergyPhaseMatch("ovulation", "low")).toEqual({
      match: "strong-mismatch",
      direction: "lower",
    });
  });

  it("luteal: same pattern as menstrual", () => {
    expect(getEnergyPhaseMatch("luteal", "low").match).toBe("match");
    expect(getEnergyPhaseMatch("luteal", "high").match).toBe("strong-mismatch");
  });
});
