import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  signSubscriptionCancelToken,
  verifySubscriptionCancelToken,
} from "./subscriptionCancelToken";

describe("subscriptionCancelToken", () => {
  beforeEach(() => {
    vi.stubEnv("SUBSCRIPTION_CANCEL_SECRET", "test-cancel-secret");
    vi.stubEnv("NODE_ENV", "test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rond-trips geldig token", () => {
    const token = signSubscriptionCancelToken("user-1");
    expect(token).toBeTruthy();
    expect(verifySubscriptionCancelToken(token)).toBe("user-1");
  });

  it("weigert verlopen of kapot token", () => {
    expect(verifySubscriptionCancelToken("a.b.c")).toBeNull();
    expect(verifySubscriptionCancelToken(null)).toBeNull();
  });
});
