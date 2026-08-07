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
    checkout_started_at: null,
    checkin_count: 0,
    last_checkin_date: null,
    last_seen_at: null,
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

  it("P0 waves bevatten checkout-recover in welcome", () => {
    expect(templatesForWaveP0("welcome")).toEqual([
      "s0_hello",
      "s0_welcome",
      "s0_checkout_resume",
      "s0_checkout_help",
    ]);
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

  it("gratis app-proef: geen S1–S4 zonder Stripe card-trial", () => {
    vi.setSystemTime(new Date("2026-07-17T12:00:00.000Z"));
    const ids = eligibleTemplatesForCandidate(
      candidate({
        created_at: "2026-07-15T10:00:00.000Z",
        subscription_status: "none",
        checkin_count: 1,
        last_checkin_date: "2026-07-16",
      })
    );
    expect(ids).not.toContain("s1_day2");
    expect(ids).not.toContain("s2_still");
    expect(ids).not.toContain("s3_value");
    expect(ids).not.toContain("s4_pre_paywall");
  });

  it("gratis app-proef: geen S1 day2 op signup-dag 1", () => {
    vi.setSystemTime(new Date("2026-07-16T12:00:00.000Z"));
    const ids = eligibleTemplatesForCandidate(
      candidate({
        created_at: "2026-07-15T10:00:00.000Z",
        subscription_status: "none",
        checkin_count: 1,
        last_checkin_date: "2026-07-15",
      })
    );
    expect(ids).not.toContain("s1_day2");
  });

  it("checkout abandon: resume na ~3u overdag", () => {
    // 12:00 UTC = 14:00 Amsterdam (zomer)
    vi.setSystemTime(new Date("2026-07-15T12:00:00.000Z"));
    const ids = eligibleTemplatesForCandidate(
      candidate({
        created_at: "2026-07-15T08:00:00.000Z",
        checkout_started_at: "2026-07-15T09:00:00.000Z",
        checkin_count: 1,
        last_checkin_date: "2026-07-15",
      })
    );
    expect(ids).toContain("s0_checkout_resume");
    expect(ids).not.toContain("s0_checkout_help");
  });

  it("checkout abandon: help na ~48u", () => {
    vi.setSystemTime(new Date("2026-07-17T12:00:00.000Z"));
    const ids = eligibleTemplatesForCandidate(
      candidate({
        created_at: "2026-07-15T08:00:00.000Z",
        checkout_started_at: "2026-07-15T10:00:00.000Z",
        checkin_count: 1,
        last_checkin_date: "2026-07-15",
      })
    );
    expect(ids).toContain("s0_checkout_help");
    expect(ids).not.toContain("s0_checkout_resume");
  });

  it("checkout abandon: geen mail 's nachts Amsterdam", () => {
    // 22:00 UTC = 00:00 Amsterdam
    vi.setSystemTime(new Date("2026-07-15T22:00:00.000Z"));
    const ids = eligibleTemplatesForCandidate(
      candidate({
        created_at: "2026-07-15T08:00:00.000Z",
        checkout_started_at: "2026-07-15T18:00:00.000Z",
        checkin_count: 1,
        last_checkin_date: "2026-07-15",
      })
    );
    expect(ids).not.toContain("s0_checkout_resume");
    expect(ids).not.toContain("s0_checkout_help");
  });

  it("checkout abandon: skip zonder checkin of bij trialing", () => {
    vi.setSystemTime(new Date("2026-07-15T12:00:00.000Z"));
    expect(
      eligibleTemplatesForCandidate(
        candidate({
          checkout_started_at: "2026-07-15T09:00:00.000Z",
          checkin_count: 0,
        })
      )
    ).not.toContain("s0_checkout_resume");
    expect(
      eligibleTemplatesForCandidate(
        candidate({
          subscription_status: "trialing",
          subscription_current_period_end: "2026-07-22T10:00:00.000Z",
          checkout_started_at: "2026-07-15T09:00:00.000Z",
          checkin_count: 1,
          last_checkin_date: "2026-07-15",
        })
      )
    ).not.toContain("s0_checkout_resume");
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

  it("Stripe 7d card-trial: geen S2 als dagstart vandaag (v2 zonder checkin-sync)", () => {
    vi.setSystemTime(new Date("2026-08-07T14:00:00.000Z"));
    expect(
      eligibleTemplatesForCandidate(
        candidate({
          subscription_status: "trialing",
          subscription_current_period_end: "2026-08-14T08:36:28.000Z",
          checkin_count: 1,
          last_checkin_date: "2026-08-05",
          last_dagstart_date: "2026-08-07",
        })
      )
    ).not.toContain("s2_still");
  });

  it("Stripe 7d card-trial: geen S2 bij recent app-gebruik (<48u)", () => {
    vi.setSystemTime(new Date("2026-07-24T12:00:00.000Z"));
    expect(
      eligibleTemplatesForCandidate(
        candidate({
          subscription_status: "trialing",
          subscription_current_period_end: "2026-07-28T10:00:00.000Z",
          checkin_count: 2,
          last_checkin_date: "2026-07-21",
          last_seen_at: "2026-07-23T18:00:00.000Z",
        })
      )
    ).not.toContain("s2_still");
  });

  it("Stripe 7d card-trial: S3 bij ritme vóór pre-charge (daysLeft 3)", () => {
    vi.setSystemTime(new Date("2026-07-25T12:00:00.000Z"));
    expect(
      eligibleTemplatesForCandidate(
        candidate({
          subscription_status: "trialing",
          subscription_current_period_end: "2026-07-28T10:00:00.000Z",
          checkin_count: 3,
          last_checkin_date: "2026-07-25",
        })
      )
    ).toEqual(["s3_value"]);
  });

  it("Stripe 7d card-trial: S4 ~2 dagen vóór charge (+ dag-1 vangnet)", () => {
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
    ).toEqual(["s4_pre_paywall"]);
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
          last_checkin_date: "2026-07-27",
        })
      )
    ).not.toContain("s4_pre_paywall");
  });

  it("Stripe trialing: geen mid-trial mails zonder ritme/stilte", () => {
    vi.setSystemTime(new Date("2026-07-24T12:00:00.000Z"));
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
