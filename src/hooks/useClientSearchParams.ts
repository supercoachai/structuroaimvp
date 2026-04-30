"use client";

import { useMemo, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

let historyPatched = false;

function ensureHistorySubscription() {
  if (typeof window === "undefined" || historyPatched) return;
  historyPatched = true;

  const schedule = () => queueMicrotask(notify);

  window.addEventListener("popstate", schedule);

  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = function (
    ...args: Parameters<History["pushState"]>
  ): ReturnType<History["pushState"]> {
    const r = origPush(...args);
    schedule();
    return r;
  };
  history.replaceState = function (
    ...args: Parameters<History["replaceState"]>
  ): ReturnType<History["replaceState"]> {
    const r = origReplace(...args);
    schedule();
    return r;
  };
}

/**
 * Zelfde info als useSearchParams(), maar zonder Next.js Suspense-blokkade.
 * Voorkomt oneindige "laden" na client-navigatie (bijv. /todo → /focus?task=…).
 */
function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  ensureHistorySubscription();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot(): string {
  return typeof window !== "undefined" ? window.location.search : "";
}

function getServerSnapshot(): string {
  return "";
}

export function useClientSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => new URLSearchParams(search), [search]);
}
