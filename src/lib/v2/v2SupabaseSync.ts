"use client";

/**
 * Supabase-sync voor de v2-shell (taken + dump).
 *
 * localStorage blijft de snelle lokale cache, Supabase is de bron van waarheid
 * voor ingelogde gebruikers:
 * - Hydratie bij app-start: remote taken (tabel `tasks`) en dump-items
 *   (tabel `parked_thoughts`) worden in localStorage gemerged. Zo komt data
 *   terug na uitloggen, browserdata wissen of op een tweede apparaat.
 * - Write-through: elke saveV2Tasks/saveV2Dump plant een gedebouncede push
 *   (insert/update/delete) naar Supabase.
 *
 * Guests (geen sessie) blijven volledig lokaal. Ongeclaimde guest-data wordt
 * eerst door V2ClaimOnAuth gemigreerd; hydratie wacht daarop (skip zolang er
 * onge-claimde lokale data is).
 */

import type { Task } from "@/context/TaskContext";
import { createClient } from "@/lib/supabase/client";
import {
  addTaskToSupabase,
  deleteTaskFromSupabase,
  fetchTasksFromSupabase,
  updateTaskInSupabase,
} from "@/lib/supabase/tasksDb";
import {
  deleteParkedThought,
  fetchParkedThoughts,
  insertParkedThought,
  type ParkedThought,
} from "@/lib/supabase/parkedThoughtsDb";
import {
  hasV2LocalDataToMigrate,
  v2TaskToInsert,
} from "@/lib/migrateV2LocalDataToSupabase";
import {
  loadV2Tasks,
  pruneStaleCompletedV2Tasks,
  V2_TASKS_KEY,
  type V2Priority,
  type V2Repeat,
  type V2Task,
  type V2TaskEnergy,
} from "@/components/v2/v2Tasks";
import { loadV2Dump, V2_DUMP_KEY, type V2DumpItem } from "@/components/v2/v2Dump";

export const V2_SYNC_USER_KEY = "v2_sync_user";
/** Window-event zodra remote data in localStorage is gemerged. */
export const V2_REMOTE_HYDRATED_EVENT = "v2-remote-hydrated";
export const V2_TASKS_REMOTE_MAP_KEY = "v2_tasks_remote_map";
export const V2_DUMP_REMOTE_MAP_KEY = "v2_dump_remote_map";

const migratedKey = (userId: string) => `structuro_v2_migrated_${userId}`;

type IdMap = Record<string, string>;

let syncUserId: string | null = null;
let hydratedForUser: string | null = null;
let hydrationPromise: Promise<void> | null = null;
/** Serialiseert alle remote-pushes zodat volgorde behouden blijft. */
let pushChain: Promise<void> = Promise.resolve();
let taskPushTimer: ReturnType<typeof setTimeout> | null = null;
let dumpPushTimer: ReturnType<typeof setTimeout> | null = null;
const PUSH_DEBOUNCE_MS = 600;

function readIdMap(key: string): IdMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as IdMap) : {};
  } catch {
    return {};
  }
}

function writeIdMap(key: string, map: IdMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* privémodus */
  }
}

function writeLocalTasks(tasks: V2Task[]): void {
  try {
    window.localStorage.setItem(V2_TASKS_KEY, JSON.stringify(tasks));
  } catch {
    /* privémodus */
  }
}

function writeLocalDump(items: V2DumpItem[]): void {
  try {
    window.localStorage.setItem(V2_DUMP_KEY, JSON.stringify(items));
  } catch {
    /* privémodus */
  }
}

function reverseRepeat(task: Task): { repeat: V2Repeat; repeatIntervalDays: number | null } {
  if (task.repeat === "daily") {
    return {
      repeat: task.repeatWeekdays === "weekdays" ? "weekdays" : "daily",
      repeatIntervalDays: null,
    };
  }
  if (task.repeat === "weekly") return { repeat: "weekly", repeatIntervalDays: null };
  if (task.repeat === "interval") {
    return {
      repeat: "interval",
      repeatIntervalDays:
        typeof task.repeatIntervalDays === "number" ? task.repeatIntervalDays : null,
    };
  }
  return { repeat: "none", repeatIntervalDays: null };
}

