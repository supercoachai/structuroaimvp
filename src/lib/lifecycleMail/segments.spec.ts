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

  it("P0 waves zijn S0 / S5 / S4", () => {
    expect(templatesForWaveP0("welcome")).toEqual(["s0_welcome"]);
    expect(templatesForWaveP0("morning")).toEqual(["s5_paywall"]);
    expect(templatesForWaveP0("evening")).toEqual(["s4_pre_paywall"]);
  });

  it("S0: 2–24u na signup zonder checkin", () => {
    vi.setSystemTime(new Date("2026-07-15T14:00:00.000Z")); // +4u
    const ids = eligibleTemplatesForCandidate(
      candidate({ created_at: "2026-07-15T10:00:00.000Z", checkin_count: 0 })
    );
    expect(ids).toContain("s0_welcome");
  });

  it("S0 skip bij checkin", () => {
    vi.setSystemTime(new Date("2026-07-15T14:00:00.000Z"));
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
});
