import { trackClientFunnelEvent } from "./clientFunnelAnalyticsClient";
import { focusPlannedMinutesBucket } from "./durationBuckets";
import { sanitizeAnalyticsTaskId } from "./sanitizeAnalyticsTaskId";

export type FocusSessionAnalyticsEnergy = "laag" | "normaal" | "hoog";

export type FocusSessionAbandonReason =
  | "user_cancelled"
  | "navigation"
  | "parked";

export type FocusSessionOutcomePayload = {
  plannedMinutes: number;
  timeLeftSec: number;
  taskId: string | null | undefined;
  energy: "low" | "medium" | "high" | string | null | undefined;
};

export function focusEnergyToAnalytics(
  level: "low" | "medium" | "high" | string | null | undefined
): FocusSessionAnalyticsEnergy {
  if (level === "low") return "laag";
  if (level === "high") return "hoog";
  return "normaal";
}

export function focusSessionMetrics(
  plannedMinutes: number,
  timeLeftSec: number,
  taskId: string | null | undefined,
  energy: FocusSessionAnalyticsEnergy
) {
  const duration_planned_sec = Math.max(0, Math.round(plannedMinutes * 60));
  const duration_actual_sec = Math.max(
    0,
    Math.min(
      duration_planned_sec,
      duration_planned_sec - Math.max(0, Math.round(timeLeftSec))
    )
  );
  const completion_ratio =
    duration_planned_sec > 0
      ? Math.min(1, duration_actual_sec / duration_planned_sec)
      : 0;

  return {
    task_id: sanitizeAnalyticsTaskId(taskId),
    energy_level: energy,
    duration_planned_sec,
    duration_actual_sec,
    completion_ratio,
  };
}

export function captureFocusSessionStarted(payload: {
  plannedMinutes: number;
  taskId: string | null | undefined;
  energy: "low" | "medium" | "high" | string | null | undefined;
}) {
  const analyticsEnergy = focusEnergyToAnalytics(payload.energy);
  trackClientFunnelEvent("focus_session_started", {
    task_id: sanitizeAnalyticsTaskId(payload.taskId),
    energy_level: analyticsEnergy,
    duration_planned_sec: Math.max(0, Math.round(payload.plannedMinutes * 60)),
    duration_bucket: focusPlannedMinutesBucket(payload.plannedMinutes),
    surface: "app",
  });
}

export function captureFocusSessionCompleted(payload: FocusSessionOutcomePayload) {
  const analyticsEnergy = focusEnergyToAnalytics(payload.energy);
  trackClientFunnelEvent("focus_session_completed", {
    ...focusSessionMetrics(
      payload.plannedMinutes,
      payload.timeLeftSec,
      payload.taskId,
      analyticsEnergy
    ),
    duration_bucket: focusPlannedMinutesBucket(payload.plannedMinutes),
    completed_normally: true,
    surface: "app",
  });
}

export function captureFocusSessionEndedEarly(
  payload: FocusSessionOutcomePayload & { reason?: string }
) {
  const analyticsEnergy = focusEnergyToAnalytics(payload.energy);
  trackClientFunnelEvent("focus_session_ended_early", {
    ...focusSessionMetrics(
      payload.plannedMinutes,
      payload.timeLeftSec,
      payload.taskId,
      analyticsEnergy
    ),
    reason: payload.reason ?? "manual_complete",
    duration_bucket: focusPlannedMinutesBucket(payload.plannedMinutes),
    surface: "app",
  });
}

export function captureFocusSessionAbandoned(
  payload: FocusSessionOutcomePayload & { reason: FocusSessionAbandonReason }
) {
  const analyticsEnergy = focusEnergyToAnalytics(payload.energy);
  trackClientFunnelEvent("focus_session_abandoned", {
    ...focusSessionMetrics(
      payload.plannedMinutes,
      payload.timeLeftSec,
      payload.taskId,
      analyticsEnergy
    ),
    reason: payload.reason,
    duration_bucket: focusPlannedMinutesBucket(payload.plannedMinutes),
    surface: "app",
  });
}
