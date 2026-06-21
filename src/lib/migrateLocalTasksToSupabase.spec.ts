import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalTask } from "@/lib/localStorageTasks";

const getTasksFromStorage = vi.fn<() => LocalTask[]>();
const clearAllTasks = vi.fn<() => void>();
const addTaskToSupabase = vi.fn<(userId: string, task: unknown) => Promise<unknown>>();

vi.mock("@/lib/localStorageTasks", () => ({
  getTasksFromStorage: () => getTasksFromStorage(),
  clearAllTasks: () => clearAllTasks(),
}));

vi.mock("@/lib/supabase/tasksDb", () => ({
  addTaskToSupabase: (userId: string, task: unknown) =>
    addTaskToSupabase(userId, task),
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
    addTaskToSupabase.mockReset();
    addTaskToSupabase.mockResolvedValue({});
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
});
