import { describe, expect, it } from "vitest";

import {
  isV2CardTrialCohort,
  requiresV2CardTrialCheckout,
  V2_CARD_TRIAL_CUTOFF_ISO,
} from "./v2CardTrial";

describe("v2CardTrial", () => {
  it("herkent cohort na cutoff", () => {
    expect(isV2CardTrialCohort(V2_CARD_TRIAL_CUTOFF_ISO)).toBe(true);
    expect(isV2CardTrialCohort("2026-07-27T00:00:00.000Z")).toBe(false);
  });

  it("vraagt checkout na dagstart zonder Stripe-trial", () => {
    expect(
      requiresV2CardTrialCheckout({
        created_at: "2026-07-28T12:00:00.000Z",
        last_dagstart_date: "2026-07-28",
        subscription_status: "none",
      })
    ).toBe(true);
    expect(
      requiresV2CardTrialCheckout({
        created_at: "2026-07-28T12:00:00.000Z",
        last_dagstart_date: null,
        subscription_status: "none",
      })
    ).toBe(false);
    expect(
      requiresV2CardTrialCheckout({
        created_at: "2026-07-28T12:00:00.000Z",
        last_dagstart_date: "2026-07-28",
        subscription_status: "trialing",
      })
    ).toBe(false);
  });

  it("Jasper en café-QR: geen kaart-checkout tijdens event-trial", () => {
    expect(
      requiresV2CardTrialCheckout({
        created_at: "2026-07-28T12:00:00.000Z",
        last_dagstart_date: "2026-07-28",
        subscription_status: "none",
        signup_source: "jasper_podcast",
      })
    ).toBe(false);
    expect(
      requiresV2CardTrialCheckout({
        created_at: "2026-07-28T12:00:00.000Z",
        last_dagstart_date: "2026-07-28",
        subscription_status: "none",
        signup_source: "adhd_cafe",
      })
    ).toBe(false);
  });
});
