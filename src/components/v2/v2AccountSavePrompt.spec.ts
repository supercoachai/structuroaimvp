import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/authStorage", () => ({
  hasSupabaseAuthHintOnClient: () => false,
}));

import { markV2FirstValue } from "./v2CycleOptInPrompt";
import {
  dismissAccountSavePrompt,
  shouldShowAccountSavePrompt,
  shouldShowPostOnboardingAccountSave,
} from "./v2AccountSavePrompt";
import { V2_SETTINGS_KEY, v2SettingsDefaults } from "./v2Settings";

function installLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

describe("shouldShowAccountSavePrompt", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("toont nooit meer op home (ook niet na firstValue)", () => {
    expect(shouldShowAccountSavePrompt()).toBe(false);
    markV2FirstValue();
    expect(shouldShowAccountSavePrompt()).toBe(false);
  });

  it("blijft false na dismiss", () => {
    markV2FirstValue();
    dismissAccountSavePrompt();
    expect(shouldShowAccountSavePrompt()).toBe(false);
  });

  it("blijft false met bestaande settings", () => {
    localStorage.setItem(
      V2_SETTINGS_KEY,
      JSON.stringify({
        ...v2SettingsDefaults,
        firstValueAt: new Date().toISOString(),
        accountSavePromptDismissed: false,
      }),
    );
    expect(shouldShowAccountSavePrompt()).toBe(false);
  });
});

describe("shouldShowPostOnboardingAccountSave", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("toont na onboarding zonder firstValueAt (guest)", () => {
    expect(shouldShowPostOnboardingAccountSave()).toBe(true);
  });

  it("toont niet na dismiss", () => {
    dismissAccountSavePrompt();
    expect(shouldShowPostOnboardingAccountSave()).toBe(false);
  });
});
