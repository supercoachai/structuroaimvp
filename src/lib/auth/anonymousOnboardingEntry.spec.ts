import { describe, expect, it } from "vitest";

import { shouldResetAnonymousOnboarding } from "./anonymousOnboardingEntry";

describe("shouldResetAnonymousOnboarding", () => {
  it("reset bij een verse sessie zonder voortgang en zonder taken", () => {
    expect(
      shouldResetAnonymousOnboarding({
        hasCompletedOnboarding: false,
        localTaskCount: 0,
      })
    ).toBe(true);
  });

  it("reset NIET als er een afgeronde anonieme onboarding is", () => {
    expect(
      shouldResetAnonymousOnboarding({
        hasCompletedOnboarding: true,
        localTaskCount: 0,
      })
    ).toBe(false);
  });

  it("reset NIET als er lokale taken zijn", () => {
    expect(
      shouldResetAnonymousOnboarding({
        hasCompletedOnboarding: false,
        localTaskCount: 3,
      })
    ).toBe(false);
  });

  it("reset NIET als er zowel voortgang als taken zijn", () => {
    expect(
      shouldResetAnonymousOnboarding({
        hasCompletedOnboarding: true,
        localTaskCount: 2,
      })
    ).toBe(false);
  });
});
