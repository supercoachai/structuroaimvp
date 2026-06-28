import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JASPER_SIGNUP_SOURCE, isJasperSignupSource } from "@/lib/jasper/jasperOffer";
import {
  hasJasperAttributionOnClient,
  markJasperAttributionPersistent,
} from "@/lib/posthog/signupAttribution";

/** Zelfde beslissingslogica als TrialBanner vóór legacy-trial melding. */
function shouldHideTrialBannerForJasper(profileSignupSource: string | null): boolean {
  return isJasperSignupSource(profileSignupSource) || hasJasperAttributionOnClient();
}

describe("TrialBanner jasper hide logic", () => {
  let localStore: Map<string, string>;

  beforeEach(() => {
    localStore = new Map();
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    });
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => localStore.get(k) ?? null,
      setItem: (k: string, v: string) => {
        localStore.set(k, v);
      },
      removeItem: (k: string) => {
        localStore.delete(k);
      },
    });
    vi.stubGlobal("document", { cookie: "" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("verbergt banner bij jasper_podcast op profiel", () => {
    expect(shouldHideTrialBannerForJasper(JASPER_SIGNUP_SOURCE)).toBe(true);
  });

  it("verbergt banner bij ontbrekende profiel-bron maar wel Jasper localStorage", () => {
    markJasperAttributionPersistent();
    expect(shouldHideTrialBannerForJasper(null)).toBe(true);
  });

  it("toont legacy banner bij direct zonder Jasper-signalen", () => {
    expect(shouldHideTrialBannerForJasper("direct")).toBe(false);
    expect(shouldHideTrialBannerForJasper(null)).toBe(false);
  });
});
