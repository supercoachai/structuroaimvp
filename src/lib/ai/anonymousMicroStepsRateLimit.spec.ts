import { afterEach, describe, expect, it, vi } from "vitest";

import {
  __resetAnonymousMicroStepsQuotaForTests,
  consumeAnonymousMicroStepsQuota,
} from "./anonymousMicroStepsRateLimit";

describe("consumeAnonymousMicroStepsQuota", () => {
  afterEach(() => {
    __resetAnonymousMicroStepsQuotaForTests();
    vi.useRealTimers();
  });

  it("blokkeert burst: meer dan 2 per minuut", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T12:00:00Z"));

    expect(consumeAnonymousMicroStepsQuota("2.2.2.2").allowed).toBe(true);
    expect(consumeAnonymousMicroStepsQuota("2.2.2.2").allowed).toBe(true);
    const burst = consumeAnonymousMicroStepsQuota("2.2.2.2");
    expect(burst.allowed).toBe(false);
    expect(burst.reason).toBe("burst");

    vi.setSystemTime(new Date("2026-08-02T12:01:01Z"));
    expect(consumeAnonymousMicroStepsQuota("2.2.2.2").allowed).toBe(true);
  });

  it("staat max 3 requests per uur toe (buiten burst)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T12:00:00Z"));

    expect(consumeAnonymousMicroStepsQuota("1.1.1.1").allowed).toBe(true);
    vi.setSystemTime(new Date("2026-08-02T12:02:00Z"));
    expect(consumeAnonymousMicroStepsQuota("1.1.1.1").allowed).toBe(true);
    vi.setSystemTime(new Date("2026-08-02T12:04:00Z"));
    expect(consumeAnonymousMicroStepsQuota("1.1.1.1").allowed).toBe(true);
    vi.setSystemTime(new Date("2026-08-02T12:06:00Z"));
    const fourth = consumeAnonymousMicroStepsQuota("1.1.1.1");
    expect(fourth.allowed).toBe(false);
    expect(fourth.reason).toBe("hourly");
    expect(fourth.remaining).toBe(0);
  });

  it("scheidt IP's", () => {
    expect(consumeAnonymousMicroStepsQuota("a").allowed).toBe(true);
    expect(consumeAnonymousMicroStepsQuota("b").allowed).toBe(true);
  });
});
