import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isV2AppPath,
  isV2LabPath,
  isV2LockdownExemptPath,
  isV2PublicEnabled,
  isV2PublicEnabledClient,
  mapV2PathToV1,
  resolveLiveHomePath,
  resolveLivePaywallPath,
  resolveV2LockdownBouncePath,
} from "./v2LabAccess";

describe("isV2LabPath", () => {
  it("marks exact /v2 lab index as lab", () => {
    expect(isV2LabPath("/v2")).toBe(true);
    expect(isV2LabPath("/v2/")).toBe(true);
  });

  it("marks jasper as lab", () => {
    expect(isV2LabPath("/v2/jasper")).toBe(true);
    expect(isV2LabPath("/v2/jasper/x")).toBe(true);
  });

  it("keeps product shell routes out of lab", () => {
    expect(isV2LabPath("/v2/onboarding")).toBe(false);
    expect(isV2LabPath("/v2/home")).toBe(false);
    expect(isV2LabPath("/v2/dagstart")).toBe(false);
    expect(isV2LabPath("/v2/login")).toBe(false);
  });
});

describe("isV2AppPath / lockdown exempt", () => {
  it("detects all /v2 paths", () => {
    expect(isV2AppPath("/v2")).toBe(true);
    expect(isV2AppPath("/v2/home")).toBe(true);
    expect(isV2AppPath("/home")).toBe(false);
  });

  it("exempts one-click cancel during lockdown", () => {
    expect(isV2LockdownExemptPath("/stop-abonnement")).toBe(true);
    expect(isV2LockdownExemptPath("/v2/stop-abonnement")).toBe(true);
    expect(isV2LockdownExemptPath("/v2/abonnement")).toBe(false);
  });
});

describe("mapV2PathToV1 / bounce", () => {
  it("maps shell routes to v1", () => {
    expect(mapV2PathToV1("/v2/home")).toBe("/");
    expect(mapV2PathToV1("/v2/onboarding")).toBe("/onboarding");
    expect(mapV2PathToV1("/v2/abonnement")).toBe("/abonnement");
    expect(mapV2PathToV1("/v2/login")).toBe("/login");
    expect(mapV2PathToV1("/v2/dagstart")).toBe("/");
    expect(mapV2PathToV1("/v2/settings")).toBe("/settings");
    expect(mapV2PathToV1("/v2/shutdown")).toBe("/shutdown");
  });

  it("bounces anon to start/login/abonnement/root", () => {
    expect(resolveV2LockdownBouncePath("/v2/onboarding", false)).toBe(
      "/onboarding"
    );
    expect(resolveV2LockdownBouncePath("/v2/login", false)).toBe("/login");
    expect(resolveV2LockdownBouncePath("/v2/abonnement", false)).toBe(
      "/abonnement"
    );
    expect(resolveV2LockdownBouncePath("/v2/home", false)).toBe("/");
  });

  it("bounces logged-in users to v1 equivalents", () => {
    expect(resolveV2LockdownBouncePath("/v2/home", true)).toBe("/");
    expect(resolveV2LockdownBouncePath("/v2/onboarding", true)).toBe(
      "/onboarding"
    );
    expect(resolveV2LockdownBouncePath("/v2/abonnement", true)).toBe(
      "/abonnement"
    );
  });
});

describe("isV2PublicEnabled", () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origPublic = process.env.STRUCTURO_V2_PUBLIC;
  const origNextPublic = process.env.NEXT_PUBLIC_STRUCTURO_V2_PUBLIC;

  afterEach(() => {
    vi.unstubAllEnvs();
    if (origNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = origNodeEnv;
    if (origPublic === undefined) delete process.env.STRUCTURO_V2_PUBLIC;
    else process.env.STRUCTURO_V2_PUBLIC = origPublic;
    if (origNextPublic === undefined) {
      delete process.env.NEXT_PUBLIC_STRUCTURO_V2_PUBLIC;
    } else {
      process.env.NEXT_PUBLIC_STRUCTURO_V2_PUBLIC = origNextPublic;
    }
  });

  it("is off by default in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.STRUCTURO_V2_PUBLIC;
    delete process.env.NEXT_PUBLIC_STRUCTURO_V2_PUBLIC;
    expect(isV2PublicEnabled()).toBe(false);
    expect(isV2PublicEnabledClient()).toBe(false);
    expect(resolveLiveHomePath()).toBe("/");
    expect(resolveLivePaywallPath()).toBe("/abonnement");
  });

  it("opens when STRUCTURO_V2_PUBLIC=1 in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRUCTURO_V2_PUBLIC", "1");
    delete process.env.NEXT_PUBLIC_STRUCTURO_V2_PUBLIC;
    expect(isV2PublicEnabled()).toBe(true);
    expect(resolveLiveHomePath()).toBe("/");
    expect(resolveLivePaywallPath()).toBe("/abonnement");
  });

  it("opens when NEXT_PUBLIC_STRUCTURO_V2_PUBLIC=1 in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.STRUCTURO_V2_PUBLIC;
    vi.stubEnv("NEXT_PUBLIC_STRUCTURO_V2_PUBLIC", "1");
    expect(isV2PublicEnabled()).toBe(true);
    expect(isV2PublicEnabledClient()).toBe(true);
  });

  it("stays open in development unless explicitly forced off", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.STRUCTURO_V2_PUBLIC;
    delete process.env.NEXT_PUBLIC_STRUCTURO_V2_PUBLIC;
    expect(isV2PublicEnabled()).toBe(true);

    vi.stubEnv("STRUCTURO_V2_PUBLIC", "0");
    expect(isV2PublicEnabled()).toBe(false);
  });
});
