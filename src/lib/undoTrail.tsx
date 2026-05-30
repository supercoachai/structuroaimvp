"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Task } from "@/context/TaskContext";

export type UndoableActionType = "task_update" | "task_delete" | "task_complete";

export interface UndoableAction {
  type: UndoableActionType;
  taskId: string;
  previousState: Task;
  timestamp: number;
}

/**
 * Stack-gebaseerde undo voor impulsieve acties (o.a. taak voltooien).
 */
export function useUndoTrail() {
  const undoStackRef = useRef<UndoableAction[]>([]);
  const [lastAction, setLastAction] = useState<UndoableAction | null>(null);
  const [undoWindowActive, setUndoWindowActive] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recordAction = useCallback((action: UndoableAction) => {
    undoStackRef.current.push(action);
    setLastAction(action);
    setUndoWindowActive(true);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoWindowActive(false);
    }, 8000);
  }, []);

  const undo = useCallback(
    async (onRestore: (task: Task) => Promise<void>) => {
      const action = undoStackRef.current.pop();
      if (!action) return;
      try {
        await onRestore(action.previousState);
        setLastAction(null);
        setUndoWindowActive(false);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      } catch (e) {
        console.error("[undo] restore failed:", e);
        undoStackRef.current.push(action);
      }
    },
    []
  );

  const clearUndoStack = useCallback(() => {
    undoStackRef.current = [];
    setLastAction(null);
    setUndoWindowActive(false);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, []);

  return {
    recordAction,
    undo,
    clearUndoStack,
    lastAction,
    undoWindowActive,
  };
}

export interface UndoToastProps {
  action: UndoableAction | null;
  isActive: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}

const TOAST_EXIT_MS = 900;

const MESSAGES: Record<UndoableActionType, string> = {
  task_update: "Taak bijgewerkt",
  task_delete: "Taak verwijderd",
  task_complete: "Taak voltooid",
};

export function UndoToast({
  action,
  isActive,
  onUndo,
  onDismiss,
}: UndoToastProps) {
  const [timeLeft, setTimeLeft] = useState(8);
  const [exiting, setExiting] = useState(false);

  const beginExit = useCallback(() => {
    setExiting((was) => {
      if (was) return was;
      window.setTimeout(() => {
        setExiting(false);
        onDismiss();
      }, TOAST_EXIT_MS);
      return true;
    });
  }, [onDismiss]);

  useEffect(() => {
    if (!isActive || !action) return;
    setExiting(false);
    setTimeLeft(8);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          beginExit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, action, beginExit]);

  if ((!isActive || !action) && !exiting) return null;

  const type = action?.type ?? "task_complete";

  return (
    <div className="st-toast-host" style={{ zIndex: 10002 }}>
      <div
        className={`st-toast st-toast--action${exiting ? " is-fading" : ""}`}
        role="status"
      >
        <div className="st-toast__body">
          <p className="st-toast__title">{MESSAGES[type]}</p>
          <p className="st-toast__meta">Ongedaan maken in {timeLeft}s</p>
        </div>
        <button type="button" onClick={onUndo} className="st-toast__action">
          Ongedaan
        </button>
      </div>
    </div>
  );
}
