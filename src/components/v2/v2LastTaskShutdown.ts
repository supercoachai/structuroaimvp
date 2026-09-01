import { removeV2ThingFromList } from "./v2Tasks";

const IN_PLACE_KEY = "v2_shutdown_in_place";

/** Laatste geplande dagstart-ding: na deze titel is `things` leeg. */
export function isLastDagstartThing(
  things: readonly string[],
  completedTitle: string,
): boolean {
  const needle = completedTitle.trim().toLowerCase();
  if (!needle || things.length === 0) return false;
  const inPlan = things.some(
    (thing) =>
      typeof thing === "string" && thing.trim().toLowerCase() === needle,
  );
  if (!inPlan) return false;
  return removeV2ThingFromList([...things], completedTitle).length === 0;
}

export function v2ShutdownHref(): string {
  if (
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/v2")
  ) {
    return "/v2/shutdown?from=last-task";
  }
  return "/shutdown?from=last-task";
}

export function markV2ShutdownInPlace(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(IN_PLACE_KEY, "1");
  } catch {
    /* privémodus */
  }
}

export function hasV2ShutdownInPlace(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(IN_PLACE_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearV2ShutdownInPlace(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(IN_PLACE_KEY);
  } catch {
    /* negeren */
  }
}

export function v2ShutdownFromLastTask(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("from") === "last-task";
  } catch {
    return false;
  }
}
