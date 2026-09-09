"use client";

import { todayYmd, type V2Task } from "./v2Tasks";

export const V2_REMOVED_THINGS_KEY = "v2_removed_things";

type RemovedStore = {
  titles: string[];
};

export function v2ThingTitleKey(title: string): string {
  return title.trim().toLowerCase();
}

function readStore(_today?: string): RemovedStore {
  if (typeof window === "undefined") return { titles: [] };
  try {
    const raw = window.localStorage.getItem(V2_REMOVED_THINGS_KEY);
    if (!raw) return { titles: [] };
    const parsed = JSON.parse(raw) as Partial<RemovedStore>;
    const titles = Array.isArray(parsed.titles)
      ? parsed.titles.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      : [];
    return { titles: [...new Set(titles.map(v2ThingTitleKey))] };
  } catch {
    return { titles: [] };
  }
}

function writeStore(store: RemovedStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(V2_REMOVED_THINGS_KEY, JSON.stringify(store));
  } catch {
    /* privémodus */
  }
}

export function readRemovedV2ThingKeys(_today: string = todayYmd()): Set<string> {
  return new Set(readStore().titles);
}

export function isRemovedV2Thing(title: string, _today: string = todayYmd()): boolean {
  const key = v2ThingTitleKey(title);
  return key.length > 0 && readRemovedV2ThingKeys().has(key);
}

export function rememberRemovedV2Things(
  titles: string[],
  _today: string = todayYmd(),
): void {
  const store = readStore();
  const next = new Set(store.titles);
  for (const title of titles) {
    const key = v2ThingTitleKey(title);
    if (key) next.add(key);
  }
  writeStore({ titles: [...next] });
}

/** Opnieuw typen of in dagstart kiezen: zaaien mag weer. */
export function forgetRemovedV2Things(
  titles: string[],
  _today: string = todayYmd(),
): void {
  const store = readStore();
  const drop = new Set(
    titles.map(v2ThingTitleKey).filter((key) => key.length > 0),
  );
  writeStore({
    titles: store.titles.filter((key) => !drop.has(key)),
  });
}

export function omitRemovedOpenV2Tasks(
  tasks: V2Task[],
  today: string = todayYmd(),
): V2Task[] {
  const removed = readRemovedV2ThingKeys(today);
  if (removed.size === 0) return tasks;
  return tasks.filter((task) => {
    if (task.done) return true;
    const key = v2ThingTitleKey(task.title);
    return !key || !removed.has(key);
  });
}

/** Alle open rijen met deze titel, inclusief sync-dubbels. */
export function dropOpenTasksWithTitle(tasks: V2Task[], title: string): V2Task[] {
  const key = v2ThingTitleKey(title);
  if (!key) return tasks;
  return tasks.filter((task) => task.done || v2ThingTitleKey(task.title) !== key);
}

/** Verwijderen: onthoud de titel zodat journey/hydrate hem niet terugzet. */
export function dismissV2TaskTitle(title: string, today: string = todayYmd()): void {
  rememberRemovedV2Things([title], today);
}
