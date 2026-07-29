import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hasDismissedPwaInstallHint,
  markPwaInstallHintDismissed,
  PWA_INSTALL_FROM_APP_PATH,
  PWA_INSTALL_HINT_DISMISSED_KEY,
  resolveLoggedInInstallContinuePath,
  resolvePostCheckoutContinuePath,
  shouldShowPwaInstallHint,
} from "./pwaInstallHint";

function installBrowser(opts: {
  coarse?: boolean;
  standalone?: boolean;
  ua?: string;
  dismissed?: boolean;
}) {
  const store = new Map<string, string>();
  if (opts.dismissed) store.set(PWA_INSTALL_HINT_DISMISSED_KEY, "1");

  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };

  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("navigator", {
    userAgent: opts.ua ?? "iPhone",
    standalone: opts.standalone === true,
  });
  vi.stubGlobal("window", {
    localStorage,
    navigator: {
      userAgent: opts.ua ?? "iPhone",
      standalone: opts.standalone === true,
    },
    matchMedia: (query: string) => ({
      matches:
        query.includes("hover: none") && query.includes("pointer: coarse")
          ? opts.coarse !== false
          : query.includes("display-mode: standalone")
            ? opts.standalone === true
            : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pwaInstallHint", () => {
  it("toont hint op mobiel iOS zonder standalone/dismiss", () => {
    installBrowser({ coarse: true, ua: "iPhone" });
    expect(shouldShowPwaInstallHint()).toBe(true);
    expect(resolveLoggedInInstallContinuePath()).toBe(PWA_INSTALL_FROM_APP_PATH);
    expect(resolvePostCheckoutContinuePath()).toBe(PWA_INSTALL_FROM_APP_PATH);
  });

  it("slaagt over bij desktop", () => {
    installBrowser({ coarse: false, ua: "Mozilla/5.0" });
    expect(shouldShowPwaInstallHint()).toBe(false);
    expect(resolveLoggedInInstallContinuePath()).toBe("/");
  });

  it("slaagt over bij standalone PWA", () => {
    installBrowser({ coarse: true, standalone: true, ua: "iPhone" });
    expect(shouldShowPwaInstallHint()).toBe(false);
    expect(resolveLoggedInInstallContinuePath()).toBe("/");
  });

  it("slaagt over na dismiss", () => {
    installBrowser({ coarse: true, ua: "iPhone", dismissed: true });
    expect(hasDismissedPwaInstallHint()).toBe(true);
    expect(shouldShowPwaInstallHint()).toBe(false);
    expect(resolveLoggedInInstallContinuePath()).toBe("/");
  });

  it("markPwaInstallHintDismissed blokkeert latere shows", () => {
    installBrowser({ coarse: true, ua: "Android" });
    expect(shouldShowPwaInstallHint()).toBe(true);
    markPwaInstallHintDismissed();
    expect(hasDismissedPwaInstallHint()).toBe(true);
    expect(shouldShowPwaInstallHint()).toBe(false);
  });
});
