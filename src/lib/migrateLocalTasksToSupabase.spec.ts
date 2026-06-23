import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalTask } from "@/lib/localStorageTasks";

const getTasksFromStorage = vi.fn<() => LocalTask[]>();
const clearAllTasks = vi.fn<() => void>();
const getTodayCheckIn = vi.fn<() => unknown | null>();
const clearTodayCheckInFromStorage = vi.fn<() => void>();
const addTaskToSupabase = vi.fn<(userId: string, task: unknown) => Promise<unknown>>();
const upsertCheckInToSupabase =
  vi.fn<(userId: string, date: string, payload: unknown) => Promise<unknown>>();

vi.mock("@/lib/localStorageTasks", () => ({
  getTasksFromStorage: () => getTasksFromStorage(),
  clearAllTasks: () => clearAllTasks(),
  getTodayCheckIn: () => getTodayCheckIn(),
  clearTodayCheckInFromStorage: () => clearTodayCheckInFromStorage(),
}));

vi.mock("@/lib/supabase/tasksDb", () => ({
  addTaskToSupabase: (userId: string, task: unknown) =>
    addTaskToSupabase(userId, task),
}));

vi.mock("@/lib/supabase/checkinsDb", () => ({
  upsertCheckInToSupabase: (userId: string, date: string, payload: unknown) =>
    upsertCheckInToSupabase(userId, date, payload),
}));

vi.mock("@/lib/dagstartCookie", () => ({
  getCalendarDateAmsterdam: () => "2026-06-23",
}));

import { migrateLocalTasksToSupabase } from "./migrateLocalTasksToSupabase";

const USER = "user-123";

function makeTask(id: string): LocalTask {
  return {
    id,
    title: `Taak ${id}`,
    done: false,
    started: false,
    priority: null,
    dueAt: null,
    duration: null,
    source: "regular",
    completedAt: null,
    reminders: [],
    repeat: "none",
    impact: "🌱",
    energyLevel: "medium",
    estimatedDuration: null,
    microSteps: [],
    notToday: false,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  };
}

function installFakeLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  // @ts-expect-error testomgeving: minimale window-stub
  globalThis.window = { localStorage };
  return store;
}

