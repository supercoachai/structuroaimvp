import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/authStorage", () => ({
  hasSupabaseAuthHintOnClient: () => false,
}));

import { markV2FirstValue } from "./v2CycleOptInPrompt";
import { shouldShowShutdownNudge } from "./v2ShutdownNudge";
import type { V2State } from "./V2Context";

const baseState: V2State = {
  name: "",
  energy: "enough",
  things: ["Iets"],
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

describe("shouldShowShutdownNudge", () => {
  beforeEach(() => {
    installLocalStorage();
    vi.useRealTimers();
  });

  it("toont niet vóór firstValue, ook niet in de avond", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T21:00:00"));
    expect(shouldShowShutdownNudge(baseState)).toBe(false);
  });

  it("toont wél na firstValue in de avond", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T21:00:00"));
    markV2FirstValue(new Date("2026-07-24T21:00:00"));
    expect(shouldShowShutdownNudge(baseState)).toBe(true);
  });

  it("toont niet overdag, ook niet met firstValue", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T15:00:00"));
    markV2FirstValue(new Date("2026-07-24T15:00:00"));
    expect(shouldShowShutdownNudge(baseState)).toBe(false);
  });
});
