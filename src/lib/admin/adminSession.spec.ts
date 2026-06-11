import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isAdminSecretValid,
  signAdminCookie,
  verifyAdminCookie,
} from "./adminSession";

describe("adminSession", () => {
  beforeEach(() => {
    vi.stubEnv("STRUCTURO_ACTIVITY_ADMIN_SECRET", "activity-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("valideert het juiste secret", () => {
    expect(isAdminSecretValid("activity", "activity-secret")).toBe(true);
    expect(isAdminSecretValid("activity", "fout-secret")).toBe(false);
    expect(isAdminSecretValid("activity", "")).toBe(false);
    expect(isAdminSecretValid("activity", null)).toBe(false);
  });

  it("tekent en verifieert een cookie", () => {
    const cookie = signAdminCookie("activity");
    expect(verifyAdminCookie("activity", cookie)).toBe(true);
  });

  it("weigert een vervalst of leeg cookie", () => {
    const cookie = signAdminCookie("activity");
    expect(verifyAdminCookie("activity", cookie.slice(0, -2) + "xy")).toBe(false);
    expect(verifyAdminCookie("activity", null)).toBe(false);
    expect(verifyAdminCookie("activity", "a.b")).toBe(false);
  });

  it("weigert een verlopen cookie", () => {
    const cookie = signAdminCookie("activity");
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 13 * 60 * 60 * 1000);
    expect(verifyAdminCookie("activity", cookie)).toBe(false);
  });
});