describe("migrateLocalTasksToSupabase", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installFakeLocalStorage();
    getTasksFromStorage.mockReset();
    clearAllTasks.mockReset();
    getTodayCheckIn.mockReset();
    getTodayCheckIn.mockReturnValue(null);
    clearTodayCheckInFromStorage.mockReset();
    addTaskToSupabase.mockReset();
    addTaskToSupabase.mockResolvedValue({});
    upsertCheckInToSupabase.mockReset();
    upsertCheckInToSupabase.mockResolvedValue({ top3_task_ids: null });
  });

  afterEach(() => {
    // @ts-expect-error opruimen window-stub
    delete globalThis.window;
  });

  it("(a) volledige migratie: wist lokaal en zet de migrated-vlag", async () => {
    getTasksFromStorage.mockReturnValue([makeTask("a"), makeTask("b")]);

    const uploaded = await migrateLocalTasksToSupabase(USER);

    expect(uploaded).toBe(2);
    expect(addTaskToSupabase).toHaveBeenCalledTimes(2);
    expect(clearAllTasks).toHaveBeenCalledTimes(1);
    expect(store.get(`structuro_tasks_migrated_${USER}`)).toBe("1");
    // per-taak markering opgeruimd na volledige migratie
    expect(store.get(`structuro_tasks_migrated_ids_${USER}`)).toBeUndefined();
  });

  it("(b) gedeeltelijke fout: geen clear, geen vlag, geen dataverlies", async () => {
    getTasksFromStorage.mockReturnValue([
      makeTask("a"),
      makeTask("b"),
      makeTask("c"),
    ]);
    addTaskToSupabase
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("netwerk"))
      .mockResolvedValueOnce({});

    const uploaded = await migrateLocalTasksToSupabase(USER);

    expect(uploaded).toBe(2);
    expect(clearAllTasks).not.toHaveBeenCalled();
    expect(store.get(`structuro_tasks_migrated_${USER}`)).toBeUndefined();
    // geslaagde taken zijn gemarkeerd voor een latere retry
    const marked = JSON.parse(
      store.get(`structuro_tasks_migrated_ids_${USER}`) ?? "[]"
    );
    expect(new Set(marked)).toEqual(new Set(["a", "c"]));
  });

  it("(c) retry na gedeeltelijke fout: geen duplicaten, voltooit migratie", async () => {
    const tasks = [makeTask("a"), makeTask("b"), makeTask("c")];
    getTasksFromStorage.mockReturnValue(tasks);

    // Eerste run: taak b faalt.
    addTaskToSupabase
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("netwerk"))
      .mockResolvedValueOnce({});
    await migrateLocalTasksToSupabase(USER);

    expect(addTaskToSupabase).toHaveBeenCalledTimes(3);
    addTaskToSupabase.mockReset();
    addTaskToSupabase.mockResolvedValue({});

    // Tweede run (retry): alleen de eerder mislukte taak b mag opnieuw.
    const uploaded = await migrateLocalTasksToSupabase(USER);

    expect(uploaded).toBe(1);
    expect(addTaskToSupabase).toHaveBeenCalledTimes(1);
    expect(addTaskToSupabase).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ title: "Taak b" })
    );
    expect(clearAllTasks).toHaveBeenCalledTimes(1);
    expect(store.get(`structuro_tasks_migrated_${USER}`)).toBe("1");
  });

  it("doet niets als de migratie al voltooid is", async () => {
    store.set(`structuro_tasks_migrated_${USER}`, "1");
    getTasksFromStorage.mockReturnValue([makeTask("a")]);

    const uploaded = await migrateLocalTasksToSupabase(USER);

    expect(uploaded).toBe(0);
    expect(addTaskToSupabase).not.toHaveBeenCalled();
    expect(clearAllTasks).not.toHaveBeenCalled();
  });

  it("zet de vlag zonder upload als er geen lokale taken zijn", async () => {
    getTasksFromStorage.mockReturnValue([]);

    const uploaded = await migrateLocalTasksToSupabase(USER);

    expect(uploaded).toBe(0);
    expect(addTaskToSupabase).not.toHaveBeenCalled();
    expect(clearAllTasks).not.toHaveBeenCalled();
    expect(store.get(`structuro_tasks_migrated_${USER}`)).toBe("1");
  });

  it("migreert de dagstart-check-in mee en remapt de top3-id naar de nieuwe Supabase-id", async () => {
    getTasksFromStorage.mockReturnValue([makeTask("local-welcome")]);
    addTaskToSupabase.mockResolvedValue({ id: "supabase-uuid-1" });
    getTodayCheckIn.mockReturnValue({
      date: "2026-06-23",
      energy_level: "low",
      top3_task_ids: ["local-welcome"],
      user_id: "local",
    });

    const uploaded = await migrateLocalTasksToSupabase(USER);

    expect(uploaded).toBe(1);
    // Check-in is met de NIEUWE supabase-id naar Supabase geschreven (niet de lokale id).
    expect(upsertCheckInToSupabase).toHaveBeenCalledTimes(1);
    expect(upsertCheckInToSupabase).toHaveBeenCalledWith(USER, "2026-06-23", {
      energy_level: "low",
      top3_task_ids: ["supabase-uuid-1"],
    });
    expect(clearTodayCheckInFromStorage).toHaveBeenCalledTimes(1);
    expect(store.get(`structuro_checkin_migrated_${USER}`)).toBe("1");
    // De check-in-migratie gebeurt vóór het wissen van lokale taken.
    expect(clearAllTasks).toHaveBeenCalledTimes(1);
  });

  it("schrijft de check-in pas na het uploaden van de taken (volgorde)", async () => {
    const calls: string[] = [];
    getTasksFromStorage.mockReturnValue([makeTask("local-welcome")]);
    addTaskToSupabase.mockImplementation(async () => {
      calls.push("task");
      return { id: "supabase-uuid-1" };
    });
    upsertCheckInToSupabase.mockImplementation(async () => {
      calls.push("checkin");
      return { top3_task_ids: ["supabase-uuid-1"] };
    });
    getTodayCheckIn.mockReturnValue({
      date: "2026-06-23",
      energy_level: "low",
      top3_task_ids: ["local-welcome"],
    });

    await migrateLocalTasksToSupabase(USER);

    expect(calls).toEqual(["task", "checkin"]);
  });

  it("laat de welkomstaak geen migratie van een afwezige check-in forceren", async () => {
    getTasksFromStorage.mockReturnValue([makeTask("local-welcome")]);
    addTaskToSupabase.mockResolvedValue({ id: "supabase-uuid-1" });
    getTodayCheckIn.mockReturnValue(null);

    await migrateLocalTasksToSupabase(USER);

    expect(upsertCheckInToSupabase).not.toHaveBeenCalled();
    // Markering gezet zodat we niet blijven proberen.
    expect(store.get(`structuro_checkin_migrated_${USER}`)).toBe("1");
  });
});
