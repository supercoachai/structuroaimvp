import { describe, expect, it } from "vitest";

import {
  holdProgress,
  holdSucceeded,
  wasBriefTap,
  V2_HOLD_TO_CONFIRM_MS,
} from "./v2HoldToConfirm";

describe("v2HoldToConfirm", () => {
  it("berekent progress van 0 tot 1", () => {
    expect(holdProgress(0)).toBe(0);
    expect(holdProgress(V2_HOLD_TO_CONFIRM_MS / 2)).toBeCloseTo(0.5);
    expect(holdProgress(V2_HOLD_TO_CONFIRM_MS)).toBe(1);
    expect(holdProgress(V2_HOLD_TO_CONFIRM_MS + 200)).toBe(1);
  });

  it("markeert succes vanaf de drempel", () => {
    expect(holdSucceeded(V2_HOLD_TO_CONFIRM_MS - 1)).toBe(false);
    expect(holdSucceeded(V2_HOLD_TO_CONFIRM_MS)).toBe(true);
  });

  it("herkent een korte tip als brief tap", () => {
    expect(wasBriefTap(40)).toBe(true);
    expect(wasBriefTap(400)).toBe(false);
  });
});
