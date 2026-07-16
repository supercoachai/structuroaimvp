"use client";

/**
 * Lokaal taakmodel voor /v2/todo. Zelfstandig (localStorage, key v2_tasks),
 * geen echte backend. Neemt de v1-taakmechanismen over: deadline, herhaling
 * (dagelijks/werkdagen/wekelijks/elke N dagen), prioriteit, energie-label en
 * microstappen (subtaken). Bewust GEEN minuten-schatting (tijdblindheid).
 */

export type V2Repeat = "none" | "daily" | "weekdays" | "weekly" | "interval";
export type V2Priority = 1 | 2 | 3 | null;
export type V2TaskEnergy = "low" | "medium" | "high" | null;
export type V2DurationBucket = "short" | "medium" | "long" | null;

/** Speciale waarde: taak verborgen tot handmatig wakker. */
export const V2_SNOOZE_REST = "rest" as const;
export type V2SnoozeUntil = string | typeof V2_SNOOZE_REST | null;

export type V2MicroStep = { id: string; title: string; done: boolean };

export type V2Task = {
  id: string;
  title: string;
  done: boolean;
  /** Kalenderdag (YMD) van de deadline, of null. */
  dueDate: string | null;
  repeat: V2Repeat;
  /** Aantal dagen tussen herhalingen bij repeat "interval". */
  repeatIntervalDays: number | null;
  priority: V2Priority;
  energy: V2TaskEnergy;
  microSteps: V2MicroStep[];
  /** Optioneel: waarom deze taak ertoe doet. */
  why: string | null;
  /** Optioneel: wat afronden oplevert. */
  outcome: string | null;
  /** Verborgen tot dit tijdstip, of 'rest' voor laat rusten. */
  snoozeUntil: V2SnoozeUntil;
  /** Optionele duur-bak voor focus-suggesties (geen minuten). */
  durationBucket: V2DurationBucket;
  createdAt: string;
};

export const V2_TASKS_KEY = "v2_tasks";

let counter = 0;
export function v2Id(prefix = "v2t"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function loadV2Tasks(): V2Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(V2_TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTask);
  } catch {
    return [];
  }
}

export function saveV2Tasks(tasks: V2Task[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(V2_TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // Privémodus kan storage blokkeren. Geen blokkade voor de flow.
  }
}

function normalizeTask(raw: unknown): V2Task {
  const t = (raw ?? {}) as Partial<V2Task>;
  return {
    id: typeof t.id === "string" ? t.id : v2Id(),
    title: typeof t.title === "string" ? t.title : "",
    done: t.done === true,
    dueDate: typeof t.dueDate === "string" ? t.dueDate : null,
    repeat: isRepeat(t.repeat) ? t.repeat : "none",
    repeatIntervalDays:
      typeof t.repeatIntervalDays === "number" ? t.repeatIntervalDays : null,
    priority:
      t.priority === 1 || t.priority === 2 || t.priority === 3 ? t.priority : null,
    energy:
      t.energy === "low" || t.energy === "medium" || t.energy === "high"
        ? t.energy
        : null,
    microSteps: Array.isArray(t.microSteps)
      ? t.microSteps
          .filter((s): s is V2MicroStep => Boolean(s) && typeof s.title === "string")
          .map((s) => ({
            id: typeof s.id === "string" ? s.id : v2Id("ms"),
            title: s.title,
            done: s.done === true,
          }))
      : [],
    why: typeof t.why === "string" && t.why.trim().length > 0 ? t.why.trim() : null,
    outcome:
      typeof t.outcome === "string" && t.outcome.trim().length > 0 ? t.outcome.trim() : null,
    snoozeUntil: normalizeSnoozeUntil(t.snoozeUntil),
    durationBucket:
      t.durationBucket === "short" || t.durationBucket === "medium" || t.durationBucket === "long"
        ? t.durationBucket
        : null,
    createdAt: typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString(),
  };
}

function normalizeSnoozeUntil(v: unknown): V2SnoozeUntil {
  if (v === V2_SNOOZE_REST) return V2_SNOOZE_REST;
  if (typeof v === "string" && v.length > 0) return v;
  return null;
}

function isRepeat(v: unknown): v is V2Repeat {
  return (
    v === "none" ||
    v === "daily" ||
    v === "weekdays" ||
    v === "weekly" ||
    v === "interval"
  );
}

export function emptyDraft(): V2Task {
  return {
    id: v2Id(),
    title: "",
    done: false,
    dueDate: null,
    repeat: "none",
    repeatIntervalDays: 14,
    priority: null,
    energy: null,
    microSteps: [],
    why: null,
    outcome: null,
    snoozeUntil: null,
    durationBucket: null,
    createdAt: new Date().toISOString(),
  };
}

/* Datum-helpers (lokale kalender) */

export function todayYmd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ymdOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return todayYmd(d);
}

