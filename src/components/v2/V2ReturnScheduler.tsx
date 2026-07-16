"use client";

/**
 * Lokale herinneringen voor v2 (prototype).
 *
 * Beperkingen (bewust, v2-testomgeving):
 * - Geen push backend of service worker: herinneringen werken alleen terwijl
 *   een tab open blijft of bij een bezoek in het venster.
 * - Max 1 browsernotificatie per 24 uur (rollend venster).
 * - Widget_hint-variant toont een zachte banner op home i.p.v. Notification API.
 *
 * Best effort: herplan bij tab-focus en visibilitychange.
 */

import { useEffect } from "react";

import {
  clearV2ReturnNotificationSchedule,
  fireV2OpenTaskNotification,
  isV2ReturnReminderEnabled,
  maybeFireReturnNotificationOnVisit,
  scheduleV2ReturnNotification,
} from "./v2ReturnReminder";
import {
  trackV2NotificationFired,
  trackV2OpenTaskReminderShown,
  trackV2QuoteShown,
  trackV2ReturnReminderShown,
} from "./v2Analytics";
import {
  OPEN_TASK_REMINDER_LINE,
  markV2OpenTaskReminderShown,
  shouldFireV2OpenTaskNotification,
} from "./v2OpenTaskReminder";
import { isV2QuoteEnabled } from "./v2Quotes";
import { useV2 } from "./V2Context";
import type { V2State } from "./V2Context";

function runReminderCycle(state: V2State): void {
  if (isV2ReturnReminderEnabled()) {
    const fired = maybeFireReturnNotificationOnVisit();
    if (fired.morning) {
      trackV2NotificationFired({ kind: "morning" });
      if (isV2QuoteEnabled()) {
        trackV2QuoteShown({ surface: "notification" });
      }
      trackV2ReturnReminderShown({ channel: "notification" });
    }
    if (fired.evening) {
      trackV2NotificationFired({ kind: "evening" });
      trackV2ReturnReminderShown({ channel: "notification" });
    }
    scheduleV2ReturnNotification();
  }

  if (shouldFireV2OpenTaskNotification(state)) {
    const openTaskFired = fireV2OpenTaskNotification(OPEN_TASK_REMINDER_LINE);
    if (openTaskFired) {
      markV2OpenTaskReminderShown();
      trackV2NotificationFired({ kind: "open_task" });
      trackV2OpenTaskReminderShown({ channel: "notification" });
    }
  }
}

export function V2ReturnReminderScheduler() {
  const { state } = useV2();

  useEffect(() => {
    runReminderCycle(state);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      runReminderCycle(state);
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearV2ReturnNotificationSchedule();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state]);

  return null;
}
