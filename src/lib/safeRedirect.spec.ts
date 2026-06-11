import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedAppHost, sanitizeNextPath } from "./safeRedirect";

describe("sanitizeNextPath", () => {
  it("laat veilige relatieve paden door", () => {
    expect(sanitizeNextPath("/onboarding")).toBe("/onboarding");
    expect(sanitizeNextPath("/focus?x=1")).toBe("/focus?x=1");
  });

  it("valt terug op / bij ontbrekende of niet-relatieve waarde", () => {
    expect(sanitizeNextPath(null)).toBe("/");
    expect(sanitizeNextPath(undefined)).toBe("/");
    expect(sanitizeNextPath("")).toBe("/");
    expect(sanitizeNextPath("onboarding")).toBe("/");
  });

  it("blokkeert open-redirect-vectoren", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/");
    expect(sanitizeNextPath("https://evil.com")).toBe("/");
    expect(sanitizeNextPath("/\\evil.com")).toBe("/");
    expect(sanitizeNextPath("/path@evil.com")).toBe("/");
  });
});

describe("isAllowedAppHost", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepteert bekende productiehosts", () => {
    expect(isAllowedAppHost("structuro.ai")).toBe(true);
    expect(isAllowedAppHost("www.structuro.ai")).toBe(true);
  });

  it("weigert onbekende hosts", () => {
    expect(isAllowedAppHost("evil.com")).toBe(false);
    expect(isAllowedAppHost(null)).toBe(false);
    expect(isAllowedAppHost("")).toBe(false);
  });

  it("neemt alleen de eerste host uit een lijst", () => {
    expect(isAllowedAppHost("structuro.ai, evil.com")).toBe(true);
    expect(isAllowedAppHost("evil.com, structuro.ai")).toBe(false);
  });

  it("accepteert de actieve VERCEL_URL", () => {
    vi.stubEnv("VERCEL_URL", "structuro-preview.vercel.app");
    expect(isAllowedAppHost("structuro-preview.vercel.app")).toBe(true);
    expect(isAllowedAppHost("other.vercel.app")).toBe(false);
  });
});
