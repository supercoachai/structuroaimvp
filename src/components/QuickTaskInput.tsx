"use client";

import { useCallback, useState } from "react";
import { PlusIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useTaskContext } from "@/context/TaskContext";
import { useCheckIn } from "@/hooks/useCheckIn";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/components/Toast";
import { track } from "@/shared/track";

function energyFromTodayCheckIn(energy_level: string | undefined): "low" | "medium" | "high" {
  const raw = (energy_level ?? "").trim().toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return "medium";
}

const DEFAULT_MINUTES = 15;

/**
 * Vaste balk boven de tabnav: snelle taak naar de pool (geen top3), energie volgens vandaag dagstart of medium.
 */
export default function QuickTaskInput() {
  const { t } = useI18n();
  const { addTask } = useTaskContext();
  const { checkIn } = useCheckIn();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const submit = useCallback(async () => {
    const title = value.trim();
    if (!title || busy) return;

    const energyLevel = energyFromTodayCheckIn(checkIn?.energy_level);

    setBusy(true);
    try {
      await addTask({
        title,
        done: false,
        started: false,
        priority: null,
        dueAt: null,
        duration: DEFAULT_MINUTES,
        estimatedDuration: DEFAULT_MINUTES,
        notToday: false,
        // DB: tasks_source_allowed_chk (zie migration_daystart_top3_and_completion_source.sql).
        // Na migration_tasks_source_quick_add.sql mag dit weer 'quick_add' worden voor filtering.
        source: "regular",
        reminders: [],
        repeat: "none",
        impact: "🌱",
        energyLevel,
        microSteps: [],
      });
      setValue("");
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1200);
      track("task_quick_add", { length: title.length, energy: energyLevel });
    } catch (err: unknown) {
      console.error("QuickTaskInput:", err);
      toast(t("tasks.toastAddErr"));
    } finally {
      setBusy(false);
    }
  }, [addTask, busy, checkIn?.energy_level, t, value]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  return (
    <div
      className="shrink-0 border-t bg-[var(--structuro-bg)] px-4 pt-2.5"
      style={{ borderColor: "var(--structuro-border)" }}
    >
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-lg pb-1">
        <label htmlFor="quick-task-input" className="sr-only">
          {t("tasks.quickBarLabel")}
        </label>
        <div
          className={`flex items-center gap-2 rounded-full border bg-white px-3 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-[box-shadow,border-color] duration-300 ${
            justAdded
              ? "border-emerald-400 ring-1 ring-emerald-200/80"
              : "border-[#E2E8F0]"
          }`}
        >
          <input
            id="quick-task-input"
            name="quick-task"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("tasks.quickBarPlaceholder")}
            disabled={busy}
            className="min-w-0 flex-1 border-0 bg-transparent py-0.5 text-[13px] text-[var(--structuro-text)] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0 disabled:opacity-60"
            autoComplete="off"
            enterKeyHint="done"
          />
          <button
            type="submit"
            disabled={busy || !value.trim()}
            aria-label={t("tasks.quickBarSubmitAria")}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
              justAdded
                ? "bg-emerald-500 text-white"
                : "bg-[var(--structuro-border-soft)] text-[var(--structuro-text)] hover:bg-slate-200 disabled:opacity-40"
            }`}
          >
            {justAdded ? (
              <CheckIcon className="h-5 w-5" aria-hidden />
            ) : (
              <PlusIcon className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
