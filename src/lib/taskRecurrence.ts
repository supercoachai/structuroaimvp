import { calendarDayDiff } from "@/lib/dagstart/deadlineToday";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

export type TaskRepeatMode = "none" | "daily" | "weekly" | "interval";
export type TaskRepeatWeekdays = "all" | "weekdays" | "weekends";
export type RepeatAnchor = "planned" | "completion";

export const DEFAULT_INTERVAL_DAYS = 14;
export const MIN_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 365;

export function clampIntervalDays(days?: number | null): number {
  const n = Math.round(Number(days ?? DEFAULT_INTERVAL_DAYS));
  if (!Number.isFinite(n)) return DEFAULT_INTERVAL_DAYS;
  return Math.max(MIN_INTERVAL_DAYS, Math.min(MAX_INTERVAL_DAYS, n));
}

export type RecurrenceTaskFields = {
  repeat?: string | null;
  repeatUntil?: string | null;
  repeatWeekdays?: TaskRepeatWeekdays | string | null;
  repeatExcludeDates?: string[] | null;
  repeatAnchor?: RepeatAnchor | string | null;
  repeatIntervalDays?: number | null;
  repeatNextDueAt?: string | null;
  dueAt?: string | null;
  created_at?: string | null;
};

export function getTaskRepeatMode(repeat?: string | null): TaskRepeatMode {
  if (
    repeat === "daily" ||
    repeat === "weekly" ||
    repeat === "interval"
  ) {
    return repeat;
  }
  return "none";
}

export function isRecurringTask(task: RecurrenceTaskFields): boolean {
  return getTaskRepeatMode(task.repeat) !== "none";
}

export function getRepeatAnchor(task: RecurrenceTaskFields): RepeatAnchor {
  if (task.repeatAnchor === "completion") return "completion";
  if (getTaskRepeatMode(task.repeat) === "interval") return "completion";
  return "planned";
}

/** 0 = zo, 1 = ma, … 6 = za (Amsterdam). */
export function weekdayIndexAmsterdam(ymd: string): number {
  const parsed = new Date(`${ymd}T12:00:00.000Z`);
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
  }).format(parsed);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[short] ?? 0;
}

export function ymdFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = String(iso).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return getCalendarDateAmsterdam(parsed);
}

export function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function resolveRepeatNextDueAt(task: RecurrenceTaskFields): string | null {
  const stored = ymdFromIso(task.repeatNextDueAt);
  if (stored) return stored;
  return ymdFromIso(task.dueAt) ?? ymdFromIso(task.created_at);
}

export function resolveInitialIntervalNextDueAt(
  scheduleYmd: string | null | undefined,
  todayYmd: string = getCalendarDateAmsterdam()
): string {
  const ymd = scheduleYmd && /^\d{4}-\d{2}-\d{2}$/.test(scheduleYmd) ? scheduleYmd : todayYmd;
  return ymd;
}

export function isRecurringCompletedToday(
  task: RecurrenceTaskFields,
  todayYmd: string = getCalendarDateAmsterdam()
): boolean {
  return (task.repeatExcludeDates ?? []).includes(todayYmd);
}

export function isIntervalRecurringVisible(
  task: RecurrenceTaskFields,
  todayYmd: string = getCalendarDateAmsterdam()
): boolean {
  if (getTaskRepeatMode(task.repeat) !== "interval") return true;
  const nextDue = resolveRepeatNextDueAt(task);
  if (!nextDue) return true;
  return todayYmd >= nextDue;
}

export function isRecurringVisibleInBacklog(
  task: RecurrenceTaskFields,
  todayYmd: string = getCalendarDateAmsterdam()
): boolean {
  if (!isRecurringTask(task)) return true;
  if (isRecurringCompletedToday(task, todayYmd)) return false;
  return isIntervalRecurringVisible(task, todayYmd);
}

