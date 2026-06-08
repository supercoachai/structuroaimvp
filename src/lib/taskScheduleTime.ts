import { getCalendarDateAmsterdam, getTomorrowCalendarDateAmsterdam } from "@/lib/dagstartCookie";

const WEEKDAY_NAMES_NL = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
];

/** Leesbare NL-datum: "woensdag 6 juni" of met tijd "woensdag 6 juni om 10:00". */
export function formatHumanDateNl(
  ymd: string,
  time?: { hour: number; minute: number } | null
): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = WEEKDAY_NAMES_NL[date.getUTCDay()];
  const month = date.toLocaleDateString("nl-NL", {
    month: "long",
    timeZone: "UTC",
  });
  let label = `${weekday} ${d} ${month}`;
  if (time) {
    label += ` om ${formatScheduleTime(time.hour, time.minute)}`;
  }
  return label;
}

/** Tijd uit ISO (due_at / created_at), null bij default noon-anchor. */
export function extractScheduleTimeFromIso(
  iso: string | null | undefined
): { hour: number; minute: number } | null {
  if (!iso) return null;
  const match = String(iso).match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour === 12 && minute === 0) return null;
  return { hour, minute };
}

export function formatScheduleTime(hour: number, minute: number): string {
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

export function buildCreatedAtWithScheduleTime(
  anchorYmd: string,
  hour: number,
  minute: number
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${anchorYmd}T${pad(hour)}:${pad(minute)}:00.000Z`;
}

export function mergeDateAndTime(
  ymd: string,
  hour: number,
  minute: number
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ymd}T${pad(hour)}:${pad(minute)}:00.000+02:00`;
}

/** Datum voor planningstijd: weekly-anchor, anders due-dag of vandaag. */
export function resolveScheduleAnchorYmd(input: {
  scheduleDateYmd?: string | null;
  repeat?: string;
  weeklyAnchorYmd?: string | null;
  dueAt?: string | null;
  created_at?: string | null;
}): string {
  if (input.scheduleDateYmd) return input.scheduleDateYmd;
  if (input.repeat === "weekly" && input.weeklyAnchorYmd) {
    return input.weeklyAnchorYmd;
  }
  if (input.repeat === "weekly" && input.created_at) {
    const fromCreated = input.created_at.match(/^(\d{4}-\d{2}-\d{2})/);
    if (fromCreated) return fromCreated[1];
  }
  const fromDue = input.dueAt?.match(/^(\d{4}-\d{2}-\d{2})/);
  if (fromDue) return fromDue[1];
  if (input.created_at) {
    const fromCreated = input.created_at.match(/^(\d{4}-\d{2}-\d{2})/);
    if (fromCreated) return fromCreated[1];
  }
  return getCalendarDateAmsterdam();
}

export function formatHumanScheduleDate(
  ymd: string,
  locale: "nl" | "en" = "nl",
  time?: { hour: number; minute: number } | null
): string {
  if (locale === "nl") return formatHumanDateNl(ymd, time);
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  const month = date.toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
  let label = `${weekday} ${month} ${d}`;
  if (time) {
    label += ` at ${formatScheduleTime(time.hour, time.minute)}`;
  }
  return label;
}

/** Compacte planning: "vandaag om 10:00" of volledige datum. */
export function formatScheduleDateTimeLabel(
  ymd: string,
  time: { hour: number; minute: number },
  locale: string
): string {
  const today = getCalendarDateAmsterdam();
  const tomorrow = getTomorrowCalendarDateAmsterdam();
  const timeStr = formatScheduleTime(time.hour, time.minute);
  const isEn = locale === "en" || locale.startsWith("en");

  if (ymd === today) {
    return isEn ? `today at ${timeStr}` : `vandaag om ${timeStr}`;
  }
  if (ymd === tomorrow) {
    return isEn ? `tomorrow at ${timeStr}` : `morgen om ${timeStr}`;
  }
  const datePart = formatHumanScheduleDate(ymd, isEn ? "en" : "nl");
  return isEn ? `${datePart} at ${timeStr}` : `${datePart} om ${timeStr}`;
}

export function getTaskScheduleDisplayLabel(
  task: {
    dueAt?: string | null;
    created_at?: string | null;
    isDeadline?: boolean | null;
    repeat?: string | null;
  },
  locale: string
): string | null {
  const legacyOneOffDeadline =
    task.isDeadline == null &&
    Boolean(task.dueAt) &&
    (!task.repeat || task.repeat === "none");
  const showsDeadline = Boolean(task.isDeadline) || legacyOneOffDeadline;
  if (showsDeadline) return null;

  const time =
    extractScheduleTimeFromIso(task.dueAt) ??
    extractScheduleTimeFromIso(task.created_at);
  if (!time) return null;

  const weeklyAnchor =
    task.repeat === "weekly" && task.created_at
      ? task.created_at.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null
      : null;

  const ymd = resolveScheduleAnchorYmd({
    weeklyAnchorYmd: weeklyAnchor,
    dueAt: task.dueAt,
    created_at: task.created_at,
  });

  return formatScheduleDateTimeLabel(ymd, time, locale);
}
