import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";
import type { DayEnergy } from "@/lib/dagstart/structuroPick";
import { structuroPickCount } from "@/lib/dagstart/structuroPick";

export type DeadlineEligibleTask = {
  id: string;
  title?: string | null;
  dueAt?: string | null;
  done?: boolean;
  notToday?: boolean;
  not_today?: boolean;
  source?: string | null;
  duration?: number | null;
  estimatedDuration?: number | null;
  repeat?: string | null;
  repeatUntil?: string | null;
  repeatWeekdays?: string | null;
  repeatExcludeDates?: string[] | null;
  created_at?: string | null;
};

export type DeadlineDagstartPlan<T extends DeadlineEligibleTask> = {
  autoFill: T[];
  overflow: T[];
};

/** Kalenderdag YYYY-MM-DD uit dueAt (Amsterdam), onafhankelijk van tijdzone-offset in ISO-string. */
export function parseDueCalendarDayAmsterdam(
  dueAt: string | null | undefined
): string | null {
  if (!dueAt) return null;
  const raw = String(dueAt).trim();
  if (!raw) return null;

  const prefix = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (prefix) return prefix[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return getCalendarDateAmsterdam(parsed);
}

export function calendarDayDiff(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split("-").map(Number);
  const [y2, m2, d2] = toYmd.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86_400_000);
}

/** Taak is voor een kalenderdag na vandaag — hoort niet in dagstart voor vandaag. */
export function isDueStrictlyAfterToday(
  dueAt: string | null | undefined,
  todayYmd: string = getCalendarDateAmsterdam()
): boolean {
  const dueDay = parseDueCalendarDayAmsterdam(dueAt);
  if (!dueDay) return false;
  return calendarDayDiff(todayYmd, dueDay) > 0;
}

/** Alias: deadline op of vóór vandaag (Amsterdam). */
export function isDueToday(
  dueAt: string | null | undefined,
  todayYmd: string = getCalendarDateAmsterdam()
): boolean {
  return isDueOnOrBeforeToday(dueAt, todayYmd);
}

export function isDueOnOrBeforeToday(
  dueAt: string | null | undefined,
  todayYmd: string = getCalendarDateAmsterdam()
): boolean {
  const dueDay = parseDueCalendarDayAmsterdam(dueAt);
  if (!dueDay) return false;
  return calendarDayDiff(todayYmd, dueDay) <= 0;
}

export function isTaskOverdue(
  dueAt: string | null | undefined,
  todayYmd: string = getCalendarDateAmsterdam()
): boolean {
  const dueDay = parseDueCalendarDayAmsterdam(dueAt);
  if (!dueDay) return false;
  return calendarDayDiff(todayYmd, dueDay) < 0;
}

export function calendarDayToDueAt(ymd: string | null | undefined): string | null {
  if (!ymd) return null;
  return `${ymd}T12:00:00.000Z`;
}

export function isDeadlineEligibleTask(task: DeadlineEligibleTask | null | undefined): boolean {
  if (!task?.id || !String(task.title ?? "").trim()) return false;
  if (task.done) return false;
  if (task.notToday || task.not_today) return false;
  if (task.source === "medication" || task.source === "event") return false;
  return Boolean(parseDueCalendarDayAmsterdam(task.dueAt));
}

export function compareDeadlineTasks<T extends DeadlineEligibleTask>(
  a: T,
  b: T,
  todayYmd: string = getCalendarDateAmsterdam()
): number {
  const dayA = parseDueCalendarDayAmsterdam(a.dueAt);
  const dayB = parseDueCalendarDayAmsterdam(b.dueAt);

  if (dayA && dayB) {
    const overdueA = isTaskOverdue(a.dueAt, todayYmd) ? 0 : 1;
    const overdueB = isTaskOverdue(b.dueAt, todayYmd) ? 0 : 1;
    if (overdueA !== overdueB) return overdueA - overdueB;

    const dayDiff = dayA.localeCompare(dayB);
    if (dayDiff !== 0) return dayDiff;
  } else if (dayA && !dayB) {
    return -1;
  } else if (!dayA && dayB) {
    return 1;
  }

  const durA = a.duration ?? a.estimatedDuration ?? 999;
  const durB = b.duration ?? b.estimatedDuration ?? 999;
  if (durA !== durB) return durA - durB;

  return String(a.title ?? "").localeCompare(String(b.title ?? ""), "nl");
}

export function sortDeadlineTasks<T extends DeadlineEligibleTask>(
  tasks: T[],
  todayYmd: string = getCalendarDateAmsterdam()
): T[] {
  return [...tasks].sort((a, b) => compareDeadlineTasks(a, b, todayYmd));
}

export function isDueExactlyToday(
  dueAt: string | null | undefined,
  todayYmd: string = getCalendarDateAmsterdam()
): boolean {
  const dueDay = parseDueCalendarDayAmsterdam(dueAt);
  if (!dueDay) return false;
  return dueDay === todayYmd;
}

/** Open taken met deadline vandaag of eerder, gesorteerd op urgentie. */
export function getDeadlineTasksDueToday<T extends DeadlineEligibleTask>(
  tasks: T[],
  todayYmd: string = getCalendarDateAmsterdam()
): T[] {
  return sortDeadlineTasks(
    tasks.filter(
      (t) =>
        isDeadlineEligibleTask(t) &&
        isDueOnOrBeforeToday(t.dueAt, todayYmd)
    ),
    todayYmd
  );
}

/**
 * Deadlines voor dagstart-autofill: alleen taken die vandaag vervallen.
 * Achterstallige backlog (april, etc.) hoort niet de dagstart te blokkeren.
 */
export function getDeadlineTasksForDagstartFill<T extends DeadlineEligibleTask>(
  tasks: T[],
  todayYmd: string = getCalendarDateAmsterdam()
): T[] {
  return sortDeadlineTasks(
    tasks.filter(
      (t) =>
        isDeadlineEligibleTask(t) &&
        isDueExactlyToday(t.dueAt, todayYmd)
    ),
    todayYmd
  );
}

export function buildDeadlineDagstartPlan<T extends DeadlineEligibleTask>(
  tasks: T[],
  maxSlots: number,
  todayYmd: string = getCalendarDateAmsterdam()
): DeadlineDagstartPlan<T> {
  const safeMax = Math.max(0, Math.floor(maxSlots));
  const due = getDeadlineTasksForDagstartFill(tasks, todayYmd);
  return {
    autoFill: due.slice(0, safeMax),
    overflow: due.slice(safeMax),
  };
}

export function maxSlotsForDayEnergy(energy: DayEnergy): number {
  return structuroPickCount(energy);
}

/** Relatieve copy-key voor overflow-modal (fase 3). */
export function getDeadlineOverflowVariant(
  dueAt: string | null | undefined,
  todayYmd: string = getCalendarDateAmsterdam()
): "today" | "overdue" {
  return isTaskOverdue(dueAt, todayYmd) ? "overdue" : "today";
}

/** Menselijke datum voor overdue-copy, bijv. "maandag 12 mei". */
export function formatOverdueDateForCopy(
  dueAt: string | null | undefined,
  locale: "nl" | "en" = "nl"
): string {
  const ymd = parseDueCalendarDayAmsterdam(dueAt);
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
