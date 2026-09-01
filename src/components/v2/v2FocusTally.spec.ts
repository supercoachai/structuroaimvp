import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadV2DoneTally, rollTallyToWeek } from "./v2DoneTally";
import {
  loadV2FocusTally,
  recordV2FocusSession,
  V2_FOCUS_TALLY_KEY,
} from "./v2FocusTally";

function stubStorage() {
  const store: Record<string, string> = {};
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    },
  });
  return store;
}

describe("v2FocusTally", () => {
  beforeEach(() => {
    stubStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("telt focus-sessies los van afgeronde taken", () => {
    const tick = recordV2FocusSession("2026-09-02");
    expect(tick).toEqual({
      weekFrom: 0,
      weekTo: 1,
      totalFrom: 0,
      totalTo: 1,
    });
    expect(loadV2DoneTally("2026-09-02").total).toBe(0);
    expect(loadV2FocusTally("2026-09-02").total).toBe(1);
  });

  it("zet de weekteller terug op maandag, totaal blijft", () => {
    recordV2FocusSession("2026-09-02");
    recordV2FocusSession("2026-09-02");
    const rolled = rollTallyToWeek(loadV2FocusTally("2026-09-02"), "2026-09-07");
    expect(rolled.weekCount).toBe(0);
    expect(rolled.total).toBe(2);
  });

  it("schrijft naar localStorage", () => {
    recordV2FocusSession("2026-09-01");
    const raw = window.localStorage.getItem(V2_FOCUS_TALLY_KEY);
    expect(raw).toContain('"total":1');
  });
});
