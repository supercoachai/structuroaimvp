import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isAllowedAppHost,
  resolveTrustedAppOrigin,
  sanitizeNextPath,
} from "./safeRedirect";

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

describe("resolveTrustedAppOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("gebruikt www.structuro.ai uit request, niet VERCEL_URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_URL", "structuroaimvp-preview.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(resolveTrustedAppOrigin("https://www.structuro.ai")).toBe(
      "https://www.structuro.ai"
    );
  });

  it("valt terug op canonieke productie-URL zonder request-host", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_URL", "structuroaimvp-preview.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(resolveTrustedAppOrigin("https://evil.com")).toBe(
      "https://www.structuro.ai"
    );
  });
});