function ymdOrNull(iso: string | null | undefined): string | null {
  if (typeof iso !== "string" || iso.length < 10) return null;
  const ymd = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

/** Supabase Task (v1-model) → V2Task voor de v2-lijst. */
export function supabaseTaskToV2Task(task: Task, localId: string): V2Task {
  const { repeat, repeatIntervalDays } = reverseRepeat(task);
  const priority: V2Priority =
    task.priority === 1 || task.priority === 2 || task.priority === 3
      ? task.priority
      : null;
  const energy: V2TaskEnergy =
    task.energyLevel === "low" || task.energyLevel === "medium" || task.energyLevel === "high"
      ? task.energyLevel
      : null;
  return {
    id: localId,
    title: task.title ?? "",
    done: task.done === true,
    completedDate: task.done ? ymdOrNull(task.completedAt) : null,
    dueDate: ymdOrNull(task.dueAt),
    repeat,
    repeatIntervalDays,
    priority,
    energy,
    microSteps: Array.isArray(task.microSteps)
      ? task.microSteps.map((m) => ({
          id: String(m.id ?? ""),
          title: String(m.title ?? ""),
          done: m.done === true,
        }))
      : [],
    why: null,
    outcome: null,
    snoozeUntil: task.notToday ? "rest" : null,
    durationBucket: null,
    createdAt: task.created_at ?? new Date().toISOString(),
  };
}

/**
 * Merge remote taken in de lokale lijst (pure functie, getest).
 * - Remote wint voor gemapte taken (cross-device last-write-wins).
 * - Gemapte lokale taken die remote weg zijn, verdwijnen lokaal.
 * - Lokale taken zonder mapping blijven staan (worden later gepusht).
 * - Nieuwe remote taken komen erbij met local id `sb-<remoteId>`.
 * - Open taken met dezelfde titel (trim, case-insensitive) worden
 *   samengevoegd: voorkomt dat hydratie + journey-seed of DB-dubbels
 *   dezelfde taak twee keer in /todo tonen (afronden lijkt dan "niks").
 */
export function mergeRemoteTasksIntoLocal(
  local: V2Task[],
  remote: Task[],
  map: IdMap
): { tasks: V2Task[]; map: IdMap } {
  const nextMap: IdMap = {};
  const remoteById = new Map(remote.map((t) => [String(t.id), t]));
  const mappedRemoteIds = new Set(Object.values(map));
  const result: V2Task[] = [];

  for (const task of local) {
    const remoteId = map[task.id];
    if (!remoteId) {
      // Nog niet gepusht: lokaal bewaren.
      result.push(task);
      continue;
    }
    const remoteTask = remoteById.get(remoteId);
    if (!remoteTask) continue; // elders verwijderd
    result.push(supabaseTaskToV2Task(remoteTask, task.id));
    nextMap[task.id] = remoteId;
  }

  for (const task of remote) {
    const remoteId = String(task.id);
    if (mappedRemoteIds.has(remoteId)) continue;
    if (Object.values(nextMap).includes(remoteId)) continue;
    const localId = `sb-${remoteId}`;
    if (result.some((t) => t.id === localId)) continue;

    const titleKey = (task.title ?? "").trim().toLowerCase();
    if (!task.done && titleKey) {
      const existing = result.find(
        (t) => !t.done && t.title.trim().toLowerCase() === titleKey
      );
      if (existing) {
        // Koppel bestaande lokale open taak i.p.v. een tweede rij.
        if (!nextMap[existing.id]) {
          nextMap[existing.id] = remoteId;
        }
        continue;
      }
    }

    result.push(supabaseTaskToV2Task(task, localId));
    nextMap[localId] = remoteId;
  }

  const collapsed = collapseOpenTasksByTitle(result, nextMap);
  return { tasks: pruneStaleCompletedV2Tasks(collapsed.tasks), map: collapsed.map };
}

/** Eén open rij per titel; mapping van gedropte dubbels gaat naar de keeper. */
export function collapseOpenTasksByTitle(
  tasks: V2Task[],
  map: IdMap
): { tasks: V2Task[]; map: IdMap } {
  const nextMap: IdMap = { ...map };
  const seen = new Map<string, string>();
  const out: V2Task[] = [];

  for (const task of tasks) {
    if (task.done) {
      out.push(task);
      continue;
    }
    const key = task.title.trim().toLowerCase();
    if (!key) {
      out.push(task);
      continue;
    }
    const keptId = seen.get(key);
    if (!keptId) {
      seen.set(key, task.id);
      out.push(task);
      continue;
    }
    const droppedRemote = nextMap[task.id];
    if (droppedRemote && !nextMap[keptId]) {
      nextMap[keptId] = droppedRemote;
    }
    delete nextMap[task.id];
  }

  return { tasks: out, map: nextMap };
}

function remoteThoughtToDumpItem(thought: ParkedThought, localId: string): V2DumpItem {
  return {
    id: localId,
    content: thought.content,
    createdAt: thought.createdAt,
    disposition: null,
  };
}

/** Merge remote dump-gedachten in de lokale dump (pure functie, getest). */
export function mergeRemoteDumpIntoLocal(
  local: V2DumpItem[],
  remote: ParkedThought[],
  map: IdMap
): { items: V2DumpItem[]; map: IdMap } {
  const nextMap: IdMap = {};
  const remoteById = new Map(remote.map((t) => [String(t.id), t]));
  const mappedRemoteIds = new Set(Object.values(map));
  const result: V2DumpItem[] = [];

  for (const item of local) {
    const remoteId = map[item.id];
    if (!remoteId) {
      result.push(item);
      continue;
    }
    if (!remoteById.has(remoteId)) {
      // Elders verwijderd of geconverteerd; lokaal ook weg.
      continue;
    }
    // Lokale metadata (disposition/triage) wint; content komt van remote.
    const remoteItem = remoteById.get(remoteId)!;
    result.push({ ...item, content: remoteItem.content });
    nextMap[item.id] = remoteId;
  }

  for (const thought of remote) {
    const remoteId = String(thought.id);
    if (mappedRemoteIds.has(remoteId)) continue;
    const localId = `sbd-${remoteId}`;
    if (result.some((i) => i.id === localId)) continue;
    result.push(remoteThoughtToDumpItem(thought, localId));
    nextMap[localId] = remoteId;
  }

  result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { items: result, map: nextMap };
}

async function getAuthedUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function hydrateNow(): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = await getAuthedUserId();
  if (!userId) {
    syncUserId = null;
    return;
  }

  // Onge-claimde guest-data: eerst laten claimen door V2ClaimOnAuth
  // (die migreert, wist lokaal en herlaadt). Hydratie komt daarna.
  let migrated = false;
  try {
    migrated = window.localStorage.getItem(migratedKey(userId)) === "1";
  } catch {
    /* ignore */
  }
  if (!migrated && hasV2LocalDataToMigrate()) {
    return;
  }

  // Ander account op dit apparaat: lokale v2-data en mappings wissen.
  let storedUser: string | null = null;
  try {
    storedUser = window.localStorage.getItem(V2_SYNC_USER_KEY);
  } catch {
    /* ignore */
  }
  if (storedUser && storedUser !== userId) {
    try {
      window.localStorage.removeItem(V2_TASKS_KEY);
      window.localStorage.removeItem(V2_DUMP_KEY);
      window.localStorage.removeItem(V2_TASKS_REMOTE_MAP_KEY);
      window.localStorage.removeItem(V2_DUMP_REMOTE_MAP_KEY);
    } catch {
      /* ignore */
    }
  }

  const [remoteTasks, remoteThoughts] = await Promise.all([
    fetchTasksFromSupabase(userId).catch((err) => {
      console.warn("[v2Sync] taken ophalen mislukt", err);
      return null;
    }),
    fetchParkedThoughts(userId).catch((err) => {
      console.warn("[v2Sync] dump ophalen mislukt", err);
      return null;
    }),
  ]);

  if (remoteTasks) {
    const merged = mergeRemoteTasksIntoLocal(
      loadV2Tasks(),
      remoteTasks,
      readIdMap(V2_TASKS_REMOTE_MAP_KEY)
    );
    writeLocalTasks(merged.tasks);
    writeIdMap(V2_TASKS_REMOTE_MAP_KEY, merged.map);
  }

  if (remoteThoughts) {
    const merged = mergeRemoteDumpIntoLocal(
      loadV2Dump(),
      remoteThoughts,
      readIdMap(V2_DUMP_REMOTE_MAP_KEY)
    );
    writeLocalDump(merged.items);
    writeIdMap(V2_DUMP_REMOTE_MAP_KEY, merged.map);
  }

  try {
    window.localStorage.setItem(V2_SYNC_USER_KEY, userId);
    // Hydrated data mag nooit opnieuw "geclaimd" worden door V2ClaimOnAuth.
    window.localStorage.setItem(migratedKey(userId), "1");
  } catch {
    /* ignore */
  }

  syncUserId = userId;
  hydratedForUser = userId;

  // Al gemounte schermen kunnen hun lijst verversen.
  try {
    window.dispatchEvent(new CustomEvent(V2_REMOTE_HYDRATED_EVENT));
  } catch {
    /* ignore */
  }
}

