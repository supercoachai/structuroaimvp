import { calendarDayToDueAt } from "@/lib/dagstart/deadlineToday";
import {
  getCalendarDateAmsterdam,
  getTomorrowCalendarDateAmsterdam,
} from "@/lib/dagstartCookie";
import { microStepId, type MicroStep } from "@/lib/microSteps";
import type { Task } from "@/context/TaskContext";
import type { NewTaskFlowPayload, NewTaskRepeatChoice } from "./newTaskFlowTypes";
import {
  clampIntervalDays,
  resolveInitialIntervalNextDueAt,
  type TaskRepeatWeekdays,
} from "@/lib/taskRecurrence";
import { buildCreatedAtWithScheduleTime } from "@/lib/taskScheduleTime";

function resolveRepeatFields(
  repeat?: NewTaskRepeatChoice,
  repeatIntervalDays?: number
): {
  repeat: string;
  repeatWeekdays: TaskRepeatWeekdays;
  repeatAnchor?: "planned" | "completion";
  repeatIntervalDays?: number | null;
} {
  if (repeat === "daily") {
    return { repeat: "daily", repeatWeekdays: "all", repeatAnchor: "planned" };
  }
  if (repeat === "weekdays") {
    return { repeat: "daily", repeatWeekdays: "weekdays", repeatAnchor: "planned" };
  }
  if (repeat === "weekly") {
    return { repeat: "weekly", repeatWeekdays: "all", repeatAnchor: "planned" };
  }
  if (repeat === "interval") {
    return {
      repeat: "interval",
      repeatWeekdays: "all",
      repeatAnchor: "completion",
      repeatIntervalDays: clampIntervalDays(repeatIntervalDays),
    };
  }
  return { repeat: "none", repeatWeekdays: "all", repeatAnchor: "planned" };
}

export function resolveScheduleYmdFromPick(
  pick: "today" | "tomorrow" | "custom" | "none",
  customYmd: string
): string | null {
  if (pick === "none") return null;
  if (pick === "tomorrow") return getTomorrowCalendarDateAmsterdam();
  if (pick === "custom" && /^\d{4}-\d{2}-\d{2}$/.test(customYmd)) {
    return customYmd;
  }
  if (pick === "today") return getCalendarDateAmsterdam();
  return null;
}

export function resolveDueAtFromDeadline(
  deadline: NewTaskFlowPayload["deadline"]
): string | null {
  if (!deadline) return null;
  if (deadline === "today") {
    return calendarDayToDueAt(getCalendarDateAmsterdam());
  }
  if (deadline === "tomorrow") {
    return calendarDayToDueAt(getTomorrowCalendarDateAmsterdam());
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return calendarDayToDueAt(deadline);
  }
  return null;
}

export function buildMicroStepsFromTitles(titles: string[]): MicroStep[] {
  return titles
    .map((t) => t.trim())
    .filter(Boolean)
    .map((stepTitle) => ({
      id: microStepId(),
      title: stepTitle,
      minutes: null,
      difficulty: null,
      done: false,
    }));
}

export function buildTaskFromFlowPayload(
  payload: NewTaskFlowPayload,
  extras?: Partial<Omit<Task, "id">>
): Omit<Task, "id"> {
  const minutes = Math.max(1, Math.min(480, payload.durationMin));
  const microSteps = buildMicroStepsFromTitles(payload.microsteps);
  const repeatFields = resolveRepeatFields(
    payload.repeat,
    payload.repeatIntervalDays
  );
  const scheduleYmd =
    payload.scheduleDate && /^\d{4}-\d{2}-\d{2}$/.test(payload.scheduleDate)
      ? payload.scheduleDate
      : null;
  const anchorYmd =
    scheduleYmd ??
    (repeatFields.repeat === "weekly" || repeatFields.repeat === "interval"
      ? getCalendarDateAmsterdam()
      : null);
  const dueAt = resolveDueAtFromDeadline(payload.deadline);
  const createdAt =
    anchorYmd && payload.scheduleTime
      ? buildCreatedAtWithScheduleTime(
          anchorYmd,
          payload.scheduleTime.hour,
          payload.scheduleTime.minute
        )
      : anchorYmd &&
          (repeatFields.repeat === "weekly" || repeatFields.repeat === "interval")
        ? `${anchorYmd}T12:00:00.000Z`
        : undefined;

  const repeatNextDueAt =
    repeatFields.repeat === "interval"
      ? resolveInitialIntervalNextDueAt(anchorYmd)
      : undefined;

  return {
    title: payload.title.trim(),
    done: false,
    started: false,
    priority: null,
    dueAt,
    duration: minutes,
    estimatedDuration: minutes,
    notToday: false,
    source: "regular",
    reminders: [],
    repeat: repeatFields.repeat,
    repeatWeekdays: repeatFields.repeatWeekdays,
    repeatAnchor: repeatFields.repeatAnchor,
    repeatIntervalDays: repeatFields.repeatIntervalDays ?? undefined,
    repeatNextDueAt,
    impact: "🌱",
    energyLevel: payload.energy,
    microSteps,
    ...(createdAt ? { created_at: createdAt } : {}),
    ...extras,
  };
}
