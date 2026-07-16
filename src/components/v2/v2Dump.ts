"use client";

import { v2AdaptiveDumpKey, v2DeprioritizeBySnooze } from "./v2Adaptive";
import { v2Id } from "./v2Tasks";

export type V2DumpDisposition = "rest" | "today" | null;

export type V2DumpItem = {
  id: string;
  content: string;
  createdAt: string;
  disposition?: V2DumpDisposition;
  /** Laatste triage-sessie (Rustig bekijken), ISO-datum. */
  lastTriagedAt?: string;
  /** Herkomst voor testimport, bijv. google-demo. */
  importSource?: "google-demo";
};

export const V2_DUMP_KEY = "v2_dump";
export const V2_DUMP_DRAFT_KEY = "v2_dump_draft";
export const V2_DUMP_MAX = 30;
export const V2_DUMP_SOFT_WARN = 25;

/** Oudere items krijgen een zachte "al een tijdje" hint (uren). */
export const V2_DUMP_AGE_HOURS = 24;

/** Items recent getriageerd worden overgeslagen in Rustig bekijken. */
export const V2_DUMP_TRIAGE_COOLDOWN_HOURS = 24;
export const V2_DUMP_TRIAGE_MAX = 3;

/** Lokaal: vanaf dit uur telt dump als avond (voor ochtendregel + analytics). */
export const V2_EVENING_HOUR = 18;

let counter = 0;

function dumpId(): string {
  counter += 1;
  return v2Id("dump");
}

function normalizeItem(raw: unknown): V2DumpItem | null {
  const item = (raw ?? {}) as Partial<V2DumpItem>;
  const content = typeof item.content === "string" ? item.content.trim() : "";
  if (content.length === 0) return null;
  const disposition =
    item.disposition === "rest" || item.disposition === "today"
      ? item.disposition
      : null;
  const lastTriagedAt =
    typeof item.lastTriagedAt === "string" ? item.lastTriagedAt : undefined;
  const importSource =
    item.importSource === "google-demo" ? "google-demo" : undefined;
  return {
    id: typeof item.id === "string" ? item.id : dumpId(),
    content,
    createdAt:
      typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    disposition,
    lastTriagedAt,
    importSource,
  };
}

export function loadV2Dump(): V2DumpItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(V2_DUMP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeItem)
      .filter((item): item is V2DumpItem => item !== null)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export function saveV2Dump(items: V2DumpItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(V2_DUMP_KEY, JSON.stringify(items));
  } catch {
    // Privémodus kan storage blokkeren.
  }
}

export function loadV2DumpDraft(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(V2_DUMP_DRAFT_KEY);
    return typeof raw === "string" ? raw : "";
  } catch {
    return "";
  }
}

export function saveV2DumpDraft(text: string): void {
  if (typeof window === "undefined") return;
  try {
    if (text.length === 0) {
      window.localStorage.removeItem(V2_DUMP_DRAFT_KEY);
    } else {
      window.localStorage.setItem(V2_DUMP_DRAFT_KEY, text);
    }
  } catch {
    // negeren
  }
}

export function clearV2DumpDraft(): void {
  saveV2DumpDraft("");
}

export function v2DumpCount(items?: V2DumpItem[]): number {
  const list = items ?? loadV2Dump();
  return list.filter((i) => i.disposition !== "today").length;
}

export function v2DumpActiveCount(items?: V2DumpItem[]): number {
  const list = items ?? loadV2Dump();
  return list.filter((i) => i.disposition !== "today" && i.disposition !== "rest").length;
}

export function addV2DumpItem(content: string, items: V2DumpItem[]): V2DumpItem[] {
  const trimmed = content.trim();
  if (trimmed.length === 0) return items;
  const next: V2DumpItem = {
    id: dumpId(),
    content: trimmed,
    createdAt: new Date().toISOString(),
    disposition: null,
  };
  return [...items, next];
}

export function updateV2DumpItem(
  id: string,
  patch: Partial<Pick<V2DumpItem, "content" | "disposition" | "lastTriagedAt">>,
  items: V2DumpItem[],
): V2DumpItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function removeV2DumpItem(id: string, items: V2DumpItem[]): V2DumpItem[] {
  return items.filter((item) => item.id !== id);
}

