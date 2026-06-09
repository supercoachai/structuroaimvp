"use client";

import { useI18n } from "@/lib/i18n";
import {
  clampIntervalDays,
  DEFAULT_INTERVAL_DAYS,
  MAX_INTERVAL_DAYS,
  MIN_INTERVAL_DAYS,
  type RepeatAnchor,
  type TaskRepeatMode,
  type TaskRepeatWeekdays,
} from "@/lib/taskRecurrence";

export type TaskRepeatSelection = {
  repeat: TaskRepeatMode;
  repeatWeekdays: TaskRepeatWeekdays;
  repeatAnchor?: RepeatAnchor;
  repeatIntervalDays?: number | null;
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
  repeatAnchor?: RepeatAnchor;
  labelKey: string;
}> = [
  { repeat: "none", repeatWeekdays: "all", labelKey: "repeatNone" },
  { repeat: "daily", repeatWeekdays: "all", labelKey: "repeatDaily" },
  { repeat: "daily", repeatWeekdays: "weekdays", labelKey: "repeatWeekdays" },
  {
    repeat: "weekly",
    repeatWeekdays: "all",
    repeatAnchor: "planned",
    labelKey: "repeatWeekly",
  },
  {
    repeat: "interval",
    repeatWeekdays: "all",
    repeatAnchor: "completion",
    labelKey: "repeatInterval",
  },
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
  repeatAnchor?: string | null;
  repeatIntervalDays?: number | null;
}): TaskRepeatSelection {
  if (task.repeat === "interval") {
    return {
      repeat: "interval",
      repeatWeekdays: "all",
      repeatAnchor: "completion",
      repeatIntervalDays: clampIntervalDays(task.repeatIntervalDays),
    };
  }

  const repeat =
    task.repeat === "daily" || task.repeat === "weekly" ? task.repeat : "none";
  const repeatWeekdays =
    task.repeatWeekdays === "weekdays" || task.repeatWeekdays === "weekends"
      ? task.repeatWeekdays
      : "all";

  return {
    repeat,
    repeatWeekdays,
    repeatAnchor: repeat === "weekly" ? "planned" : "planned",
  };
}

export function isSameRepeatSelection(
  a: TaskRepeatSelection,
  b: TaskRepeatSelection
): boolean {
  if (a.repeat !== b.repeat || a.repeatWeekdays !== b.repeatWeekdays) {
    return false;
  }
  if (a.repeat === "interval") return true;
  return true;
}

export default function TaskRepeatPicker({
  value,
  onChange,
  compact,
  labelPrefix = "taskEditor",
}: TaskRepeatPickerProps) {
  const { t } = useI18n();
  const intervalDays = clampIntervalDays(value.repeatIntervalDays);

  const handleIntervalDaysChange = (raw: string) => {
    const parsed = parseInt(raw, 10);
    onChange({
      ...value,
      repeat: "interval",
      repeatWeekdays: "all",
      repeatAnchor: "completion",
      repeatIntervalDays: clampIntervalDays(
        Number.isFinite(parsed) ? parsed : DEFAULT_INTERVAL_DAYS
      ),
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const active = isSameRepeatSelection(value, {
            repeat: opt.repeat,
            repeatWeekdays: opt.repeatWeekdays,
            repeatAnchor: opt.repeatAnchor,
          });
          return (
            <button
              key={opt.labelKey}
              type="button"
              onClick={() =>
                onChange({
                  repeat: opt.repeat,
                  repeatWeekdays: opt.repeatWeekdays,
                  repeatAnchor: opt.repeatAnchor,
                  repeatIntervalDays:
                    opt.repeat === "interval"
                      ? value.repeat === "interval"
                        ? intervalDays
                        : DEFAULT_INTERVAL_DAYS
                      : undefined,
                })
              }
              className={chipClass(active, compact)}
            >
              {t(`${labelPrefix}.${opt.labelKey}`)}
            </button>
          );
        })}
      </div>
      {value.repeat === "interval" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label
            htmlFor={`repeat-interval-days-${labelPrefix}`}
            className="text-sm font-medium text-gray-600"
          >
            {t(`${labelPrefix}.repeatIntervalDaysLabel`)}
          </label>
          <input
            id={`repeat-interval-days-${labelPrefix}`}
            type="number"
            min={MIN_INTERVAL_DAYS}
            max={MAX_INTERVAL_DAYS}
            value={intervalDays}
            onChange={(e) => handleIntervalDaysChange(e.target.value)}
            className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <span className="text-sm text-gray-500">
            {t(`${labelPrefix}.repeatIntervalDaysSuffix`)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
