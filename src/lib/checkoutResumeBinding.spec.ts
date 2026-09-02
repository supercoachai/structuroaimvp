import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decideCheckoutResumeMint,
  signCheckoutResumeToken,
  verifyCheckoutResumeToken,
} from "./checkoutResumeBinding";

describe("checkoutResumeBinding", () => {
  beforeEach(() => {
    vi.stubEnv("CHECKOUT_RESUME_SECRET", "test-secret-value");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("verifieert een geldig token voor dezelfde session", () => {
    const token = signCheckoutResumeToken("cs_test_123");
    expect(verifyCheckoutResumeToken(token, "cs_test_123")).toBe(true);
  });

  it("weigert een token voor een andere session", () => {
    const token = signCheckoutResumeToken("cs_test_123");
    expect(verifyCheckoutResumeToken(token, "cs_test_999")).toBe(false);
  });

  it("weigert een vervalst token", () => {
    const token = signCheckoutResumeToken("cs_test_123");
    const tampered = token.slice(0, -3) + "AAA";
    expect(verifyCheckoutResumeToken(tampered, "cs_test_123")).toBe(false);
  });

  it("weigert ontbrekend of misvormd token", () => {
    expect(verifyCheckoutResumeToken(null, "cs_test_123")).toBe(false);
    expect(verifyCheckoutResumeToken("", "cs_test_123")).toBe(false);
    expect(verifyCheckoutResumeToken("a.b", "cs_test_123")).toBe(false);
  });

  it("weigert een verlopen token", () => {
    const token = signCheckoutResumeToken("cs_test_123");
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 49 * 60 * 60 * 1000);
    expect(verifyCheckoutResumeToken(token, "cs_test_123")).toBe(false);
  });

  it("weigert een token dat met een ander secret is getekend", () => {
    const token = signCheckoutResumeToken("cs_test_123");
    vi.stubEnv("CHECKOUT_RESUME_SECRET", "ander-secret");
    expect(verifyCheckoutResumeToken(token, "cs_test_123")).toBe(false);
  });

  it("accepteert een geldige cookie zonder login", () => {
    const token = signCheckoutResumeToken("cs_test_123");
    expect(
      decideCheckoutResumeMint({
        cookieToken: token,
        sessionId: "cs_test_123",
        userId: null,
        stripeClientReferenceId: "user-a",
      })
    ).toBe("already_bound");
  });

  it("weiger cs_ alleen, ook als de session van iemand anders is", () => {
    expect(
      decideCheckoutResumeMint({
        cookieToken: null,
        sessionId: "cs_test_123",
        userId: null,
        stripeClientReferenceId: "user-a",
      })
    ).toBe("deny");
    expect(
      decideCheckoutResumeMint({
        cookieToken: null,
        sessionId: "cs_test_123",
        userId: "user-b",
        stripeClientReferenceId: "user-a",
      })
    ).toBe("deny");
  });

  it("staat de ingelogde eigenaar toe om te binden", () => {
    expect(
      decideCheckoutResumeMint({
        cookieToken: null,
        sessionId: "cs_test_123",
        userId: "user-a",
        stripeClientReferenceId: "user-a",
      })
    ).toBe("owner");
  });
});
