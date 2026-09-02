import { describe, expect, it } from "vitest";

import { sanitizeAnalyticsTaskId } from "./sanitizeAnalyticsTaskId";

describe("sanitizeAnalyticsTaskId", () => {
  it("accepteert UUID en interne v2-ids", () => {
    expect(sanitizeAnalyticsTaskId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    );
    expect(sanitizeAnalyticsTaskId("v2t-lmf8abc-1")).toBe("v2t-lmf8abc-1");
    expect(
      sanitizeAnalyticsTaskId("sb-a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    ).toBe("sb-a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  });

  it("weiger taaktitels en te korte waarden", () => {
    expect(sanitizeAnalyticsTaskId("Mail beantwoorden")).toBe("");
    expect(sanitizeAnalyticsTaskId("abc")).toBe("");
    expect(sanitizeAnalyticsTaskId("")).toBe("");
    expect(sanitizeAnalyticsTaskId(null)).toBe("");
  });
});
