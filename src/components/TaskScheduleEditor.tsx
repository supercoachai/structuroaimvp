"use client";

import React, { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  calendarDayToDueAt,
  parseDueCalendarDayAmsterdam,
} from "@/lib/dagstart/deadlineToday";
import {
  getCalendarDateAmsterdam,
  getTomorrowCalendarDateAmsterdam,
} from "@/lib/dagstartCookie";

export interface TaskScheduleEditorTask {
  id: string;
  title: string;
  dueAt?: string | null;
  reminders?: number[];
  repeat?: string;
  duration?: number | null;
  estimatedDuration?: number | null;
  energyLevel?: string;
}

type DeadlinePreset = "none" | "today" | "tomorrow" | "pick";

interface TaskScheduleEditorProps {
  task: TaskScheduleEditorTask;
  onSave: (task: TaskScheduleEditorTask) => void;
  onClose: () => void;
}

function initialDeadlineState(dueAt: string | null | undefined): {
  preset: DeadlinePreset;
  pickedYmd: string;
} {
  const ymd = parseDueCalendarDayAmsterdam(dueAt);
  if (!ymd) {
    return { preset: "none", pickedYmd: getCalendarDateAmsterdam() };
  }
  const today = getCalendarDateAmsterdam();
  const tomorrow = getTomorrowCalendarDateAmsterdam();
  if (ymd === today) return { preset: "today", pickedYmd: ymd };
  if (ymd === tomorrow) return { preset: "tomorrow", pickedYmd: ymd };
  return { preset: "pick", pickedYmd: ymd };
}

export default function TaskScheduleEditor({ task, onSave, onClose }: TaskScheduleEditorProps) {
  const { t } = useI18n();
  const initial = useMemo(
    () => initialDeadlineState(task?.dueAt),
    [task?.dueAt]
  );
  const [title, setTitle] = useState(task?.title ?? "");
  const [duration, setDuration] = useState<number | null>(task?.duration ?? task?.estimatedDuration ?? null);
  const [energyLevel, setEnergyLevel] = useState<string>(task?.energyLevel ?? "medium");
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>(initial.preset);
  const [pickedYmd, setPickedYmd] = useState(initial.pickedYmd);

  const resolveDueAt = (): string | null => {
    if (deadlinePreset === "none") return null;
    if (deadlinePreset === "today") {
      return calendarDayToDueAt(getCalendarDateAmsterdam());
    }
    if (deadlinePreset === "tomorrow") {
      return calendarDayToDueAt(getTomorrowCalendarDateAmsterdam());
    }
    return calendarDayToDueAt(pickedYmd);
  };

  const handleSave = () => {
    onSave({
      ...task,
      title: title.trim() || task.title,
      dueAt: resolveDueAt(),
      reminders: [],
      repeat: "none",
      duration: duration || null,
      estimatedDuration: duration || null,
      energyLevel: energyLevel || "medium",
    });
    onClose();
  };

  const chipClass = (active: boolean) =>
    `rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-blue-600 text-white shadow-sm"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg p-6 sm:p-8 border border-gray-200/80">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{t("taskEditor.title")}</h2>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
        >
          {t("taskEditor.close")}
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t("taskEditor.labelTitle")}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("taskEditor.titlePh")}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t("taskEditor.labelDeadline")}
          </label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["none", t("taskEditor.deadlineNone")],
                ["today", t("taskEditor.deadlineToday")],
                ["tomorrow", t("taskEditor.deadlineTomorrow")],
                ["pick", t("taskEditor.deadlinePick")],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDeadlinePreset(key)}
                className={chipClass(deadlinePreset === key)}
              >
                {label}
              </button>
            ))}
          </div>
          {deadlinePreset === "pick" ? (
            <input
              type="date"
              value={pickedYmd}
              onChange={(e) => setPickedYmd(e.target.value)}
              className="mt-3 w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t("taskEditor.labelDuration")}
          </label>
          <input
            type="number"
            min={1}
            max={480}
            value={duration ?? ""}
            onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value, 10) : null)}
            placeholder={t("taskEditor.durationPh")}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t("taskEditor.labelEnergy")}
          </label>
          <div className="flex gap-2 flex-wrap">
            {(["low", "medium", "high"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setEnergyLevel(level)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  energyLevel === level
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {level === "low"
                  ? t("taskEditor.enLow")
                  : level === "medium"
                    ? t("taskEditor.enMed")
                    : t("taskEditor.enHigh")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors"
        >
          {t("taskEditor.save")}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="py-3 px-4 rounded-2xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
        >
          {t("taskEditor.cancel")}
        </button>
      </div>
    </div>
  );
}
