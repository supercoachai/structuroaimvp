import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

export type TaskRepeatMode = "none" | "daily" | "weekly";
export type TaskRepeatWeekdays = "all" | "weekdays" | "weekends";

export type RecurrenceTaskFields = {
  repeat?: string | null;
  repeatUntil?: string | null;
  repeatWeekdays?: TaskRepeatWeekdays | string | null;
  repeatExcludeDates?: string[] | null;
  created_at?: string | null;
};

export function getTaskRepeatMode(repeat?: string | null): TaskRepeatMode {
  if (repeat === "daily" || repeat === "weekly") return repeat;
  return "none";
}

export function isRecurringTask(task: RecurrenceTaskFields): boolean {
  return getTaskRepeatMode(task.repeat) !== "none";
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

export function isRecurringCompletedToday(
  task: RecurrenceTaskFields,
  todayYmd: string = getCalendarDateAmsterdam()
): boolean {
  return (task.repeatExcludeDates ?? []).includes(todayYmd);
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
): { repeatExcludeDates: string[]; done: false; started: true; completedAt: string } {
  const excludes = [...(task.repeatExcludeDates ?? [])];
  if (!excludes.includes(todayYmd)) excludes.push(todayYmd);
  return {
    repeatExcludeDates: excludes,
    done: false,
    started: true,
    completedAt: new Date().toISOString(),
  };
}

export function repeatLabelKey(
  task: RecurrenceTaskFields
): "repeatDaily" | "repeatWeekly" | "repeatWeekdays" | "repeatWeekends" | null {
  const mode = getTaskRepeatMode(task.repeat);
  if (mode === "none") return null;
  if (mode === "weekly") return "repeatWeekly";
  if (task.repeatWeekdays === "weekdays") return "repeatWeekdays";
  if (task.repeatWeekdays === "weekends") return "repeatWeekends";
  return "repeatDaily";
}
