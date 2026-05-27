import {
  calendarDayDiff,
  formatOverdueDateForCopy,
  parseDueCalendarDayAmsterdam,
} from "@/lib/dagstart/deadlineToday";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

export type TaskDeadlineMeta = {
  label: string;
  overdue: boolean;
};

/** Relatieve deadline-label voor taken (nl/en), zonder oordeel-woorden bij overdue. */
export function getTaskDeadlineMeta(
  dueAt: string | null | undefined,
  locale: "nl" | "en" = "nl"
): TaskDeadlineMeta | null {
  const dueDay = parseDueCalendarDayAmsterdam(dueAt);
  if (!dueDay) return null;

  const today = getCalendarDateAmsterdam();
  const diff = calendarDayDiff(today, dueDay);

  if (diff < 0) {
    return {
      label: formatOverdueDateForCopy(dueAt, locale) || dueDay,
      overdue: true,
    };
  }
  if (diff === 0) {
    return { label: locale === "en" ? "today" : "vandaag", overdue: false };
  }
  if (diff === 1) {
    return { label: locale === "en" ? "tomorrow" : "morgen", overdue: false };
  }

  const [y, m, d] = dueDay.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL", {
    weekday: "long",
    timeZone: "UTC",
  });
  return { label: weekday, overdue: false };
}

/** Deadline-label voor dagstart swipe-kaarten (Amsterdam-tijdzone). */
export function getDagstartCardDeadline(
  dueAt: string | null | undefined,
  locale: "nl" | "en" = "nl",
  todayYmd: string = getCalendarDateAmsterdam()
): TaskDeadlineMeta | null {
  const dueDay = parseDueCalendarDayAmsterdam(dueAt);
  if (!dueDay) return null;

  const diff = calendarDayDiff(todayYmd, dueDay);
  if (diff < 0) {
    return { label: formatOverdueDateForCopy(dueAt, locale), overdue: true };
  }
  if (diff === 0) {
    return { label: locale === "en" ? "Today" : "Vandaag", overdue: false };
  }
  if (diff === 1) {
    return { label: locale === "en" ? "Tomorrow" : "Morgen", overdue: false };
  }

  const [y, m, d] = dueDay.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return {
    label: date.toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
    overdue: false,
  };
}

export function sortTasksByDeadline<T extends { dueAt?: string | null }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const da = parseDueCalendarDayAmsterdam(a.dueAt);
    const db = parseDueCalendarDayAmsterdam(b.dueAt);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    const dayDiff = calendarDayDiff(da, db);
    if (dayDiff !== 0) return dayDiff;
    return 0;
  });
}
