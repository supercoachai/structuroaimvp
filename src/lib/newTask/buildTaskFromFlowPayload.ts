import { calendarDayToDueAt } from "@/lib/dagstart/deadlineToday";
import {
  getCalendarDateAmsterdam,
  getTomorrowCalendarDateAmsterdam,
} from "@/lib/dagstartCookie";
import { microStepId, type MicroStep } from "@/lib/microSteps";
import type { Task } from "@/context/TaskContext";
import type { NewTaskFlowPayload } from "./newTaskFlowTypes";

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

  return {
    title: payload.title.trim(),
    done: false,
    started: false,
    priority: null,
    dueAt: resolveDueAtFromDeadline(payload.deadline),
    duration: minutes,
    estimatedDuration: minutes,
    notToday: false,
    source: "regular",
    reminders: [],
    repeat: "none",
    impact: "🌱",
    energyLevel: payload.energy,
    microSteps,
    ...extras,
  };
}
