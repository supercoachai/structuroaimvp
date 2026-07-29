import { describe, expect, it } from "vitest";

import {
  formatV2CardTrialChargeLabel,
  getV2CardTrialChargeAt,
  isV2CardTrialCohort,
  requiresV2CardTrialCheckout,
  V2_CARD_TRIAL_CUTOFF_ISO,
  V2_CARD_TRIAL_DAYS,
} from "./v2CardTrial";

describe("v2CardTrial", () => {
  it("herkent cohort na cutoff", () => {
    expect(isV2CardTrialCohort(V2_CARD_TRIAL_CUTOFF_ISO)).toBe(true);
    expect(isV2CardTrialCohort("2026-07-27T00:00:00.000Z")).toBe(false);
  });

  it("berekent charge-at live vanaf now + trial days", () => {
    const now = new Date("2026-07-29T12:20:00.000Z");
    const chargeAt = getV2CardTrialChargeAt(now);
    expect(chargeAt.getTime() - now.getTime()).toBe(
      V2_CARD_TRIAL_DAYS * 24 * 60 * 60 * 1000
    );
    const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expect(getV2CardTrialChargeAt(nextDay).getTime()).toBe(
      chargeAt.getTime() + 24 * 60 * 60 * 1000
    );
  });

  it("formatteert Amsterdam-label in NL en EN zonder em-dash", () => {
    const now = new Date("2026-07-29T12:20:00.000Z");
    const nl = formatV2CardTrialChargeLabel(now, "nl");
    const en = formatV2CardTrialChargeLabel(now, "en");
    expect(nl).toMatch(/augustus/i);
    expect(nl).toMatch(/14:20|14\.20/);
    expect(en.toLowerCase()).toMatch(/august/);
    expect(nl).not.toContain("\u2014");
    expect(en).not.toContain("\u2014");
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
