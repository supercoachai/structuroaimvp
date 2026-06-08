"use client";

import { useI18n } from "@/lib/i18n";
import type { TaskRepeatMode, TaskRepeatWeekdays } from "@/lib/taskRecurrence";

export type TaskRepeatSelection = {
  repeat: TaskRepeatMode;
  repeatWeekdays: TaskRepeatWeekdays;
};

type TaskRepeatPickerProps = {
  value: TaskRepeatSelection;
  onChange: (value: TaskRepeatSelection) => void;
  compact?: boolean;
  labelPrefix?: "taskEditor" | "newTask";
};

const OPTIONS: Array<{
  repeat: TaskRepeatMode;
  repeatWeekdays: TaskRepeatWeekdays;
  labelKey: string;
}> = [
  { repeat: "none", repeatWeekdays: "all", labelKey: "repeatNone" },
  { repeat: "daily", repeatWeekdays: "all", labelKey: "repeatDaily" },
  { repeat: "daily", repeatWeekdays: "weekdays", labelKey: "repeatWeekdays" },
  { repeat: "weekly", repeatWeekdays: "all", labelKey: "repeatWeekly" },
];

function chipClass(active: boolean, compact?: boolean) {
  return `rounded-xl border px-3 font-medium transition-colors ${
    compact ? "py-2 text-sm" : "py-2.5 text-sm"
  } ${
    active
      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
      : "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
  }`;
}

export function selectionFromTask(task: {
  repeat?: string | null;
  repeatWeekdays?: string | null;
}): TaskRepeatSelection {
  const repeat =
    task.repeat === "daily" || task.repeat === "weekly" ? task.repeat : "none";
  const repeatWeekdays =
    task.repeatWeekdays === "weekdays" || task.repeatWeekdays === "weekends"
      ? task.repeatWeekdays
      : "all";
  return { repeat, repeatWeekdays };
}

export function isSameRepeatSelection(
  a: TaskRepeatSelection,
  b: TaskRepeatSelection
): boolean {
  return a.repeat === b.repeat && a.repeatWeekdays === b.repeatWeekdays;
}

export default function TaskRepeatPicker({
  value,
  onChange,
  compact,
  labelPrefix = "taskEditor",
}: TaskRepeatPickerProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((opt) => {
        const active = isSameRepeatSelection(value, {
          repeat: opt.repeat,
          repeatWeekdays: opt.repeatWeekdays,
        });
        return (
          <button
            key={opt.labelKey}
            type="button"
            onClick={() =>
              onChange({ repeat: opt.repeat, repeatWeekdays: opt.repeatWeekdays })
            }
            className={chipClass(active, compact)}
          >
            {t(`${labelPrefix}.${opt.labelKey}`)}
          </button>
        );
      })}
    </div>
  );
}