export function isV2EveningLocal(at: Date = new Date()): boolean {
  return at.getHours() >= V2_EVENING_HOUR;
}

function ymdLocal(at: Date): string {
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, "0");
  const d = String(at.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function yesterdayYmdLocal(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return ymdLocal(d);
}

export function isV2EveningDumpItem(item: V2DumpItem): boolean {
  const created = new Date(item.createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return isV2EveningLocal(created);
}

/** Dump gisteren na 18:00 (lokale tijd). */
export function isV2EveningDumpFromYesterday(
  item: V2DumpItem,
  now = new Date(),
): boolean {
  const created = new Date(item.createdAt);
  if (Number.isNaN(created.getTime())) return false;
  if (ymdLocal(created) !== yesterdayYmdLocal(now)) return false;
  return isV2EveningLocal(created);
}

export function isV2DumpAged(item: V2DumpItem, now = Date.now()): boolean {
  const created = new Date(item.createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created >= V2_DUMP_AGE_HOURS * 60 * 60 * 1000;
}

/** Zachte suggesties op basis van energie: oudste niet-rust items. */
export function v2DumpEnergySuggestions(
  items: V2DumpItem[],
  energy: "low" | "enough" | "high" | null,
  limit = 2,
): V2DumpItem[] {
  const candidates = items.filter((i) => i.disposition !== "rest" && i.disposition !== "today");
  if (candidates.length === 0) return [];
  if (energy === "low") {
    return v2DeprioritizeBySnooze(
      [...candidates].sort((a, b) => a.content.length - b.content.length),
      v2AdaptiveDumpKey,
    ).slice(0, limit);
  }
  return v2DeprioritizeBySnooze(candidates, v2AdaptiveDumpKey).slice(0, limit);
}

export function v2DumpSoftWarn(items: V2DumpItem[]): boolean {
  return items.length >= V2_DUMP_SOFT_WARN;
}

export function v2DumpAtMax(items: V2DumpItem[]): boolean {
  return items.length >= V2_DUMP_MAX;
}

/** Zichtbare dump-items (niet al naar vandaag). */
export function v2DumpHasVisible(items?: V2DumpItem[]): boolean {
  const list = items ?? loadV2Dump();
  return list.some((i) => i.disposition !== "today");
}

/** Oudste kandidaten voor Rustig bekijken (max 3, geen rust/vandaag, geen recente triage). */
export function v2DumpTriageCandidates(
  items: V2DumpItem[],
  now = Date.now(),
): V2DumpItem[] {
  const cooldownMs = V2_DUMP_TRIAGE_COOLDOWN_HOURS * 60 * 60 * 1000;
  const filtered = items
    .filter((i) => i.disposition !== "rest" && i.disposition !== "today")
    .filter((i) => {
      if (!i.lastTriagedAt) return true;
      const t = new Date(i.lastTriagedAt).getTime();
      return Number.isNaN(t) || now - t >= cooldownMs;
    });
  return v2DeprioritizeBySnooze(filtered, v2AdaptiveDumpKey).slice(0, V2_DUMP_TRIAGE_MAX);
}

export function markV2DumpTriaged(
  id: string,
  items: V2DumpItem[],
  at = new Date().toISOString(),
): V2DumpItem[] {
  return updateV2DumpItem(id, { lastTriagedAt: at }, items);
}

/** Demotaken toevoegen; slaat duplicaten op basis van exacte tekst over. */
export function importV2DumpItems(
  titles: string[],
  items: V2DumpItem[],
  importSource: V2DumpItem["importSource"] = "google-demo",
): { items: V2DumpItem[]; added: number; skipped: number } {
  const existing = new Set(items.map((i) => i.content.trim().toLowerCase()));
  let next = items;
  let added = 0;
  let skipped = 0;

  for (const raw of titles) {
    const title = raw.trim();
    if (title.length === 0) continue;
    const key = title.toLowerCase();
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }
    if (v2DumpAtMax(next)) break;
    next = addV2DumpItem(title, next).map((item, idx, arr) =>
      idx === arr.length - 1 ? { ...item, importSource } : item,
    );
    existing.add(key);
    added += 1;
  }

  return { items: next, added, skipped };
}
