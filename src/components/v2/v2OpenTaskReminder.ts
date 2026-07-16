"use client";

import { isV2MutedToday, patchV2Settings, readV2Settings } from "./v2Settings";
import { todayYmd } from "./v2Tasks";
import type { V2State } from "./V2Context";
import { v2HasThings, v2NormalizeThings, v2PrimaryThing } from "./v2Things";

const FOCUS_SESSION_KEY = "v2_focus_session";

export type V2FocusSession = {
  thing: string;
  date: string;
  started: boolean;
  completed: boolean;
  reminderShownOn: string | null;
};

export const OPEN_TASK_REMINDER_LINE =
  "Je ene ding van vandaag staat nog klaar. Geen haast, alleen als je wilt.";

function readFocusSession(): V2FocusSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FOCUS_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<V2FocusSession>;
    if (typeof parsed.thing !== "string" || typeof parsed.date !== "string") return null;
    return {
      thing: parsed.thing,
      date: parsed.date,
      started: parsed.started === true,
      completed: parsed.completed === true,
      reminderShownOn:
        typeof parsed.reminderShownOn === "string" ? parsed.reminderShownOn : null,
    };
  } catch {
    return null;
  }
}

function writeFocusSession(session: V2FocusSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!session) {
      window.localStorage.removeItem(FOCUS_SESSION_KEY);
      return;
    }
    window.localStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(session));
  } catch {
    // negeren
  }
}

export function recordV2FocusStart(thing: string, now = new Date()): void {
  const today = todayYmd(now);
  const existing = readFocusSession();
  if (existing?.date === today && existing.thing === thing && existing.started) return;
  writeFocusSession({
    thing,
    date: today,
    started: true,
    completed: false,
    reminderShownOn: null,
  });
}

export function recordV2FocusCompleted(thing: string, now = new Date()): void {
  const today = todayYmd(now);
  const existing = readFocusSession();
  if (!existing || existing.date !== today) return;
  if (existing.thing !== thing) return;
  writeFocusSession({ ...existing, completed: true });
}

export function isV2OpenTaskReminderEnabled(): boolean {
  return readV2Settings().openTaskReminderEnabled;
}

function activeIncompleteSession(state: V2State, now = new Date()): V2FocusSession | null {
  const session = readFocusSession();
  if (!session) return null;
  const today = todayYmd(now);
  if (session.date !== today) return null;
  if (!session.started || session.completed) return null;
  if (state.todayDone) return null;

  const things = v2NormalizeThings(state.things);
  if (!v2HasThings(things)) return null;
  const primary = v2PrimaryThing(things);
  if (!primary || session.thing !== primary) return null;

  return session;
}

export function shouldShowV2OpenTaskReminder(state: V2State, now = new Date()): boolean {
  if (typeof window === "undefined") return false;
  if (!isV2OpenTaskReminderEnabled()) return false;
  if (isV2MutedToday()) return false;

  const today = todayYmd(now);
  const { openTaskReminderDismissedOn } = readV2Settings();
  if (openTaskReminderDismissedOn === today) return false;

  const session = activeIncompleteSession(state, now);
  if (!session) return false;
  if (session.reminderShownOn === today) return false;

  return true;
}

export function markV2OpenTaskReminderShown(now = new Date()): void {
  const session = readFocusSession();
  if (!session) return;
  const today = todayYmd(now);
  writeFocusSession({ ...session, reminderShownOn: today });
}

export function dismissV2OpenTaskReminderToday(now = new Date()): void {
  patchV2Settings({ openTaskReminderDismissedOn: todayYmd(now) });
}

export function isAfternoonWindow(now = new Date()): boolean {
  const h = now.getHours();
  return h >= 14 && h < 18;
}

/** Voor geplande notificatie: alleen in middagvenster, max 1× per taak per dag. */
export function shouldFireV2OpenTaskNotification(state: V2State, now = new Date()): boolean {
  if (!isV2OpenTaskReminderEnabled()) return false;
  if (isV2MutedToday()) return false;
  if (!isAfternoonWindow(now)) return false;
  return shouldShowV2OpenTaskReminder(state, now);
}
