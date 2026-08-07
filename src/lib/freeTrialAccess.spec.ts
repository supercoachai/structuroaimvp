import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  freeTrialExpired,
  hasFreeTrial,
  skipsLegacyFreeTrial,
} from "./freeTrialAccess";
import { V2_CARD_TRIAL_CUTOFF_ISO } from "./stripe/v2CardTrial";

describe("freeTrialAccess", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("geeft legacy 3-dagen trial vóór v2 cutoff", () => {
    const created = "2026-07-20T12:00:00.000Z";
    expect(skipsLegacyFreeTrial({ created_at: created })).toBe(false);
    expect(hasFreeTrial(created)).toBe(true);
  });

  it("slaat legacy trial over voor v2 card-cohort", () => {
    vi.setSystemTime(new Date("2026-07-29T12:00:00.000Z"));
    const created = V2_CARD_TRIAL_CUTOFF_ISO;
    expect(skipsLegacyFreeTrial({ created_at: created, signup_source: "organic" })).toBe(
      true
    );
    expect(hasFreeTrial(created, "organic")).toBe(false);
    expect(freeTrialExpired(created, "organic")).toBe(false);
  });

  it("houdt event-trial voor v2 cohort", () => {
    vi.setSystemTime(new Date("2026-07-29T12:00:00.000Z"));
    const created = V2_CARD_TRIAL_CUTOFF_ISO;
    expect(skipsLegacyFreeTrial({ created_at: created, signup_source: "jasper_podcast" })).toBe(
      false
    );
    expect(hasFreeTrial(created, "jasper_podcast")).toBe(true);
  });

  it("houdt gift_comp buiten legacy skip", () => {
    vi.setSystemTime(new Date("2026-07-29T12:00:00.000Z"));
    const created = V2_CARD_TRIAL_CUTOFF_ISO;
    expect(skipsLegacyFreeTrial({ created_at: created, signup_source: "gift_comp" })).toBe(
      false
    );
  });
});