export function isRecurringDueToday(
  task: RecurrenceTaskFields,
  todayYmd: string = getCalendarDateAmsterdam()
): boolean {
  const mode = getTaskRepeatMode(task.repeat);
  if (mode === "none") return false;
  if (isRecurringCompletedToday(task, todayYmd)) return false;

  if (task.repeatUntil) {
    const until = String(task.repeatUntil).slice(0, 10);
    if (todayYmd > until) return false;
  }

  if (mode === "interval") {
    const nextDue = resolveRepeatNextDueAt(task);
    if (!nextDue) return true;
    return todayYmd >= nextDue;
  }

  const weekday = weekdayIndexAmsterdam(todayYmd);
  const repeatWeekdays = (task.repeatWeekdays as TaskRepeatWeekdays) ?? "all";
  if (repeatWeekdays === "weekdays" && (weekday === 0 || weekday === 6)) {
    return false;
  }
  if (repeatWeekdays === "weekends" && weekday >= 1 && weekday <= 5) {
    return false;
  }

  if (mode === "daily") return true;

  const anchorYmd = ymdFromIso(task.created_at) ?? todayYmd;
  return weekdayIndexAmsterdam(anchorYmd) === weekday;
}

export function buildRecurringCompletionUpdate(
  task: RecurrenceTaskFields,
  todayYmd: string = getCalendarDateAmsterdam()
): {
  repeatExcludeDates: string[];
  done: false;
  started: true;
  completedAt: string;
  repeatNextDueAt?: string;
} {
  const excludes = [...(task.repeatExcludeDates ?? [])];
  if (!excludes.includes(todayYmd)) excludes.push(todayYmd);

  const base = {
    repeatExcludeDates: excludes,
    done: false as const,
    started: true as const,
    completedAt: new Date().toISOString(),
  };

  if (getTaskRepeatMode(task.repeat) === "interval") {
    const days = clampIntervalDays(task.repeatIntervalDays);
    return {
      ...base,
      repeatNextDueAt: addDaysToYmd(todayYmd, days),
    };
  }

  return base;
}

export function repeatLabelKey(
  task: RecurrenceTaskFields
):
  | "repeatDaily"
  | "repeatWeekly"
  | "repeatWeekdays"
  | "repeatWeekends"
  | "repeatInterval"
  | null {
  const mode = getTaskRepeatMode(task.repeat);
  if (mode === "none") return null;
  if (mode === "interval") return "repeatInterval";
  if (mode === "weekly") return "repeatWeekly";
  if (task.repeatWeekdays === "weekdays") return "repeatWeekdays";
  if (task.repeatWeekdays === "weekends") return "repeatWeekends";
  return "repeatDaily";
}

export function formatRepeatLabel(
  task: RecurrenceTaskFields,
  t: (key: string, params?: Record<string, string>) => string,
  prefix: "taskEditor" | "newTask" = "taskEditor"
): string | null {
  const key = repeatLabelKey(task);
  if (!key) return null;
  if (key === "repeatInterval") {
    return t(`${prefix}.repeatIntervalLabel`, {
      n: String(clampIntervalDays(task.repeatIntervalDays)),
    });
  }
  return t(`${prefix}.${key}`);
}

export function buildRepeatFieldsFromSelection(selection: {
  repeat: TaskRepeatMode;
  repeatWeekdays: TaskRepeatWeekdays;
  repeatAnchor?: RepeatAnchor;
  repeatIntervalDays?: number | null;
  repeatNextDueAt?: string | null;
}): Pick<
  RecurrenceTaskFields,
  "repeat" | "repeatWeekdays" | "repeatAnchor" | "repeatIntervalDays" | "repeatNextDueAt"
> {
  if (selection.repeat === "interval") {
    return {
      repeat: "interval",
      repeatWeekdays: "all",
      repeatAnchor: "completion",
      repeatIntervalDays: clampIntervalDays(selection.repeatIntervalDays),
      repeatNextDueAt: selection.repeatNextDueAt ?? null,
    };
  }

  if (selection.repeat === "weekly") {
    return {
      repeat: "weekly",
      repeatWeekdays: selection.repeatWeekdays,
      repeatAnchor: "planned",
      repeatIntervalDays: null,
      repeatNextDueAt: null,
    };
  }

  if (selection.repeat === "daily") {
    return {
      repeat: "daily",
      repeatWeekdays: selection.repeatWeekdays,
      repeatAnchor: "planned",
      repeatIntervalDays: null,
      repeatNextDueAt: null,
    };
  }

  return {
    repeat: "none",
    repeatWeekdays: "all",
    repeatAnchor: "planned",
    repeatIntervalDays: null,
    repeatNextDueAt: null,
  };
}