/**
 * Hydrateer één keer per pageload. V2Provider wacht hierop (met timeout)
 * voordat `ready` waar wordt, zodat pagina's meteen de gemergde lijst zien.
 */
export function hydrateV2FromSupabase(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!hydrationPromise) {
    hydrationPromise = hydrateNow().catch((err) => {
      console.warn("[v2Sync] hydratie mislukt", err);
    });
  }
  return hydrationPromise;
}

function isSyncActive(): boolean {
  return Boolean(syncUserId && hydratedForUser === syncUserId);
}

async function pushTasksNow(tasks: V2Task[]): Promise<void> {
  const userId = syncUserId;
  if (!userId) return;

  const map = readIdMap(V2_TASKS_REMOTE_MAP_KEY);
  const localIds = new Set(tasks.map((t) => t.id));

  // Verwijderd lokaal → remote weg.
  for (const [localId, remoteId] of Object.entries(map)) {
    if (localIds.has(localId)) continue;
    try {
      await deleteTaskFromSupabase(userId, remoteId);
      delete map[localId];
    } catch (err) {
      console.warn("[v2Sync] taak verwijderen mislukt", remoteId, err);
      delete map[localId];
    }
  }

  for (const task of tasks) {
    if (!task.title.trim()) continue;
    const remoteId = map[task.id];
    try {
      if (!remoteId) {
        const created = await addTaskToSupabase(userId, v2TaskToInsert(task));
        if (created?.id) map[task.id] = String(created.id);
      } else {
        await updateTaskInSupabase(userId, remoteId, v2TaskToInsert(task));
      }
    } catch (err) {
      console.warn("[v2Sync] taak syncen mislukt", task.id, err);
    }
  }

  writeIdMap(V2_TASKS_REMOTE_MAP_KEY, map);
}

