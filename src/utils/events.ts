import { trackEvent } from "./analytics";

// Dagstart
export const trackDagstartOpened = () => trackEvent("dagstart_opened");

export const trackEnergyChecked = (level: "laag" | "normaal" | "hoog") =>
  trackEvent("energy_checked", { level });

// Taken
export const trackTaskCreated = () => trackEvent("task_created");

export const trackTaskSelected = (position: number) =>
  trackEvent("task_selected", { position });

export const trackTaskCompleted = (
  source: "focus_mode" | "quick_complete" | "manual",
  energy_level?: "low" | "medium" | "high"
) => trackEvent("task_completed", { source, ...(energy_level ? { energy_level } : {}) });

export const trackQuickCompleteTriggered = (
  energy_level: "low" | "medium" | "high",
  task_duration_estimated: number
) =>
  trackEvent("quick_complete_triggered", {
    energy_level,
    task_duration_estimated,
  });

export const trackTaskAbandoned = () => trackEvent("task_abandoned");

// Focus
export const trackFocusStarted = () => trackEvent("focus_started");

export const trackFocusModeStarted = (
  energy_level: "low" | "medium" | "high",
  task_duration_estimated: number
) =>
  trackEvent("focus_mode_started", {
    energy_level,
    task_duration_estimated,
  });

export const trackFocusCompleted = (duration_seconds: number) =>
  trackEvent("focus_completed", { duration_seconds });

export const trackFocusAbandoned = (duration_seconds: number) =>
  trackEvent("focus_abandoned", { duration_seconds });

// Shutdown
export const trackShutdownStarted = () => trackEvent("shutdown_started");

export const trackShutdownCompleted = (
  tasks_moved_to_tomorrow: number,
  satisfaction_level: "low" | "good" | "great"
) =>
  trackEvent("daily_shutdown_completed", {
    tasks_moved_to_tomorrow,
    satisfaction_level,
  });

// Sessie
export const trackSessionAbandoned = (last_screen: string) =>
  trackEvent("session_abandoned", { last_screen });
