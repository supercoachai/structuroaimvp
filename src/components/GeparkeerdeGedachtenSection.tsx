"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { useTaskContext, type Task } from "@/context/TaskContext";
import {
  fetchParkedThoughts,
  deleteParkedThought,
  convertThoughtToTask,
  type ParkedThought,
} from "@/lib/supabase/parkedThoughtsDb";
import { toast } from "./Toast";
import { useI18n } from "@/lib/i18n";
import NewTaskFlow from "@/components/newTask/NewTaskFlow";
import { buildTaskFromFlowPayload } from "@/lib/newTask/buildTaskFromFlowPayload";
import type { NewTaskFlowPayload } from "@/lib/newTask/newTaskFlowTypes";

const MAX_THOUGHTS = 10;

type ConvertModal =
  | null
  | { mode: "supabase"; thought: ParkedThought }
  | { mode: "local"; task: Task };

export default function GeparkeerdeGedachtenSection() {
  const { t } = useI18n();
  const { user } = useUser();
  const { tasks, addTask, updateTask, fetchTasks, deleteTask } = useTaskContext();
  const [thoughts, setThoughts] = useState<ParkedThought[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertModal, setConvertModal] = useState<ConvertModal>(null);
  const [flowKey, setFlowKey] = useState(0);

  const localThoughts = tasks.filter((t) => t.source === "parked_thought" && !t.done);

  const isSupabase = Boolean(user?.id);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchParkedThoughts(user.id);
      setThoughts(data);
    } catch {
      setThoughts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (thought: ParkedThought) => {
    try {
      await deleteParkedThought(thought.id);
      setThoughts((prev) => prev.filter((t) => t.id !== thought.id));
      toast(t("parkedThoughts.deleted"));
    } catch {
      toast(t("parkedThoughts.deleteFail"));
    }
  };

  const modalTitle =
    convertModal?.mode === "supabase"
      ? convertModal.thought.content
      : convertModal?.mode === "local"
        ? convertModal.task.title
        : "";

  const handleConvertSave = useCallback(
    async (payload: NewTaskFlowPayload) => {
      if (!convertModal) return;

      const taskFields = buildTaskFromFlowPayload(payload, {
        impact: "🧠",
        source: "regular",
      });

      if (convertModal.mode === "supabase") {
        if (!user?.id) return;
        const thought = convertModal.thought;
        setConvertingId(thought.id);
        try {
          const created = await addTask(taskFields);
          await convertThoughtToTask(thought.id, created.id);
          setThoughts((prev) => prev.filter((t) => t.id !== thought.id));
          await fetchTasks();
          toast(t("parkedThoughts.atOpenTasks"));
          setConvertModal(null);
        } catch {
          toast(t("parkedThoughts.convertFail"));
          throw new Error("parked_thought_convert_failed");
        } finally {
          setConvertingId(null);
        }
        return;
      }

      const task = convertModal.task;
      setConvertingId(task.id);
      try {
        await updateTask(task.id, {
          source: "regular",
          dueAt: taskFields.dueAt,
          duration: taskFields.duration,
          estimatedDuration: taskFields.estimatedDuration,
          energyLevel: taskFields.energyLevel,
          microSteps: taskFields.microSteps,
        });
        await fetchTasks();
        toast(t("parkedThoughts.atOpenTasks"));
        setConvertModal(null);
      } catch {
        toast(t("parkedThoughts.convertFail"));
        throw new Error("parked_thought_convert_failed");
      } finally {
        setConvertingId(null);
      }
    },
    [convertModal, user?.id, addTask, updateTask, fetchTasks, t]
  );

  const openConvertModal = useCallback((next: ConvertModal) => {
    setFlowKey((k) => k + 1);
    setConvertModal(next);
  }, []);

  const items = isSupabase ? thoughts : localThoughts;
  const percent = isSupabase ? Math.round((thoughts.length / MAX_THOUGHTS) * 100) : 0;

  if (loading && isSupabase) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-400 animate-pulse">
          {t("parkedThoughts.loading")}
        </p>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            {t("parkedThoughts.sectionTitle")}
          </h3>
          {isSupabase && (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
              {thoughts.length}/{MAX_THOUGHTS}
            </span>
          )}
        </div>

        {isSupabase && (
          <div className="px-5 pb-3">
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  percent >= 90 ? "bg-amber-400" : "bg-blue-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        <ul className="divide-y divide-gray-50">
          {items.map((item) => {
            const isSupabaseRow = "content" in item;
            const id = item.id;
            const text = isSupabaseRow
              ? (item as ParkedThought).content
              : (item as Task).title;
            const isConverting = convertingId === id;
            const localTask = !isSupabaseRow ? (item as Task) : null;

            return (
              <li
                key={id}
                className="group flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
              >
                <span className="text-slate-300 mt-0.5 text-sm">💭</span>
                <p className="flex-1 text-sm text-slate-700 leading-snug min-w-0 break-words">
                  {text}
                </p>
                <div className="flex shrink-0 flex-wrap items-center justify-end sm:opacity-100">
                  {(isSupabaseRow || localTask) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isSupabaseRow) {
                          openConvertModal({
                            mode: "supabase",
                            thought: item as ParkedThought,
                          });
                        } else if (localTask) {
                          openConvertModal({ mode: "local", task: localTask });
                        }
                      }}
                      disabled={isConverting}
                      className="text-xs text-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isConverting ? "…" : t("parkedThoughts.makeTask")}
                    </button>
                  )}
                  {isSupabaseRow && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item as ParkedThought)}
                      className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                    >
                      {t("parkedThoughts.remove")}
                    </button>
                  )}
                  {!isSupabase && localTask && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(t("parkedThoughts.confirmDelete"))) return;
                        try {
                          await deleteTask(localTask.id);
                          toast(t("parkedThoughts.removed"));
                          await fetchTasks();
                        } catch {
                          toast(t("parkedThoughts.removeFail"));
                        }
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                    >
                      {t("parkedThoughts.remove")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {isSupabase && thoughts.length >= 9 && (
          <div className="mx-5 mb-4 mt-2 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
            <p className="text-xs text-slate-700 font-medium">
              {t("parkedThoughts.almostFull")}
            </p>
          </div>
        )}
      </div>

      {convertModal ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-3 pt-4 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+var(--keyboard-inset-bottom,0px)))] sm:items-center sm:px-4"
          role="presentation"
          onClick={() => setConvertModal(null)}
        >
          <div
            className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-xl"
            role="dialog"
            aria-labelledby="convert-thought-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-gray-100 px-5 pb-3 pt-4 sm:px-6">
              <h3
                id="convert-thought-title"
                className="text-base font-semibold text-gray-900"
              >
                {t("parkedThoughts.modalTitle")}
              </h3>
              <p className="mt-1.5 line-clamp-3 text-sm leading-snug text-gray-600">
                {modalTitle}
              </p>
            </div>
            <NewTaskFlow
              key={flowKey}
              variant="compact"
              mode="panel"
              skipTitle
              initialTitle={modalTitle}
              saving={Boolean(convertingId)}
              onClose={() => setConvertModal(null)}
              onSave={handleConvertSave}
              className="min-h-[min(480px,62dvh)] flex-1 rounded-none border-0 shadow-none"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
