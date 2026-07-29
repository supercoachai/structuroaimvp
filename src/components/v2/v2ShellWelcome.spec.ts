import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  hasSeenV2ShellWelcome,
  markV2ShellWelcomeSeen,
  shouldShowV2ShellWelcome,
  V2_SHELL_WELCOME_VERSION,
  v2ShellWelcomeStorageKey,
} from "./v2ShellWelcome";

function installStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

describe("shouldShowV2ShellWelcome", () => {
  beforeEach(() => {
    installStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows once for any logged-in customer", () => {
    expect(shouldShowV2ShellWelcome({ userId: "u1" })).toBe(true);
    expect(shouldShowV2ShellWelcome({ userId: "u-new" })).toBe(true);
  });

  it("hides after dismiss", () => {
    markV2ShellWelcomeSeen("u1");
    expect(hasSeenV2ShellWelcome("u1")).toBe(true);
    expect(shouldShowV2ShellWelcome({ userId: "u1" })).toBe(false);
  });

  it("hides without userId", () => {
    expect(shouldShowV2ShellWelcome({ userId: null })).toBe(false);
    expect(shouldShowV2ShellWelcome({ userId: "" })).toBe(false);
  });

  it("never shows for new accounts marked seen at signup/claim", () => {
    // V2AccountSaveStep / V2ClaimOnAuth markeren direct na accountaanmaak.
    const newUserId = "fresh-account";
    markV2ShellWelcomeSeen(newUserId);
    expect(shouldShowV2ShellWelcome({ userId: newUserId })).toBe(false);
  });

  it("scopes storage per user and version", () => {
    markV2ShellWelcomeSeen("a");
    expect(hasSeenV2ShellWelcome("a")).toBe(true);
    expect(hasSeenV2ShellWelcome("b")).toBe(false);
    expect(v2ShellWelcomeStorageKey("a")).toBe(
      `v2_shell_welcome_seen:${V2_SHELL_WELCOME_VERSION}:a`
    );
    expect(
      shouldShowV2ShellWelcome({ userId: "a", version: "later-release" })
    ).toBe(true);
  });
});
