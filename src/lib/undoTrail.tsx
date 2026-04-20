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

  useEffect(() => {
    if (!isActive || !action) return;
    setTimeLeft(8);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, action, onDismiss]);

  if (!isActive || !action) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[10002] mx-auto max-w-sm rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg flex items-center justify-between gap-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{MESSAGES[action.type]}</p>
        <p className="mt-1 text-xs text-slate-500">Ongedaan maken in {timeLeft}s</p>
      </div>
      <button
        type="button"
        onClick={onUndo}
        className="flex-shrink-0 rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 active:scale-95"
      >
        Ongedaan
      </button>
    </div>
  );
}
