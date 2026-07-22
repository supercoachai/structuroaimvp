"use client";

/**
 * Migreert V2 localStorage (journey/taken/dump) naar Supabase na account-aanmaak
 * of login. Cyclusvelden blijven bewust lokaal (privacy-belofte in de UI).
 *
 * Idempotent per userId. Best-effort: fouten breken signup/login niet.
 */

import { persistPreferredDisplayName } from "@/lib/accountDisplayName";
import { getCalendarDateAmsterdam, setDagstartCookieOnClient } from "@/lib/dagstartCookie";
import type { Task } from "@/context/TaskContext";
import { createClient } from "@/lib/supabase/client";
import { upsertCheckInToSupabase } from "@/lib/supabase/checkinsDb";
import { insertParkedThought } from "@/lib/supabase/parkedThoughtsDb";
import { addTaskToSupabase } from "@/lib/supabase/tasksDb";
import type { DagstartEnergy } from "@/lib/supabase/profileDagstartDb";
import { loadV2Dump } from "@/components/v2/v2Dump";
import {
  findV2TaskByTitle,
  loadV2Tasks,
  type V2Repeat,
  type V2Task,
} from "@/components/v2/v2Tasks";

function normalizeThings(things: string[] | undefined | null): string[] {
  if (!Array.isArray(things)) return [];
  return things
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim());
}

const JOURNEY_KEY = "v2_journey";
/** Spiegel van V2_ANONYMOUS_STORAGE_KEYS (geen TSX-import in lib-tests). */
const V2_ANON_KEYS = [
  "v2_journey",
  "v2_dump",
  "v2_dump_draft",
  "v2_tasks",
  "v2_settings",
  "v2_adaptive",
] as const;

const migratedKey = (userId: string) => `structuro_v2_migrated_${userId}`;
const migratedTaskIdsKey = (userId: string) =>
  `structuro_v2_migrated_task_ids_${userId}`;
const migratedIdMapKey = (userId: string) =>
  `structuro_v2_migrated_id_map_${userId}`;
const migratedDumpIdsKey = (userId: string) =>
  `structuro_v2_migrated_dump_ids_${userId}`;

export type V2MigrateResult = {
  /** True als er iets te claimen was (journey/taken/dump) en de flow is afgerond. */
  migrated: boolean;
  taskCount: number;
  dumpCount: number;
};

type JourneySnapshot = {
  name: string;
  energy: "low" | "enough" | "high" | null;
  things: string[];
};

function clearV2AnonymousStorage(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of V2_ANON_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

function readJourney(): JourneySnapshot {
  if (typeof window === "undefined") {
    return { name: "", energy: null, things: [] };
  }
  try {
    const raw = window.localStorage.getItem(JOURNEY_KEY);
    if (!raw) return { name: "", energy: null, things: [] };
    const parsed = JSON.parse(raw) as {
      name?: string;
      energy?: "low" | "enough" | "high" | null;
      things?: string[];
      thing?: string;
    };
    const things = Array.isArray(parsed.things)
      ? parsed.things
      : typeof parsed.thing === "string" && parsed.thing.trim()
        ? [parsed.thing.trim()]
        : [];
    const energy =
      parsed.energy === "low" ||
      parsed.energy === "enough" ||
      parsed.energy === "high"
        ? parsed.energy
        : null;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      energy,
      things: normalizeThings(things),
    };
  } catch {
    return { name: "", energy: null, things: [] };
  }
}

function mapEnergy(
  energy: JourneySnapshot["energy"]
): DagstartEnergy | null {
  if (energy === "low") return "low";
  if (energy === "high") return "high";
  if (energy === "enough") return "medium";
  return null;
}

function mapRepeat(repeat: V2Repeat): Pick<
  Task,
  "repeat" | "repeatWeekdays" | "repeatIntervalDays" | "repeatAnchor"
