import { afterEach, describe, expect, it, vi } from "vitest";

import {
  signLifecycleUnsubscribeToken,
  verifyLifecycleUnsubscribeToken,
} from "./unsubscribeToken";

describe("lifecycleMail unsubscribeToken", () => {
  const prevDedicated = process.env.LIFECYCLE_UNSUBSCRIBE_SECRET;
  const prevCron = process.env.CRON_SECRET;
  const prevVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    if (prevDedicated === undefined) delete process.env.LIFECYCLE_UNSUBSCRIBE_SECRET;
    else process.env.LIFECYCLE_UNSUBSCRIBE_SECRET = prevDedicated;
    if (prevCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevCron;
    if (prevVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercelEnv;
    vi.restoreAllMocks();
  });

  it("tekent en verifieert met dedicated secret", () => {
    process.env.LIFECYCLE_UNSUBSCRIBE_SECRET = "dedicated-secret";
    process.env.VERCEL_ENV = "production";
    delete process.env.CRON_SECRET;

    const token = signLifecycleUnsubscribeToken("user-123");
    expect(token).toBeTruthy();
    expect(verifyLifecycleUnsubscribeToken(token)).toBe("user-123");
  });

  it("faalt in production zonder dedicated secret (geen CRON_SECRET-fallback)", () => {
    delete process.env.LIFECYCLE_UNSUBSCRIBE_SECRET;
    process.env.CRON_SECRET = "cron-only";
    process.env.VERCEL_ENV = "production";

    expect(signLifecycleUnsubscribeToken("user-123")).toBeNull();
    expect(verifyLifecycleUnsubscribeToken("user-123.abc")).toBeNull();
  });

  it("staat CRON_SECRET-fallback toe buiten production met warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.LIFECYCLE_UNSUBSCRIBE_SECRET;
    process.env.CRON_SECRET = "cron-dev";
    process.env.VERCEL_ENV = "development";

    const token = signLifecycleUnsubscribeToken("user-456");
    expect(token).toBeTruthy();
    expect(verifyLifecycleUnsubscribeToken(token)).toBe("user-456");
    expect(warn).toHaveBeenCalled();
  });
});
