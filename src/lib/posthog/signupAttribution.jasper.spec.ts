import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JASPER_ATTRIBUTION_LS_KEY, JASPER_SIGNUP_SOURCE } from "@/lib/jasper/jasperOffer";
import { ST_ATTR_COOKIE } from "@/lib/posthog/firstTouchAttribution";
import {
  SOURCE_KEY,
  getResolvedSignupSourceForProfile,
  getStoredSignupSource,
  hasJasperAttributionOnClient,
  markJasperAttributionPersistent,
  syncSignupAttributionFromPersistentStorage,
} from "@/lib/posthog/signupAttribution";

function installBrowserStorage() {
  const session = new Map<string, string>();
  const local = new Map<string, string>();
  let cookie = "";

  vi.stubGlobal("window", globalThis);

  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => {
      session.set(k, v);
    },
    removeItem: (k: string) => {
      session.delete(k);
    },
  });

  vi.stubGlobal("localStorage", {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => {
      local.set(k, v);
    },
    removeItem: (k: string) => {
      local.delete(k);
    },
  });

  vi.stubGlobal("document", {
    cookie,
  });

  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => cookie,
    set: (value: string) => {
      cookie = value;
    },
  });

  return { session, local, setCookie: (value: string) => {
    cookie = value;
  } };
}

describe("signupAttribution jasper", () => {
  beforeEach(() => {
    installBrowserStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("syncSignupAttributionFromPersistentStorage herstelt jasper uit st_attr cookie", () => {
    document.cookie = `${ST_ATTR_COOKIE}=${encodeURIComponent(
      JSON.stringify({ source: JASPER_SIGNUP_SOURCE, utm_campaign: JASPER_SIGNUP_SOURCE })
    )}`;

    syncSignupAttributionFromPersistentStorage();

    expect(sessionStorage.getItem(SOURCE_KEY)).toBe(JASPER_SIGNUP_SOURCE);
    expect(getStoredSignupSource()).toBe(JASPER_SIGNUP_SOURCE);
  });

  it("getResolvedSignupSourceForProfile schrijft geen direct naar profiel", () => {
    sessionStorage.setItem(SOURCE_KEY, "direct");
    expect(getResolvedSignupSourceForProfile()).toBeNull();
  });

  it("hasJasperAttributionOnClient detecteert localStorage vlag", () => {
    markJasperAttributionPersistent();
    expect(localStorage.getItem(JASPER_ATTRIBUTION_LS_KEY)).toBe("1");
    expect(hasJasperAttributionOnClient()).toBe(true);
  });

  it("hasJasperAttributionOnClient detecteert cookie als sessionStorage leeg is", () => {
    document.cookie = `${ST_ATTR_COOKIE}=${encodeURIComponent(
      JSON.stringify({ source: JASPER_SIGNUP_SOURCE })
    )}`;

    expect(hasJasperAttributionOnClient()).toBe(true);
  });

  it("sync overschrijft direct in sessionStorage met betere cookie-bron", () => {
    sessionStorage.setItem(SOURCE_KEY, "direct");
    document.cookie = `${ST_ATTR_COOKIE}=${encodeURIComponent(
      JSON.stringify({ source: JASPER_SIGNUP_SOURCE })
    )}`;

    syncSignupAttributionFromPersistentStorage();

    expect(getStoredSignupSource()).toBe(JASPER_SIGNUP_SOURCE);
    expect(getResolvedSignupSourceForProfile()).toBe(JASPER_SIGNUP_SOURCE);
  });
});
