import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regressie: een bestaande check-in waarvan ALLE top3-taken inmiddels ghost zijn
 * (klaar / niet-vandaag / verwijderd) mag het laden niet blokkeren. De repair-flow
 * hoort de verouderde ids stil naar null te schrijven i.p.v. te gooien met
 * "Geen van je gekozen taken kon worden opgeslagen…".
 */

type TaskRow = { id: string; done?: boolean | null; not_today?: boolean | null };

let checkInRow: Record<string, unknown> | null = null;
let taskRows: TaskRow[] = [];
const upsertCalls: Array<Record<string, unknown>> = [];

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "daily_checkins") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: checkInRow, error: null }),
              }),
            }),
          }),
          upsert: (row: Record<string, unknown>) => {
            upsertCalls.push(row);
            checkInRow = { ...(checkInRow ?? {}), ...row };
            return Promise.resolve({ error: null });
          },
        };
      }
      // tasks
      return {
        select: () => ({
          eq: () => ({
            in: (_col: string, ids: string[]) => ({
              // Alleen taken die in taskRows staan komen terug.
              then: (resolve: (v: { data: TaskRow[]; error: null }) => void) =>
                resolve({
                  data: taskRows.filter((t) => ids.includes(t.id)),
                  error: null,
                }),
            }),
          }),
        }),
      };
    },
  }),
}));

import { loadAndRepairCheckInTop3 } from "./top3Repair";

const USER = "user-1";
const DATE = "2026-07-27";

beforeEach(() => {
  checkInRow = null;
  taskRows = [];
  upsertCalls.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("loadAndRepairCheckInTop3", () => {
  it("schrijft top3 naar null als alle gekozen taken ghost zijn, zonder te gooien", async () => {
    checkInRow = {
      id: "c1",
      user_id: USER,
      date: DATE,
      energy_level: "high",
      top3_task_ids: ["ghost-a", "ghost-b"],
      cycle_phase: null,
      created_at: "2026-07-27T06:00:00.000Z",
    };
    // Geen enkele taak bestaat nog (allemaal verwijderd/afgerond).
    taskRows = [];

    const row = await loadAndRepairCheckInTop3(USER, DATE);

    expect(row).not.toBeNull();
    expect(row?.top3_task_ids).toBeNull();
    // Repair heeft de verouderde ids opgeruimd (persist null).
    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0].top3_task_ids).toBeNull();
  });

  it("behoudt geldige, actieve taken", async () => {
    checkInRow = {
      id: "c1",
      user_id: USER,
      date: DATE,
      energy_level: "high",
      top3_task_ids: ["keep-1", "ghost-2"],
      cycle_phase: null,
      created_at: "2026-07-27T06:00:00.000Z",
    };
    taskRows = [{ id: "keep-1", done: false, not_today: false }];

    const row = await loadAndRepairCheckInTop3(USER, DATE);

    expect(row?.top3_task_ids).toEqual(["keep-1"]);
  });
});
