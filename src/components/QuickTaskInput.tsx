"use client";

import { useCallback, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useTaskContext } from "@/context/TaskContext";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/components/Toast";
import { track } from "@/shared/track";
import NewTaskFlow from "@/components/newTask/NewTaskFlow";
import { buildTaskFromFlowPayload } from "@/lib/newTask/buildTaskFromFlowPayload";
import type { NewTaskFlowPayload } from "@/lib/newTask/newTaskFlowTypes";

/**
 * Vaste balk boven de tabnav: opent de step-flow in hetzelfde gebied.
 */
export default function QuickTaskInput() {
  const { t } = useI18n();
  const { addTask } = useTaskContext();
  const [open, setOpen] = useState(false);
  const [flowKey, setFlowKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const handleSave = useCallback(
    async (payload: NewTaskFlowPayload) => {
      setBusy(true);
      try {
        await addTask(buildTaskFromFlowPayload(payload));
        track("task_quick_add", {
          length: payload.title.length,
          energy: payload.energy,
        });
      } catch (err: unknown) {
        console.error("QuickTaskInput:", err);
        toast(t("tasks.toastAddErr"));
        throw new Error("task_save_failed");
      } finally {
        setBusy(false);
      }
    },
    [addTask, t]
  );

  if (!open) {
    return (
      <div
        className="quick-task-bar shrink-0 border-t bg-[var(--st-bg)] px-4 py-2.5"
        style={{ borderColor: "var(--structuro-border)" }}
      >
        <div className="mx-auto w-full max-w-lg">
          <button
            type="button"
            onClick={() => {
              setFlowKey((k) => k + 1);
              setOpen(true);
            }}
            className="quick-task-field flex w-full items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-2.5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-[box-shadow,border-color] duration-300 hover:border-[var(--st-blue)]/30"
          >
            <span className="min-w-0 flex-1 text-[13px] text-[#94A3B8]">
              {t("newTask.openTrigger")}
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--structuro-border-soft)] text-[var(--structuro-text)]">
              <PlusIcon className="h-5 w-5" aria-hidden />
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="quick-task-bar quick-task-panel shrink-0 border-t bg-[var(--st-bg)] px-3 py-3 sm:px-4"
      style={{ borderColor: "var(--structuro-border)" }}
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[440px] flex-col">
        <NewTaskFlow
          key={flowKey}
          variant="compact"
          mode="panel"
          saving={busy}
          onClose={() => setOpen(false)}
          onSave={handleSave}
          className="min-h-[min(560px,65dvh)] flex-1"
        />
      </div>
    </div>
  );
}
