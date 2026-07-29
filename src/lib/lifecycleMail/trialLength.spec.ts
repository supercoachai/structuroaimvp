import { describe, expect, it } from "vitest";

import {
  isLifecycleV2AudienceCandidate,
} from "./audience";
import {
  isStripeCardTrialing,
  resolveLifecycleTrialDays,
} from "./trialLength";

describe("lifecycleMail trialLength", () => {
  it("geeft 7 dagen voor Stripe-trialing met period_end", () => {
    expect(
      resolveLifecycleTrialDays({
        created_at: "2026-07-20T10:00:00.000Z",
        signup_source: null,
        subscription_status: "trialing",
        subscription_current_period_end: "2026-07-27T10:00:00.000Z",
      })
    ).toBe(7);
    expect(
      isStripeCardTrialing({
        subscription_status: "trialing",
        subscription_current_period_end: "2026-07-27T10:00:00.000Z",
      })
    ).toBe(true);
  });

  it("geeft 7 dagen voor v2 card-cohort vóór checkout", () => {
    expect(
      resolveLifecycleTrialDays({
        created_at: "2026-07-29T10:00:00.000Z",
        signup_source: "organic",
        subscription_status: "none",
        subscription_current_period_end: null,
      })
    ).toBe(7);
  });

  it("geeft 3 dagen voor legacy vóór cutoff", () => {
    expect(
      resolveLifecycleTrialDays({
        created_at: "2026-07-15T10:00:00.000Z",
        signup_source: null,
        subscription_status: "none",
        subscription_current_period_end: null,
      })
    ).toBe(3);
  });
});

describe("lifecycleMail v2 audience", () => {
  it("neemt card-cohort en trialing mee, legacy niet", () => {
    expect(
      isLifecycleV2AudienceCandidate({
        created_at: "2026-07-29T10:00:00.000Z",
        signup_source: null,
        subscription_status: "none",
        subscription_current_period_end: null,
        is_test: false,
      })
    ).toBe(true);
    expect(
      isLifecycleV2AudienceCandidate({
        created_at: "2026-07-15T10:00:00.000Z",
        signup_source: null,
        subscription_status: "none",
        subscription_current_period_end: null,
        is_test: false,
      })
    ).toBe(false);
    expect(
      isLifecycleV2AudienceCandidate({
        created_at: "2026-07-15T10:00:00.000Z",
        signup_source: null,
        subscription_status: "trialing",
        subscription_current_period_end: "2026-07-22T10:00:00.000Z",
        is_test: false,
      })
    ).toBe(true);
  });
});