> {
  switch (repeat) {
    case "daily":
      return {
        repeat: "daily",
        repeatWeekdays: "all",
        repeatIntervalDays: undefined,
        repeatAnchor: "planned",
      };
    case "weekdays":
      return {
        repeat: "daily",
        repeatWeekdays: "weekdays",
        repeatIntervalDays: undefined,
        repeatAnchor: "planned",
      };
    case "weekly":
      return {
        repeat: "weekly",
        repeatWeekdays: "all",
        repeatIntervalDays: undefined,
        repeatAnchor: "planned",
      };
    case "interval":
      return {
        repeat: "interval",
        repeatWeekdays: "all",
        repeatIntervalDays: undefined,
        repeatAnchor: "completion",
      };
    default:
      return {
        repeat: "none",
        repeatWeekdays: "all",
        repeatIntervalDays: undefined,
        repeatAnchor: "planned",
      };
  }
}

function v2TaskToInsert(task: V2Task): Omit<Task, "id"> {
  const repeatFields = mapRepeat(task.repeat);
  return {
    title: task.title,
    done: task.done,
    started: false,
    priority: task.priority,
    dueAt: task.dueDate ? `${task.dueDate}T12:00:00.000Z` : undefined,
    source: "regular",
    postponedTo: null,
    focusStartedAt: null,
    focusExitedAt: null,
    focusAttempts: 0,
    completedAt: task.done ? task.createdAt : undefined,
    reminders: [],
    repeat: repeatFields.repeat,
    repeatWeekdays: repeatFields.repeatWeekdays,
    repeatAnchor: repeatFields.repeatAnchor,
    repeatIntervalDays:
      task.repeat === "interval" && task.repeatIntervalDays != null
        ? task.repeatIntervalDays
        : repeatFields.repeatIntervalDays,
    impact: "🌱",
    energyLevel: task.energy ?? "medium",
    microSteps: Array.isArray(task.microSteps) ? task.microSteps : [],
    notToday: task.snoozeUntil === "rest",
    created_at: task.createdAt,
  };
}

function thingTaskInsert(title: string, energy: DagstartEnergy | null): Omit<Task, "id"> {
  return {
    title,
    done: false,
    started: false,
    priority: null,
    source: "regular",
    postponedTo: null,
    focusStartedAt: null,
    focusExitedAt: null,
    focusAttempts: 0,
    reminders: [],
    repeat: "none",
    repeatWeekdays: "all",
    impact: "🌱",
    energyLevel: energy ?? "medium",
    microSteps: [],
    notToday: false,
  };
}

