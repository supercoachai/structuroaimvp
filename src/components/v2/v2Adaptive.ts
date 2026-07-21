"use client";

import { patchV2Settings, readV2Settings } from "./v2Settings";
import { todayYmd } from "./v2Tasks";
import type { V2Energy } from "./V2Context";

export const V2_ADAPTIVE_KEY = "v2_adaptive";
const SNOOZE_DEPRIORITIZE_AT = 3;
const FRISSE_START_BASE_DAYS = 3;
const FRISSE_START_EXTENDED_DAYS = 5;
const FRISSE_START_WEEKLY_CAP = 2;

export type V2AdaptiveData = {
  /** task:{id} of dump:{id} → aantal keer gesnoozed/rust. */
  snoozeCounts: Record<string, number>;
  /** YMD-dagen waarop frisse start geaccepteerd werd. */
  frisseStartAcceptedYmds: string[];
  /** Energie per kalenderdag (YMD). */
  energyByYmd: Record<string, V2Energy>;
};

const defaults: V2AdaptiveData = {
  snoozeCounts: {},
  frisseStartAcceptedYmds: [],
  energyByYmd: {},
};

function hydrate(raw: string | null): V2AdaptiveData {
  if (!raw) return { ...defaults };
  try {
    const parsed = JSON.parse(raw) as Partial<V2AdaptiveData>;
    return {
      snoozeCounts:
        parsed.snoozeCounts && typeof parsed.snoozeCounts === "object"
          ? parsed.snoozeCounts
          : {},
      frisseStartAcceptedYmds: Array.isArray(parsed.frisseStartAcceptedYmds)
        ? parsed.frisseStartAcceptedYmds.filter((d): d is string => typeof d === "string")
        : [],
      energyByYmd:
        parsed.energyByYmd && typeof parsed.energyByYmd === "object"
          ? (parsed.energyByYmd as Record<string, V2Energy>)
          : {},
    };
  } catch {
    return { ...defaults };
  }
}

export function readV2Adaptive(): V2AdaptiveData {
  if (typeof window === "undefined") return { ...defaults };
  try {
    return hydrate(window.localStorage.getItem(V2_ADAPTIVE_KEY));
  } catch {
    return { ...defaults };
  }
}

export function writeV2Adaptive(next: V2AdaptiveData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(V2_ADAPTIVE_KEY, JSON.stringify(next));
  } catch {
    // negeren
  }
}

export function patchV2Adaptive(patch: Partial<V2AdaptiveData>): V2AdaptiveData {
  const next = { ...readV2Adaptive(), ...patch };
  writeV2Adaptive(next);
  return next;
}

export function v2AdaptiveTaskKey(id: string): string {
  return `task:${id}`;
}

export function v2AdaptiveDumpKey(id: string): string {
  return `dump:${id}`;
}

export function recordV2Snooze(itemKey: string): void {
  const data = readV2Adaptive();
  const count = (data.snoozeCounts[itemKey] ?? 0) + 1;
  patchV2Adaptive({ snoozeCounts: { ...data.snoozeCounts, [itemKey]: count } });
}

export function v2SnoozeCount(itemKey: string): number {
  return readV2Adaptive().snoozeCounts[itemKey] ?? 0;
}

export function isV2Deprioritized(itemKey: string): boolean {
  return v2SnoozeCount(itemKey) >= SNOOZE_DEPRIORITIZE_AT;
}

/** Sorteer: minder gesnoozed eerst; geen zichtbare "AI sorted" messaging. */
export function v2DeprioritizeBySnooze<T extends { id: string }>(
  items: T[],
  keyFn: (id: string) => string,
): T[] {
  return [...items].sort((a, b) => {
    const ca = v2SnoozeCount(keyFn(a.id));
    const cb = v2SnoozeCount(keyFn(b.id));
    const da = ca >= SNOOZE_DEPRIORITIZE_AT ? 1 : 0;
    const db = cb >= SNOOZE_DEPRIORITIZE_AT ? 1 : 0;
    if (da !== db) return da - db;
    return ca - cb;
  });
}

export function recordV2EnergyForToday(energy: V2Energy, ymd = todayYmd()): void {
  const data = readV2Adaptive();
  patchV2Adaptive({ energyByYmd: { ...data.energyByYmd, [ymd]: energy } });
}

function ymdDaysAgo(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type V2EnergyShortcut = {
  energy: V2Energy;
  label: string;
};

const ENERGY_LABELS: Record<V2Energy, string> = {
  low: "Laag",
  enough: "Genoeg",
  high: "Hoog",
};

/**
 * Shortcut "Zelfde als gisteren": toon zodra gisteren een energie bekend is.
 * (Eerder: pas bij 3+ dagen patroon. Label beloofde wel "gisteren".)
 */
export function getV2EnergyShortcut(now = new Date()): V2EnergyShortcut | null {
  const { energyByYmd } = readV2Adaptive();
  const yesterday = ymdDaysAgo(1, now);
  const yesterdayEnergy = energyByYmd[yesterday];
  if (!yesterdayEnergy) return null;
  return { energy: yesterdayEnergy, label: ENERGY_LABELS[yesterdayEnergy] };
}

export function recordV2FrisseStartAccepted(ymd = todayYmd()): void {
  const data = readV2Adaptive();
  const ymds = data.frisseStartAcceptedYmds.includes(ymd)
    ? data.frisseStartAcceptedYmds
    : [...data.frisseStartAcceptedYmds, ymd];
  patchV2Adaptive({ frisseStartAcceptedYmds: ymds.slice(-30) });
}

function frisseStartsInLastWeek(now = Date.now()): number {
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return readV2Adaptive().frisseStartAcceptedYmds.filter((ymd) => {
    const [y, m, d] = ymd.split("-").map(Number);
    const t = new Date(y, m - 1, d).getTime();
    return !Number.isNaN(t) && t >= weekAgo;
  }).length;
}

/** Na 2x frisse start in een week: langere pauze voor overlay. */
export function v2FrisseStartMinDays(): number {
  if (frisseStartsInLastWeek() >= FRISSE_START_WEEKLY_CAP) {
    return FRISSE_START_EXTENDED_DAYS;
  }
  return FRISSE_START_BASE_DAYS;
}

export type V2ReturnVariant = "notification" | "widget_hint";

export function assignV2ReturnVariant(): V2ReturnVariant {
  const settings = readV2Settings();
  if (settings.returnVariant === "notification" || settings.returnVariant === "widget_hint") {
    return settings.returnVariant;
  }
  const variant: V2ReturnVariant = Math.random() < 0.5 ? "notification" : "widget_hint";
  patchV2Settings({ returnVariant: variant });
  return variant;
}
