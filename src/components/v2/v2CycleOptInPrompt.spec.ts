import { beforeEach, describe, expect, it, vi } from "vitest";

import type { V2State } from "./V2Context";
import {
  dismissCycleOptInPrompt,
  hasV2FirstValue,
  markV2FirstValue,
  shouldShowCycleOptInPrompt,
} from "./v2CycleOptInPrompt";
import { V2_SETTINGS_KEY, v2SettingsDefaults } from "./v2Settings";

const baseState: V2State = {
  name: "",
  energy: null,
  things: [],
  why: "",
  whyOutcome: "",
  todayDone: false,
  cyclusOptIn: false,
};

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

describe("v2CycleOptInPrompt", () => {
  let localStorage: ReturnType<typeof installLocalStorage>;

  beforeEach(() => {
    localStorage = installLocalStorage();
  });

  it("toont niet vóór eerste waarde", () => {
    expect(shouldShowCycleOptInPrompt(baseState)).toBe(false);
  });

  it("toont eenmalig na eerste waarde", () => {
    markV2FirstValue();
    expect(hasV2FirstValue()).toBe(true);
    expect(shouldShowCycleOptInPrompt(baseState)).toBe(true);

    dismissCycleOptInPrompt();
    expect(shouldShowCycleOptInPrompt(baseState)).toBe(false);
  });

  it("toont niet als cyclus al aan staat", () => {
    markV2FirstValue();
    expect(
      shouldShowCycleOptInPrompt({ ...baseState, cyclusOptIn: true }),
    ).toBe(false);
  });

  it("respecteert bestaande dismiss in settings", () => {
    localStorage.setItem(
      V2_SETTINGS_KEY,
      JSON.stringify({
        ...v2SettingsDefaults,
        firstValueAt: new Date().toISOString(),
        cycleOptInPromptDismissed: true,
      }),
    );
    expect(shouldShowCycleOptInPrompt(baseState)).toBe(false);
  });
});
