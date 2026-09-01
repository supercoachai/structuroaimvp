import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  emptyV2DoneTally,
  loadV2DoneTally,
  mondayYmd,
  recordV2Done,
  rollTallyToWeek,
  unrecordV2Done,
  V2_DONE_TALLY_KEY,
} from "./v2DoneTally";

function stubStorage() {
  const store: Record<string, string> = {};
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
  });
  return store;
}

describe("v2DoneTally", () => {
  beforeEach(() => {
    stubStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("zet maandag als weekstart (woensdag → maandag)", () => {
    expect(mondayYmd("2026-09-02")).toBe("2026-08-31");
  });

  it("houdt zondag in dezelfde week als de maandag ervoor", () => {
    expect(mondayYmd("2026-09-06")).toBe("2026-08-31");
  });

  it("telt week en totaal op, en zet week terug bij een nieuwe maandag", () => {
    const tick = recordV2Done("2026-09-02");
    expect(tick).toEqual({
      weekFrom: 0,
      weekTo: 1,
      totalFrom: 0,
      totalTo: 1,
    });
    recordV2Done("2026-09-02");
    const rolled = rollTallyToWeek(loadV2DoneTally("2026-09-02"), "2026-09-07");
    expect(rolled.weekCount).toBe(0);
    expect(rolled.total).toBe(2);
    expect(rolled.weekStart).toBe("2026-09-07");
  });

  it("unrecord daalt niet onder 0", () => {
    expect(unrecordV2Done("2026-09-02")).toEqual(emptyV2DoneTally("2026-09-02"));
  });

  it("schrijft naar localStorage", () => {
    recordV2Done("2026-09-01");
    const raw = window.localStorage.getItem(V2_DONE_TALLY_KEY);
    expect(raw).toContain('"total":1');
  });

  it("zet maand en jaar terug bij een nieuwe periode, houdt totaal", () => {
    recordV2Done("2026-09-02");
    const nextMonth = rollTallyToWeek(loadV2DoneTally("2026-09-02"), "2026-10-01");
    expect(nextMonth.monthCount).toBe(0);
    expect(nextMonth.yearCount).toBe(1);
    expect(nextMonth.total).toBe(1);
    const nextYear = rollTallyToWeek(nextMonth, "2027-01-01");
    expect(nextYear.yearCount).toBe(0);
    expect(nextYear.monthCount).toBe(0);
    expect(nextYear.total).toBe(1);
  });

  it("unrecord daalt week, maand, jaar en totaal", () => {
    recordV2Done("2026-09-02");
    const after = unrecordV2Done("2026-09-02");
    expect(after).toEqual(emptyV2DoneTally("2026-09-02"));
  });
});
