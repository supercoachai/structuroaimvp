import { beforeEach, describe, expect, it, vi } from "vitest";

const addTaskToSupabase = vi.fn();
const upsertCheckInToSupabase = vi.fn();
const insertParkedThought = vi.fn();
const persistPreferredDisplayName = vi.fn();
const loadV2Tasks = vi.fn(() => [] as Array<{ id: string; title: string }>);
const loadV2Dump = vi.fn(() => [] as Array<{ id: string; content: string }>);
const findV2TaskByTitle = vi.fn(() => null);

vi.mock("@/lib/supabase/tasksDb", () => ({
  addTaskToSupabase: (...args: unknown[]) => addTaskToSupabase(...args),
}));

vi.mock("@/lib/supabase/checkinsDb", () => ({
  upsertCheckInToSupabase: (...args: unknown[]) => upsertCheckInToSupabase(...args),
}));

vi.mock("@/lib/supabase/parkedThoughtsDb", () => ({
  insertParkedThought: (...args: unknown[]) => insertParkedThought(...args),
}));

vi.mock("@/lib/accountDisplayName", () => ({
  persistPreferredDisplayName: (...args: unknown[]) =>
    persistPreferredDisplayName(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } } }),
    },
  }),
}));

vi.mock("@/lib/dagstartCookie", () => ({
  getCalendarDateAmsterdam: () => "2026-07-21",
  setDagstartCookieOnClient: vi.fn(),
}));

vi.mock("@/components/v2/v2Dump", () => ({
  loadV2Dump: () => loadV2Dump(),
}));

vi.mock("@/components/v2/v2Tasks", () => ({
  loadV2Tasks: () => loadV2Tasks(),
  findV2TaskByTitle: (...args: unknown[]) => findV2TaskByTitle(...args),
}));

import {
  hasV2LocalDataToMigrate,
  migrateV2LocalDataToSupabase,
} from "./migrateV2LocalDataToSupabase";

const USER = "user-1";

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
  vi.stubGlobal("window", {
    localStorage,
    dispatchEvent: vi.fn(),
  });
}

function seedJourney(things = ["Mail versturen"]) {
  localStorage.setItem(
    "v2_journey",
    JSON.stringify({
      name: "Niels",
      energy: "enough",
      things,
      why: "",
      whyOutcome: "",
      todayDone: false,
      cyclusOptIn: false,
    }),
  );
}

describe("migrateV2LocalDataToSupabase", () => {
  beforeEach(() => {
    installLocalStorage();
    vi.clearAllMocks();
    loadV2Tasks.mockReturnValue([]);
    loadV2Dump.mockReturnValue([]);
    findV2TaskByTitle.mockReturnValue(null);
    addTaskToSupabase.mockImplementation(async (_uid: string, task: { title: string }) => ({
      id: `sb-${task.title}`,
      ...task,
    }));
    upsertCheckInToSupabase.mockResolvedValue({});
    insertParkedThought.mockResolvedValue({});
    persistPreferredDisplayName.mockResolvedValue(undefined);
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  it("detecteert lokale journey-data", () => {
    seedJourney();
    expect(hasV2LocalDataToMigrate()).toBe(true);
  });

  it("geen lokale data: gemarkeerd klaar, geen uploads, migrated=false", async () => {
    expect(hasV2LocalDataToMigrate()).toBe(false);
    const result = await migrateV2LocalDataToSupabase(USER);
    expect(result).toEqual({ migrated: false, taskCount: 0, dumpCount: 0 });
    expect(addTaskToSupabase).not.toHaveBeenCalled();
    expect(upsertCheckInToSupabase).not.toHaveBeenCalled();
    expect(localStorage.getItem(`structuro_v2_migrated_${USER}`)).toBe("1");
  });

  it("migreert things naar taken + check-in en wist lokale keys", async () => {
    seedJourney();
    localStorage.setItem(
      "v2_settings",
      JSON.stringify({
        lastPeriodStart: "2026-07-01",
        cycleLength: 28,
        menstruationDuration: 5,
      }),
    );

    const result = await migrateV2LocalDataToSupabase(USER);

    expect(result.migrated).toBe(true);
    expect(result.taskCount).toBeGreaterThanOrEqual(1);
    expect(addTaskToSupabase).toHaveBeenCalled();
    expect(upsertCheckInToSupabase).toHaveBeenCalledWith(
      USER,
      "2026-07-21",
      expect.objectContaining({
        energy_level: "medium",
        top3_task_ids: expect.arrayContaining(["sb-Mail versturen"]),
      }),
    );
    expect(localStorage.getItem("v2_journey")).toBeNull();
    expect(localStorage.getItem("v2_settings")).toBeNull();
    expect(localStorage.getItem(`structuro_v2_migrated_${USER}`)).toBe("1");
  });

  it("idempotent: tweede claim na succes uploadt niet opnieuw", async () => {
    seedJourney(["Water"]);
    await migrateV2LocalDataToSupabase(USER);
    addTaskToSupabase.mockClear();
    upsertCheckInToSupabase.mockClear();

    const again = await migrateV2LocalDataToSupabase(USER);
    expect(again.migrated).toBe(false);
    expect(addTaskToSupabase).not.toHaveBeenCalled();
    expect(upsertCheckInToSupabase).not.toHaveBeenCalled();
  });

  it("gedeeltelijke taak-fout: geen wipe, geen migrated-flag, retry kan verder", async () => {
    loadV2Tasks.mockReturnValue([
      {
        id: "v2t-1",
        title: "Taak A",
        done: false,
        dueDate: null,
        repeat: "none",
        repeatIntervalDays: null,
        priority: null,
        energy: "medium",
        microSteps: [],
        why: null,
        outcome: null,
        snoozeUntil: null,
        durationBucket: null,
        createdAt: "2026-07-21T10:00:00.000Z",
      },
      {
        id: "v2t-2",
        title: "Taak B",
        done: false,
        dueDate: null,
        repeat: "none",
        repeatIntervalDays: null,
        priority: null,
        energy: "medium",
        microSteps: [],
        why: null,
        outcome: null,
        snoozeUntil: null,
        durationBucket: null,
        createdAt: "2026-07-21T10:01:00.000Z",
      },
    ]);
    seedJourney([]);

    addTaskToSupabase
      .mockResolvedValueOnce({ id: "sb-a", title: "Taak A" })
      .mockRejectedValueOnce(new Error("network"));

    const result = await migrateV2LocalDataToSupabase(USER);

    expect(result.migrated).toBe(false);
    expect(localStorage.getItem("v2_journey")).not.toBeNull();
    expect(localStorage.getItem(`structuro_v2_migrated_${USER}`)).toBeNull();
    expect(localStorage.getItem(`structuro_v2_migrated_task_ids_${USER}`)).toContain(
      "v2t-1",
    );

    // Retry: tweede taak slaagt nu; geen duplicaat van taak A.
    addTaskToSupabase.mockReset();
    addTaskToSupabase.mockResolvedValue({ id: "sb-b", title: "Taak B" });
    const retry = await migrateV2LocalDataToSupabase(USER);
    expect(retry.migrated).toBe(true);
    expect(addTaskToSupabase).toHaveBeenCalledTimes(1);
    expect(addTaskToSupabase.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ title: "Taak B" }),
    );
    expect(localStorage.getItem("v2_journey")).toBeNull();
  });
});
