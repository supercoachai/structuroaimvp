import { afterEach, describe, expect, it, vi } from "vitest";

import {
  browserPrefersEnglish,
  isV2AppPath,
  resolveInitialLocale,
} from "./clientLocale";
import {
  STRUCTURO_LANG_LEGACY_STORAGE_KEY,
  STRUCTURO_LOCALE_STORAGE_KEY,
} from "./types";

describe("isV2AppPath", () => {
  it("matches /v2 and nested routes", () => {
    expect(isV2AppPath("/v2")).toBe(true);
    expect(isV2AppPath("/v2/onboarding")).toBe(true);
    expect(isV2AppPath("/v2/dagstart")).toBe(true);
    expect(isV2AppPath("/start")).toBe(false);
  });
});

describe("browserPrefersEnglish", () => {
  it("detects en* locales", () => {
    expect(browserPrefersEnglish("en")).toBe(true);
    expect(browserPrefersEnglish("en-US")).toBe(true);
    expect(browserPrefersEnglish("en-GB")).toBe(true);
    expect(browserPrefersEnglish("nl-NL")).toBe(false);
    expect(browserPrefersEnglish("de")).toBe(false);
  });
});

describe("resolveInitialLocale", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  function stubWindow(pathname: string, search = "", language = "nl-NL") {
    vi.stubGlobal("window", {
      location: { pathname, search },
    });
    vi.stubGlobal("navigator", { language });
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    });
    return store;
  }

  it("uses ?lang= over everything", () => {
    stubWindow("/v2/onboarding", "?lang=en", "nl-NL");
    expect(resolveInitialLocale("/v2/onboarding", "?lang=en")).toBe("en");
  });

  it("keeps NL default for organic EU acquisition", () => {
    stubWindow("/start", "?utm_source=structuro_eu", "en-US");
    expect(
      resolveInitialLocale("/start", "?utm_source=structuro_eu")
    ).toBe("nl");
  });

  it("uses browser English on first /v2 visit without storage", () => {
    stubWindow("/v2/onboarding", "", "en-US");
    expect(resolveInitialLocale("/v2/onboarding", "")).toBe("en");
  });

  it("keeps NL on /v2 when browser is Dutch", () => {
    stubWindow("/v2/dagstart", "", "nl-NL");
    expect(resolveInitialLocale("/v2/dagstart", "")).toBe("nl");
  });

  it("respects stored locale over browser on /v2", () => {
    const store = stubWindow("/v2", "", "en-US");
    store.set(STRUCTURO_LOCALE_STORAGE_KEY, "nl");
    expect(resolveInitialLocale("/v2", "")).toBe("nl");
  });

  it("respects legacy landing locale", () => {
    const store = stubWindow("/v2/home", "", "en-US");
    store.set(STRUCTURO_LANG_LEGACY_STORAGE_KEY, "nl");
    expect(resolveInitialLocale("/v2/home", "")).toBe("nl");
  });
});
