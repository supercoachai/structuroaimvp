import { trackEvent } from "./analytics";

// Dagstart
export const trackDagstartOpened = () => trackEvent("dagstart_opened");

export const trackEnergyChecked = (level: "laag" | "middel" | "hoog") =>
  trackEvent("energy_checked", { level });

// Taken
export const trackTaskCreated = () => trackEvent("task_created");

export const trackTaskSelected = (position: number) =>
  trackEvent("task_selected", { position });

export const trackTaskCompleted = () => trackEvent("task_completed");

export const trackTaskAbandoned = () => trackEvent("task_abandoned");

// Focus
export const trackFocusStarted = () => trackEvent("focus_started");

export const trackFocusCompleted = (duration_seconds: number) =>
  trackEvent("focus_completed", { duration_seconds });

export const trackFocusAbandoned = (duration_seconds: number) =>
  trackEvent("focus_abandoned", { duration_seconds });

// Shutdown
export const trackShutdownStarted = () => trackEvent("shutdown_started");

export const trackShutdownCompleted = () =>
  trackEvent("shutdown_completed");

// Sessie
export const trackSessionAbandoned = (last_screen: string) =>
  trackEvent("session_abandoned", { last_screen });
