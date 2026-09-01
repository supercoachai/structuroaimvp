import { describe, expect, it } from "vitest";

import { validateMicroStepsCompletion } from "./microStepsCompletion";
import {
  fallbackMicroStepsFromTitle,
  isAiGatewayRateLimited,
} from "./fallbackMicroSteps";

describe("fallbackMicroStepsFromTitle", () => {
  it("gives four completion-ladder steps for a Dutch task", () => {
    const steps = fallbackMicroStepsFromTitle("Belastingaangifte afronden", "nl");
    expect(steps).toHaveLength(4);
    expect(validateMicroStepsCompletion(steps)).toBeNull();
    expect(steps[0]).toMatch(/Belastingaangifte/i);
    expect(steps[3]).toMatch(/controleer|klaar/i);
  });

  it("gives four English steps that pass validation", () => {
    const steps = fallbackMicroStepsFromTitle("Finish tax return", "en");
    expect(steps).toHaveLength(4);
    expect(validateMicroStepsCompletion(steps)).toBeNull();
  });
});

describe("isAiGatewayRateLimited", () => {
  it("detects gateway 429 and nested retry errors", () => {
    expect(
      isAiGatewayRateLimited({
        name: "AI_RetryError",
        lastError: {
          statusCode: 429,
          type: "rate_limit_exceeded",
          message: "Free tier requests on this model are rate-limited.",
        },
      }),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isAiGatewayRateLimited(new Error("invalid_micro_steps"))).toBe(false);
  });
});
