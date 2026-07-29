import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  eligibleTemplatesForCandidate,
  templatesForWaveP0,
} from "./segments";
import type { LifecycleCandidate } from "./types";

function candidate(
  overrides: Partial<LifecycleCandidate> = {}
): LifecycleCandidate {
  return {
    user_id: "u1",
    email: "a@example.com",
    preferred_name: "Sam",
    created_at: new Date("2026-07-15T10:00:00.000Z").toISOString(),
    signup_source: null,
    subscription_status: "none",
    subscription_current_period_end: null,
    last_dagstart_date: null,
    unsubscribe_lifecycle: false,
    is_test: false,
    app_trial_override_until: null,
    checkin_count: 0,
    last_checkin_date: null,
    ...overrides,
  };
}

describe("lifecycleMail segments", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("P0 waves zijn hello+nudge / s1+S5 / s2+S3+S4", () => {
    expect(templatesForWaveP0("welcome")).toEqual(["s0_hello", "s0_welcome"]);
    expect(templatesForWaveP0("morning")).toEqual(["s1_day2", "s5_paywall"]);
    expect(templatesForWaveP0("evening")).toEqual([
      "s2_still",
      "s3_value",
      "s4_pre_paywall",
    ]);
  });

  it("S0 hello: direct na signup, ook mét checkin", () => {
    vi.setSystemTime(new Date("2026-07-15T10:30:00.000Z")); // +0.5u
    const ids = eligibleTemplatesForCandidate(
      candidate({
        created_at: "2026-07-15T10:00:00.000Z",
        checkin_count: 1,
        last_checkin_date: "2026-07-15",
      })
    );
    expect(ids).toContain("s0_hello");
    expect(ids).not.toContain("s0_welcome");
  });

  it("S0 welcome nudge: 6–48u zonder checkin", () => {
    vi.setSystemTime(new Date("2026-07-15T18:00:00.000Z")); // +8u
    const ids = eligibleTemplatesForCandidate(
      candidate({ created_at: "2026-07-15T10:00:00.000Z", checkin_count: 0 })
    );
    expect(ids).toContain("s0_hello");
    expect(ids).toContain("s0_welcome");
  });

  it("S0 welcome skip bij checkin", () => {
    vi.setSystemTime(new Date("2026-07-15T18:00:00.000Z"));
    const ids = eligibleTemplatesForCandidate(
      candidate({ checkin_count: 1, last_checkin_date: "2026-07-15" })
    );
    expect(ids).not.toContain("s0_welcome");
  });

  it("S4: laatste trial-dag (1 dag over)", () => {
    // Signup 15 jul 10:00 UTC → trial eindigt 18 jul 10:00 UTC (3d)
    // Op 17 jul 12:00 UTC: ~22u over → ceil = 1 dag
    vi.setSystemTime(new Date("2026-07-17T12:00:00.000Z"));
    const ids = eligibleTemplatesForCandidate(
      candidate({
        created_at: "2026-07-15T10:00:00.000Z",
        checkin_count: 1,
        last_checkin_date: "2026-07-16",
      })
    );
    expect(ids).toContain("s4_pre_paywall");
  });

  it("S5: na trial expiry", () => {
    vi.setSystemTime(new Date("2026-07-18T12:00:00.000Z"));
    const ids = eligibleTemplatesForCandidate(
      candidate({
        created_at: "2026-07-15T10:00:00.000Z",
        subscription_status: "trial_expired",
        checkin_count: 2,
        last_checkin_date: "2026-07-16",
      })
    );
    expect(ids).toContain("s5_paywall");
  });

  it("geen mail bij unsubscribe of paid", () => {
    vi.setSystemTime(new Date("2026-07-15T14:00:00.000Z"));
    expect(
      eligibleTemplatesForCandidate(candidate({ unsubscribe_lifecycle: true }))
    ).toEqual([]);
    expect(
      eligibleTemplatesForCandidate(
        candidate({ subscription_status: "active", checkin_count: 0 })
      )
    ).toEqual([]);
  });

  it("Stripe 7d card-trial: S1 op ~dag 1 (daysLeft 6)", () => {
    vi.setSystemTime(new Date("2026-07-22T12:00:00.000Z"));
    expect(
      eligibleTemplatesForCandidate(
        candidate({
          subscription_status: "trialing",
          subscription_current_period_end: "2026-07-28T10:00:00.000Z",
          checkin_count: 1,
          last_checkin_date: "2026-07-21",
        })
      )
    ).toEqual(["s1_day2"]);
  });

  it("Stripe 7d card-trial: S2 bij stilte mid-trial (daysLeft 4)", () => {
    vi.setSystemTime(new Date("2026-07-24T12:00:00.000Z"));
    expect(
      eligibleTemplatesForCandidate(
        candidate({
          subscription_status: "trialing",
          subscription_current_period_end: "2026-07-28T10:00:00.000Z",
          checkin_count: 2,
          last_checkin_date: "2026-07-21",
        })
      )
    ).toEqual(["s2_still"]);
  });

  it("Stripe 7d card-trial: S3 bij ritme vóór pre-charge (daysLeft 2)", () => {
    vi.setSystemTime(new Date("2026-07-26T12:00:00.000Z"));
    expect(
      eligibleTemplatesForCandidate(
        candidate({
          subscription_status: "trialing",
          subscription_current_period_end: "2026-07-28T10:00:00.000Z",
          checkin_count: 3,
          last_checkin_date: "2026-07-26",
        })
      )
    ).toEqual(["s3_value"]);
  });

  it("Stripe 7d card-trial: S4 alleen op laatste volle dag (period_end)", () => {
    vi.setSystemTime(new Date("2026-07-27T12:00:00.000Z"));
    expect(
      eligibleTemplatesForCandidate(
        candidate({
          subscription_status: "trialing",
          subscription_current_period_end: "2026-07-28T10:00:00.000Z",
          checkin_count: 3,
        })
      )
    ).toEqual(["s4_pre_paywall"]);
    expect(
      eligibleTemplatesForCandidate(
        candidate({
          subscription_status: "trialing",
          subscription_current_period_end: "2026-07-30T10:00:00.000Z",
          checkin_count: 3,
        })
      )
    ).not.toContain("s4_pre_paywall");
  });

  it("Stripe trialing: geen mid-trial mails zonder ritme/stilte", () => {
    vi.setSystemTime(new Date("2026-07-24T12:00:00.000Z"));
    // daysLeft 4, maar recent checkin → geen S2
    expect(
      eligibleTemplatesForCandidate(
        candidate({
          subscription_status: "trialing",
          subscription_current_period_end: "2026-07-28T10:00:00.000Z",
          checkin_count: 1,
          last_checkin_date: "2026-07-24",
        })
      )
    ).toEqual([]);
  });
});