const WEEKDAYS_NL = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MONTHS_NL = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

/** Menselijke deadline-tekst: Vandaag / Morgen / Gisteren / "wo 9 jul". */
export function formatDeadline(ymd: string | null): string | null {
  if (!ymd) return null;
  const today = todayYmd();
  if (ymd === today) return "Vandaag";
  if (ymd === ymdOffset(1)) return "Morgen";
  if (ymd === ymdOffset(-1)) return "Gisteren";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS_NL[date.getDay()]} ${d} ${MONTHS_NL[m - 1]}`;
}

export function isOverdue(task: V2Task): boolean {
  if (!task.dueDate || task.done) return false;
  return task.dueDate < todayYmd();
}

/** Herhaling-label voor de lijst, of null bij "geen". */
export function formatRepeat(task: V2Task): string | null {
  switch (task.repeat) {
    case "daily":
      return "Elke dag";
    case "weekdays":
      return "Werkdagen";
    case "weekly":
      return "Wekelijks";
    case "interval": {
      const n = task.repeatIntervalDays ?? 14;
      return `Elke ${n} dagen`;
    }
    default:
      return null;
  }
}

export const V2_REPEAT_OPTIONS: { value: V2Repeat; label: string }[] = [
  { value: "none", label: "Geen" },
  { value: "daily", label: "Dagelijks" },
  { value: "weekdays", label: "Werkdagen" },
  { value: "weekly", label: "Wekelijks" },
  { value: "interval", label: "Elke N dagen" },
];

export const V2_PRIORITY_OPTIONS: { value: V2Priority; label: string }[] = [
  { value: null, label: "Geen" },
  { value: 1, label: "Laag" },
  { value: 2, label: "Middel" },
  { value: 3, label: "Hoog" },
];

export const V2_ENERGY_TASK_OPTIONS: { value: V2TaskEnergy; label: string }[] = [
  { value: null, label: "Geen" },
  { value: "low", label: "Laag" },
  { value: "medium", label: "Normaal" },
  { value: "high", label: "Hoog" },
];

export const V2_DURATION_BUCKET_OPTIONS: { value: V2DurationBucket; label: string }[] = [
  { value: null, label: "Geen" },
  { value: "short", label: "Kort" },
  { value: "medium", label: "Middel" },
  { value: "long", label: "Lang" },
];

/** Of een taak nu zichtbaar is (niet gesnoozed). */
export function isV2TaskVisible(task: V2Task, now = Date.now()): boolean {
  if (task.done) return true;
  if (!task.snoozeUntil) return true;
  if (task.snoozeUntil === V2_SNOOZE_REST) return false;
  const until = new Date(task.snoozeUntil).getTime();
  if (Number.isNaN(until)) return true;
  return now >= until;
}

/** ISO-timestamp voor snooze-opties. */
export function v2SnoozeUntilEvening(now = new Date()): string {
  const d = new Date(now);
  d.setHours(18, 0, 0, 0);
  if (d.getTime() <= now.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString();
}

export function v2SnoozeUntilTomorrowMorning(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

export function priorityLabel(p: V2Priority): string | null {
  if (p === 1) return "Prioriteit: laag";
  if (p === 2) return "Prioriteit: middel";
  if (p === 3) return "Prioriteit: hoog";
  return null;
}

export function energyLabel(e: V2TaskEnergy): string | null {
  if (e === "low") return "Energie: laag";
  if (e === "medium") return "Energie: normaal";
  if (e === "high") return "Energie: hoog";
  return null;
}