async function pushDumpNow(items: V2DumpItem[]): Promise<void> {
  const userId = syncUserId;
  if (!userId) return;

  const map = readIdMap(V2_DUMP_REMOTE_MAP_KEY);
  // "today" = geconverteerd naar taak; de remote gedachte mag dan weg
  // (de taak zelf loopt via de taken-sync).
  const activeIds = new Set(
    items.filter((i) => i.disposition !== "today").map((i) => i.id)
  );

  for (const [localId, remoteId] of Object.entries(map)) {
    if (activeIds.has(localId)) continue;
    try {
      await deleteParkedThought(remoteId);
    } catch (err) {
      console.warn("[v2Sync] dump verwijderen mislukt", remoteId, err);
    }
    delete map[localId];
  }

  for (const item of items) {
    if (item.disposition === "today") continue;
    if (map[item.id]) continue;
    try {
      const created = await insertParkedThought(userId, item.content);
      if (created?.id) map[item.id] = String(created.id);
    } catch (err) {
      // max_reached of netwerk: lokaal blijft leidend, volgende save opnieuw.
      console.warn("[v2Sync] dump syncen mislukt", item.id, err);
    }
  }

  writeIdMap(V2_DUMP_REMOTE_MAP_KEY, map);
}

/** Debounced write-through vanuit saveV2Tasks. Guests: no-op. */
export function queueV2TasksPush(): void {
  if (typeof window === "undefined" || !isSyncActive()) return;
  if (taskPushTimer) clearTimeout(taskPushTimer);
  taskPushTimer = setTimeout(() => {
    taskPushTimer = null;
    const snapshot = loadV2Tasks();
    pushChain = pushChain.then(() => pushTasksNow(snapshot));
  }, PUSH_DEBOUNCE_MS);
}

/** Debounced write-through vanuit saveV2Dump. Guests: no-op. */
export function queueV2DumpPush(): void {
  if (typeof window === "undefined" || !isSyncActive()) return;
  if (dumpPushTimer) clearTimeout(dumpPushTimer);
  dumpPushTimer = setTimeout(() => {
    dumpPushTimer = null;
    const snapshot = loadV2Dump();
    pushChain = pushChain.then(() => pushDumpNow(snapshot));
  }, PUSH_DEBOUNCE_MS);
}

/** Alleen voor tests. */
export function __resetV2SyncStateForTests(): void {
  syncUserId = null;
  hydratedForUser = null;
  hydrationPromise = null;
  pushChain = Promise.resolve();
  if (taskPushTimer) clearTimeout(taskPushTimer);
  if (dumpPushTimer) clearTimeout(dumpPushTimer);
  taskPushTimer = null;
  dumpPushTimer = null;
}
