import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/authStorage", () => ({
  hasSupabaseAuthHintOnClient: () => false,
}));

import { markV2FirstValue } from "./v2CycleOptInPrompt";
import {
  dismissAccountSavePrompt,
  shouldShowAccountSavePrompt,
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

  it("toont niet direct na onboarding (geen firstValueAt)", () => {
    expect(shouldShowAccountSavePrompt()).toBe(false);
  });

  it("toont pas na markV2FirstValue (focus/shutdown)", () => {
    markV2FirstValue();
    expect(shouldShowAccountSavePrompt()).toBe(true);
  });

  it("toont niet na dismiss", () => {
    markV2FirstValue();
    dismissAccountSavePrompt();
    expect(shouldShowAccountSavePrompt()).toBe(false);
  });

  it("respecteert bestaande dismiss in settings", () => {
    localStorage.setItem(
      V2_SETTINGS_KEY,
      JSON.stringify({
        ...v2SettingsDefaults,
        firstValueAt: new Date().toISOString(),
        accountSavePromptDismissed: true,
      }),
    );
    expect(shouldShowAccountSavePrompt()).toBe(false);
  });
});
