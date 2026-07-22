import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  WHY_SUGGESTION_IDLE_OPENS_REQUIRED,
  getV2WhySuggestion,
  isIdleForWhySuggestion,
  recordWhySuggestionIdleOpen,
  shouldShowWhySuggestionAfterIdleOpens,
} from "./v2WhySuggestion";
import { V2_SETTINGS_KEY, v2SettingsDefaults } from "./v2Settings";
import type { V2State } from "./V2Context";

function installStorage() {
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => {
      local.set(k, String(v));
    },
    removeItem: (k: string) => {
      local.delete(k);
    },
    clear: () => {
      local.clear();
    },
  };
  const sessionStorage = {
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => {
      session.set(k, String(v));
    },
    removeItem: (k: string) => {
      session.delete(k);
    },
    clear: () => {
      session.clear();
    },
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("sessionStorage", sessionStorage);
  vi.stubGlobal("window", { localStorage, sessionStorage });
  return { localStorage, sessionStorage };
}

function baseState(patch: Partial<V2State> = {}): V2State {
  return {
    name: "",
    energy: null,
    things: [],
    why: "rust in mijn hoofd",
    whyOutcome: "",
    todayDone: false,
    cyclusOptIn: false,
    ...patch,
  };
}

describe("why suggestion idle opens", () => {
  beforeEach(() => {
    installStorage();
  });

  it("is idle zonder dagstart", () => {
    expect(isIdleForWhySuggestion(baseState())).toBe(true);
    expect(isIdleForWhySuggestion(baseState({ things: ["mail"] }))).toBe(false);
    expect(isIdleForWhySuggestion(baseState({ todayDone: true }))).toBe(false);
  });

  it("telt max één open per sessie en toont pas na 2 opens", () => {
    const state = baseState();
    expect(shouldShowWhySuggestionAfterIdleOpens(state)).toBe(false);

    expect(recordWhySuggestionIdleOpen(state)).toBe(1);
    expect(shouldShowWhySuggestionAfterIdleOpens(state)).toBe(false);

    // Zelfde sessie: geen tweede teller
    expect(recordWhySuggestionIdleOpen(state)).toBe(1);
    expect(shouldShowWhySuggestionAfterIdleOpens(state)).toBe(false);

    window.sessionStorage.clear();
    expect(recordWhySuggestionIdleOpen(state)).toBe(2);
    expect(shouldShowWhySuggestionAfterIdleOpens(state)).toBe(true);
    expect(WHY_SUGGESTION_IDLE_OPENS_REQUIRED).toBe(2);
  });

  it("reset teller als er wél een dagstart is", () => {
    const idle = baseState();
    recordWhySuggestionIdleOpen(idle);
    window.sessionStorage.clear();
    recordWhySuggestionIdleOpen(idle);

    expect(shouldShowWhySuggestionAfterIdleOpens(idle)).toBe(true);

    const withDaystart = baseState({ things: ["mail"] });
    expect(recordWhySuggestionIdleOpen(withDaystart)).toBe(0);
    expect(shouldShowWhySuggestionAfterIdleOpens(withDaystart)).toBe(false);

    const settings = JSON.parse(localStorage.getItem(V2_SETTINGS_KEY) ?? "{}") as {
      whySuggestionIdleOpenCount?: number;
    };
    expect(settings.whySuggestionIdleOpenCount ?? 0).toBe(0);
  });

  it("levert journey-suggestie op als why bekend is", () => {
    localStorage.setItem(
      V2_SETTINGS_KEY,
      JSON.stringify({ ...v2SettingsDefaults }),
    );
    const suggestion = getV2WhySuggestion(baseState());
    expect(suggestion?.source).toBe("journey");
    expect(suggestion?.title).toBe("Naar dagstart");
    expect(suggestion?.invitation).toContain("rust in mijn hoofd");
  });
});