function readIdSet(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeIdSet(key: string, ids: Set<string>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function clearIdSet(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function readIdMap(userId: string): Map<string, string> {
  try {
    const raw = window.localStorage.getItem(migratedIdMapKey(userId));
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, string>;
    return new Map(Object.entries(parsed).map(([k, v]) => [k, String(v)]));
  } catch {
    return new Map();
  }
}

function writeIdMap(userId: string, map: Map<string, string>): void {
  try {
    window.localStorage.setItem(
      migratedIdMapKey(userId),
      JSON.stringify(Object.fromEntries(map))
    );
  } catch {
    /* ignore */
  }
}

/** Of er lokale V2-data is die de moeite waard is om te bewaren. */
export function hasV2LocalDataToMigrate(): boolean {
  if (typeof window === "undefined") return false;
  const journey = readJourney();
  if (journey.name.trim().length >= 2) return true;
  if (journey.energy) return true;
  if (journey.things.length > 0) return true;
  if (loadV2Tasks().length > 0) return true;
  if (loadV2Dump().length > 0) return true;
  return false;
}

async function persistClaimViaApi(
  energy: DagstartEnergy,
  displayName: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/profile/claim-anonymous-onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        energy,
        ...(displayName.length >= 2 ? { displayName } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function applyPreferredName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      await persistPreferredDisplayName(user, trimmed);
    }
  } catch {
    /* best-effort */
  }
}

/**
 * Upload V2 localStorage naar Supabase. Wis lokale keys alleen bij succes.
 * Cyclus (v2_settings periodestart/lengte) wordt niet gesynchroniseerd.
 */
export async function migrateV2LocalDataToSupabase(
  userId: string
): Promise<V2MigrateResult> {
  const empty: V2MigrateResult = { migrated: false, taskCount: 0, dumpCount: 0 };
  if (typeof window === "undefined" || !userId) return empty;

  try {
    if (window.localStorage.getItem(migratedKey(userId))) {
      return empty;
    }
  } catch {
    return empty;
  }

  if (!hasV2LocalDataToMigrate()) {
    try {
      window.localStorage.setItem(migratedKey(userId), "1");
    } catch {
      /* ignore */
    }
    return empty;
  }

  const journey = readJourney();
  const energy = mapEnergy(journey.energy) ?? "medium";
  const things = normalizeThings(journey.things);
  const localTasks = loadV2Tasks();
  const dumpItems = loadV2Dump();

  const migratedTaskIds = readIdSet(migratedTaskIdsKey(userId));
  const idMap = readIdMap(userId);
  let taskCount = 0;

  for (const local of localTasks) {
    if (!local.title.trim()) continue;
    if (migratedTaskIds.has(local.id) && idMap.has(local.id)) continue;
    try {
      const created = await addTaskToSupabase(userId, v2TaskToInsert(local));
      if (created?.id) {
        idMap.set(local.id, String(created.id));
        migratedTaskIds.add(local.id);
        taskCount += 1;
        writeIdSet(migratedTaskIdsKey(userId), migratedTaskIds);
        writeIdMap(userId, idMap);
      }
    } catch (err) {
      console.warn("[migrateV2] skip task", local.id, err);
    }
  }

  const top3Ids: string[] = [];
  for (const title of things) {
    const match = findV2TaskByTitle(localTasks, title);
    const supabaseId = match ? idMap.get(match.id) : undefined;
    if (supabaseId) {
      top3Ids.push(supabaseId);
      continue;
    }
    // Geen taak in v2_tasks (of nog niet geüpload): maak taak uit titel.
    try {
      const created = await addTaskToSupabase(
        userId,
        thingTaskInsert(title, energy)
      );
      if (created?.id) {
        top3Ids.push(String(created.id));
        taskCount += 1;
      }
    } catch (err) {
      console.warn("[migrateV2] skip thing task", title, err);
    }
  }

  const tasksOk =
    localTasks.length === 0 ||
    localTasks.every((t) => !t.title.trim() || migratedTaskIds.has(t.id));

  if (!tasksOk) {
    writeIdSet(migratedTaskIdsKey(userId), migratedTaskIds);
    return { migrated: false, taskCount, dumpCount: 0 };
  }

  try {
    await upsertCheckInToSupabase(userId, getCalendarDateAmsterdam(), {
      energy_level: energy,
      top3_task_ids: top3Ids.length > 0 ? top3Ids.slice(0, 3) : null,
    });
  } catch (err) {
    console.warn("[migrateV2] check-in skip", err);
  }

  const migratedDumpIds = readIdSet(migratedDumpIdsKey(userId));
  let dumpCount = 0;
  for (const item of dumpItems) {
    if (migratedDumpIds.has(item.id)) continue;
    try {
      await insertParkedThought(userId, item.content);
      migratedDumpIds.add(item.id);
      dumpCount += 1;
      writeIdSet(migratedDumpIdsKey(userId), migratedDumpIds);
    } catch (err) {
      console.warn("[migrateV2] skip dump", item.id, err);
    }
  }

  const dumpsOk =
    dumpItems.length === 0 ||
    dumpItems.every((d) => migratedDumpIds.has(d.id));

  if (!dumpsOk) {
    return { migrated: false, taskCount, dumpCount };
  }

  const preferredName =
    journey.name.trim() ||
    (() => {
      try {
        return (window.localStorage.getItem("structuro_user_name") ?? "").trim();
      } catch {
        return "";
      }
    })();

  await persistClaimViaApi(energy, preferredName);
  setDagstartCookieOnClient();
  await applyPreferredName(preferredName);

  try {
    window.localStorage.setItem(migratedKey(userId), "1");
  } catch {
    /* ignore */
  }
  clearIdSet(migratedTaskIdsKey(userId));
  clearIdSet(migratedDumpIdsKey(userId));
  clearIdSet(migratedIdMapKey(userId));
  clearV2AnonymousStorage();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("structuro_checkin_updated"));
  }

  return { migrated: true, taskCount, dumpCount };
}
