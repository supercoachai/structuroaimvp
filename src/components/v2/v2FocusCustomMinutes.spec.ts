import { describe, expect, it } from "vitest";

import {
  clampFocusCustomMinutes,
  parseFocusCustomMinutes,
  V2_FOCUS_CUSTOM_MAX,
  V2_FOCUS_CUSTOM_MIN,
} from "./v2FocusCustomMinutes";

describe("parseFocusCustomMinutes", () => {
  it("accepts integers within bounds", () => {
    expect(parseFocusCustomMinutes("1")).toBe(1);
    expect(parseFocusCustomMinutes("45")).toBe(45);
    expect(parseFocusCustomMinutes("120")).toBe(120);
  });

  it("rejects empty, non-numeric, and out-of-bounds", () => {
    expect(parseFocusCustomMinutes("")).toBeNull();
    expect(parseFocusCustomMinutes("  ")).toBeNull();
    expect(parseFocusCustomMinutes("abc")).toBeNull();
    expect(parseFocusCustomMinutes("0")).toBeNull();
    expect(parseFocusCustomMinutes("121")).toBeNull();
  });
});

describe("clampFocusCustomMinutes", () => {
  it("clamps to 1–120", () => {
    expect(clampFocusCustomMinutes(0)).toBe(V2_FOCUS_CUSTOM_MIN);
    expect(clampFocusCustomMinutes(999)).toBe(V2_FOCUS_CUSTOM_MAX);
    expect(clampFocusCustomMinutes(37.6)).toBe(38);
  });
});
