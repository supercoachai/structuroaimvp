import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/authStorage", () => ({
  hasSupabaseAuthHintOnClient: () => false,
}));

import { markV2FirstValue } from "./v2CycleOptInPrompt";
import {
  dismissV2ShutdownInvite,
  msUntilV2ShutdownEvening,
  resolveV2ShutdownInvite,
  v2ShutdownInviteAllowedOnPath,
} from "./v2ShutdownInvite";
import { emptyDraft, type V2Task } from "./v2Tasks";
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

function stubStorage() {
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
}

function task(partial: Partial<V2Task> & { title: string }): V2Task {
  return { ...emptyDraft(), ...partial, title: partial.title };
}

describe("resolveV2ShutdownInvite", () => {
  beforeEach(() => {
    stubStorage();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T16:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("toont all_done als er vandaag iets af is en niets meer open staat", () => {
    const tasks = [
      task({
        title: "Klaar",
        done: true,
        completedDate: "2026-09-01",
        completedAt: "2026-09-01T12:00:00.000Z",
      }),
    ];
    expect(resolveV2ShutdownInvite(baseState, new Date(), tasks)).toBe("all_done");
  });

  it("toont niets als de lijst leeg is zonder wins vandaag", () => {
    expect(resolveV2ShutdownInvite(baseState, new Date(), [])).toBeNull();
  });

  it("toont evening vanaf 21:30 na firstValue", () => {
    vi.setSystemTime(new Date("2026-09-01T21:30:00"));
    markV2FirstValue(new Date("2026-09-01T21:30:00"));
    const tasks = [task({ title: "Nog open", done: false })];
    expect(resolveV2ShutdownInvite(baseState, new Date(), tasks)).toBe("evening");
  });

  it("toont all_done liever dan evening als beide kunnen", () => {
    vi.setSystemTime(new Date("2026-09-01T21:45:00"));
    markV2FirstValue(new Date("2026-09-01T21:45:00"));
    const tasks = [
      task({
        title: "Klaar",
        done: true,
        completedDate: "2026-09-01",
        completedAt: "2026-09-01T12:00:00.000Z",
      }),
    ];
    expect(resolveV2ShutdownInvite(baseState, new Date(), tasks)).toBe("all_done");
  });

  it("komt niet terug na Nog niet, tot de andere reden", () => {
    const tasks = [
      task({
        title: "Klaar",
        done: true,
        completedDate: "2026-09-01",
        completedAt: "2026-09-01T12:00:00.000Z",
      }),
    ];
    dismissV2ShutdownInvite("all_done", new Date());
    expect(resolveV2ShutdownInvite(baseState, new Date(), tasks)).toBeNull();
    vi.setSystemTime(new Date("2026-09-01T21:30:00"));
    markV2FirstValue(new Date("2026-09-01T21:30:00"));
    expect(resolveV2ShutdownInvite(baseState, new Date(), tasks)).toBe("evening");
  });

  it("toont niets als de dag al dicht is", () => {
    const tasks = [
      task({
        title: "Klaar",
        done: true,
        completedDate: "2026-09-01",
        completedAt: "2026-09-01T12:00:00.000Z",
      }),
    ];
    expect(
      resolveV2ShutdownInvite({ ...baseState, todayDone: true }, new Date(), tasks),
    ).toBeNull();
  });

  it("staat niet op ritueel- of flow-paden", () => {
    expect(v2ShutdownInviteAllowedOnPath("/shutdown")).toBe(false);
    expect(v2ShutdownInviteAllowedOnPath("/v2/shutdown")).toBe(false);
    expect(v2ShutdownInviteAllowedOnPath("/dagstart")).toBe(false);
    expect(v2ShutdownInviteAllowedOnPath("/focus")).toBe(false);
    expect(v2ShutdownInviteAllowedOnPath("/")).toBe(true);
    expect(v2ShutdownInviteAllowedOnPath("/todo")).toBe(true);
  });

  it("meet de wachttijd tot 21:30", () => {
    vi.setSystemTime(new Date("2026-09-01T20:00:00"));
    expect(msUntilV2ShutdownEvening(new Date())).toBe(90 * 60 * 1000);
    vi.setSystemTime(new Date("2026-09-01T21:30:00"));
    expect(msUntilV2ShutdownEvening(new Date())).toBeNull();
  });
});
