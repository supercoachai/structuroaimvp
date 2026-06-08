"use client";

import React, { useMemo, useState } from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@/lib/i18n";
import {
  calendarDayToDueAt,
  parseDueCalendarDayAmsterdam,
} from "@/lib/dagstart/deadlineToday";
import {
  getCalendarDateAmsterdam,
  getTomorrowCalendarDateAmsterdam,
} from "@/lib/dagstartCookie";
import {
  selectionFromTask,
  type TaskRepeatSelection,
} from "@/components/tasks/TaskRepeatPicker";
import EnergyDotTask from "@/components/structuro/EnergyDotTask";
import { appEnergyToSt } from "@/lib/structuro/energyTokens";
import { repeatLabelKey } from "@/lib/taskRecurrence";
import {
  parseTaskSchedulePhrase,
  type DeadlinePreset,
} from "@/lib/taskSchedulePhraseParser";
import {
  buildCreatedAtWithScheduleTime,
  extractScheduleTimeFromIso,
  formatHumanDateNl,
  mergeDateAndTime,
  resolveScheduleAnchorYmd,
} from "@/lib/taskScheduleTime";
import { requestNotificationPermission } from "@/components/ReminderEngine";

export interface TaskScheduleEditorTask {
  id: string;
  title: string;
  dueAt?: string | null;
  reminders?: number[];
  repeat?: string;
  repeatWeekdays?: "all" | "weekdays" | "weekends" | string;
  duration?: number | null;
  estimatedDuration?: number | null;
  energyLevel?: string;
  priority?: number | null;
  created_at?: string | null;
  isDeadline?: boolean;
}

type ActiveField =
  | "schedule"
  | "deadline"
  | "repeat"
  | "duration"
  | "energy"
  | "reminder"
  | null;

interface TaskScheduleEditorProps {
  task: TaskScheduleEditorTask;
  onSave: (task: TaskScheduleEditorTask) => void;
  onClose: () => void;
}

const REPEAT_OPTIONS: Array<{
  repeat: TaskRepeatSelection["repeat"];
  repeatWeekdays: TaskRepeatSelection["repeatWeekdays"];
  labelKey: string;
}> = [
  { repeat: "none", repeatWeekdays: "all", labelKey: "repeatNone" },
  { repeat: "daily", repeatWeekdays: "all", labelKey: "repeatDaily" },
  { repeat: "daily", repeatWeekdays: "weekdays", labelKey: "repeatWeekdays" },
  { repeat: "weekly", repeatWeekdays: "all", labelKey: "repeatWeekly" },
];

const DURATION_PRESETS = [5, 15, 30, 45, 60];

type ScheduleDatePreset = "none" | "today" | "tomorrow" | "pick";

function taskHasPlannedSchedule(task: TaskScheduleEditorTask): boolean {
  const legacyOneOffDeadline =
    task.isDeadline == null &&
    Boolean(task.dueAt) &&
    (!task.repeat || task.repeat === "none");
  if (task.isDeadline || legacyOneOffDeadline) {
    return Boolean(extractScheduleTimeFromIso(task.dueAt));
  }
  if (extractScheduleTimeFromIso(task.dueAt) || extractScheduleTimeFromIso(task.created_at)) {
    return true;
  }
  return task.repeat === "weekly" && Boolean(task.created_at);
}

function initialScheduleDateState(task: TaskScheduleEditorTask): {
  preset: ScheduleDatePreset;
  ymd: string;
} {
  const today = getCalendarDateAmsterdam();
  if (!taskHasPlannedSchedule(task)) {
    return { preset: "none", ymd: today };
  }
  const weeklyAnchor =
    task.repeat === "weekly" && task.created_at
      ? task.created_at.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null
      : null;
  const ymd = resolveScheduleAnchorYmd({
    scheduleDateYmd: weeklyAnchor,
    weeklyAnchorYmd: weeklyAnchor,
    repeat: task.repeat,
    dueAt: task.dueAt,
    created_at: task.created_at,
  });
  const tomorrow = getTomorrowCalendarDateAmsterdam();
  if (ymd === today) return { preset: "today", ymd };
  if (ymd === tomorrow) return { preset: "tomorrow", ymd };
  return { preset: "pick", ymd };
}

const REMINDER_PRESET_MINUTES = [10, 15, 30] as const;

const REMINDER_OPTIONS: Array<{ minutes: number | null; n?: string }> = [
  { minutes: null },
  ...REMINDER_PRESET_MINUTES.map((n) => ({ minutes: n, n: String(n) })),
];

function isPresetReminderMinutes(minutes: number | null): boolean {
  return (
    minutes === null ||
    (REMINDER_PRESET_MINUTES as readonly number[]).includes(minutes)
  );
}

function initialDeadlineState(task: TaskScheduleEditorTask): {
  preset: DeadlinePreset;
  pickedYmd: string;
} {
  const today = getCalendarDateAmsterdam();
  const legacyOneOffDeadline =
    task.isDeadline == null &&
    Boolean(task.dueAt) &&
    (!task.repeat || task.repeat === "none");
  if (task.isDeadline === false || (!task.isDeadline && !legacyOneOffDeadline)) {
    return { preset: "none", pickedYmd: today };
  }
  const ymd = parseDueCalendarDayAmsterdam(task?.dueAt);
  if (!ymd) {
    return { preset: "none", pickedYmd: today };
  }
  const tomorrow = getTomorrowCalendarDateAmsterdam();
  if (ymd === today) return { preset: "today", pickedYmd: ymd };
  if (ymd === tomorrow) return { preset: "tomorrow", pickedYmd: ymd };
  return { preset: "pick", pickedYmd: ymd };
}

function panelChipClass(active: boolean): string {
  return `rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-blue-600 bg-white text-blue-600 shadow-sm"
      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
  }`;
}

function MadLibsChip({
  active,
  children,
  onClick,
  tone = "neutral",
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  tone?: "deadline" | "energy" | "neutral";
}) {
  const toneClass =
    tone === "deadline"
      ? active
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-blue-100 bg-blue-50/70 text-blue-600"
      : tone === "energy"
        ? active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-emerald-100 bg-emerald-50/80 text-emerald-700"
        : active
          ? "border-gray-300 bg-gray-50 text-gray-900"
          : "border-gray-200 bg-white text-gray-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[15px] font-semibold transition-colors ${toneClass}`}
    >
      {children}
    </button>
  );
}

function padTimePart(n: number): string {
  return String(n).padStart(2, "0");
}

export default function TaskScheduleEditor({ task, onSave, onClose }: TaskScheduleEditorProps) {
  const { t } = useI18n();

  const initial = useMemo(() => initialDeadlineState(task), [task]);
  const initialScheduleTime = useMemo(() => {
    const fromDue = extractScheduleTimeFromIso(task?.dueAt);
    const fromCreated = extractScheduleTimeFromIso(task?.created_at ?? null);
    if (task.isDeadline || (task.isDeadline == null && task.dueAt && (!task.repeat || task.repeat === "none"))) {
      return fromDue;
    }
    return fromDue ?? fromCreated;
  }, [task?.dueAt, task?.created_at, task?.isDeadline, task?.repeat]);

  const initialScheduleDate = useMemo(
    () => initialScheduleDateState(task),
    [task]
  );

  const [title, setTitle] = useState(task?.title ?? "");
  const [duration, setDuration] = useState<number | null>(
    task?.duration ?? task?.estimatedDuration ?? null
  );
  const [energyLevel, setEnergyLevel] = useState<string>(task?.energyLevel ?? "medium");
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>(initial.preset);
  const [pickedYmd, setPickedYmd] = useState(initial.pickedYmd);
  const [dueAtOverride, setDueAtOverride] = useState<string | null>(task?.dueAt ?? null);
  const [scheduleTime, setScheduleTime] = useState<{ hour: number; minute: number } | null>(
    initialScheduleTime
  );
  const [repeatSelection, setRepeatSelection] = useState<TaskRepeatSelection>(() =>
    selectionFromTask(task)
  );
  const [scheduleDatePreset, setScheduleDatePreset] = useState<ScheduleDatePreset>(
    initialScheduleDate.preset
  );
  const [scheduleDateYmd, setScheduleDateYmd] = useState(initialScheduleDate.ymd);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(
    task.reminders?.length ? task.reminders[0] : null
  );
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [phraseInput, setPhraseInput] = useState("");
  const [phraseFeedback, setPhraseFeedback] = useState<string | null>(null);

  const toggleField = (field: Exclude<ActiveField, null>) => {
    setActiveField((prev) => (prev === field ? null : field));
  };

  const resolveDeadlineYmd = (): string | null => {
    if (deadlinePreset === "none") return null;
    if (deadlinePreset === "today") return getCalendarDateAmsterdam();
    if (deadlinePreset === "tomorrow") return getTomorrowCalendarDateAmsterdam();
    return pickedYmd;
  };

  const hasDeadline = deadlinePreset !== "none";
  const hasPlannedMoment = Boolean(scheduleTime) || hasDeadline;

  const selectDeadlinePreset = (preset: DeadlinePreset) => {
    setDeadlinePreset(preset);
    setDueAtOverride(null);
    if (preset === "pick" && !pickedYmd) {
      setPickedYmd(getCalendarDateAmsterdam());
    }
  };

  const resolveDueAtForDeadline = (): string | null => {
    if (!hasDeadline) return null;
    const ymd = resolveDeadlineYmd();
    if (!ymd) return null;
    if (dueAtOverride) {
      const overrideDay = parseDueCalendarDayAmsterdam(dueAtOverride);
      if (overrideDay === ymd) return dueAtOverride;
    }
    if (scheduleTime) {
      return mergeDateAndTime(ymd, scheduleTime.hour, scheduleTime.minute);
    }
    return calendarDayToDueAt(ymd);
  };

  const deadlineChipLabel = useMemo(() => {
    if (deadlinePreset === "none") return t("taskEditor.deadlineChipNone");
    if (deadlinePreset === "today") return t("taskEditor.deadlineToday").toLowerCase();
    if (deadlinePreset === "tomorrow") return t("taskEditor.deadlineTomorrow").toLowerCase();
    return t("taskEditor.deadlineChipBefore", {
      date: formatHumanDateNl(pickedYmd),
    });
  }, [deadlinePreset, pickedYmd, t]);

  const scheduleTimeChipLabel = useMemo(() => {
    if (scheduleDatePreset === "none") return t("taskEditor.scheduleChipNone");
    if (scheduleTime) return formatHumanDateNl(scheduleDateYmd, scheduleTime);
    if (scheduleDatePreset === "today") return t("taskEditor.deadlineToday").toLowerCase();
    if (scheduleDatePreset === "tomorrow") return t("taskEditor.deadlineTomorrow").toLowerCase();
    return formatHumanDateNl(scheduleDateYmd);
  }, [scheduleDatePreset, scheduleTime, scheduleDateYmd, t]);

  const selectScheduleDatePreset = (preset: ScheduleDatePreset) => {
    setScheduleDatePreset(preset);
    if (preset === "none") {
      setScheduleTime(null);
      return;
    }
    if (preset === "today") setScheduleDateYmd(getCalendarDateAmsterdam());
    if (preset === "tomorrow") setScheduleDateYmd(getTomorrowCalendarDateAmsterdam());
    if (preset === "pick" && !scheduleDateYmd) {
      setScheduleDateYmd(getCalendarDateAmsterdam());
    }
  };

  const repeatChipLabel = useMemo(() => {
    const key = repeatLabelKey({
      repeat: repeatSelection.repeat,
      repeatWeekdays: repeatSelection.repeatWeekdays,
    });
    if (!key) return t("taskEditor.repeatNone").toLowerCase();
    return t(`taskEditor.${key}`).toLowerCase();
  }, [repeatSelection, t]);

  const durationChipLabel =
    duration && duration > 0
      ? t("taskEditor.durationChip", { n: String(duration) })
      : t("taskEditor.durationChipUnset");

  const energyChipLabel =
    energyLevel === "low"
      ? t("taskEditor.enLow").toLowerCase()
      : energyLevel === "high"
        ? t("taskEditor.enHigh").toLowerCase()
        : t("taskEditor.enMed").toLowerCase();

  const reminderChipLabel = useMemo(() => {
    if (reminderMinutes === null) return t("taskEditor.reminderChipNone");
    return t("taskEditor.reminderBefore", { n: String(reminderMinutes) });
  }, [reminderMinutes, t]);

  const isOneOffRepeat = repeatSelection.repeat === "none";

  const previewRepeatLabel = useMemo(() => {
    const key = repeatLabelKey({
      repeat: repeatSelection.repeat,
      repeatWeekdays: repeatSelection.repeatWeekdays,
    });
    if (!key) return null;
    return t(`taskEditor.${key}`).toLowerCase();
  }, [repeatSelection, t]);

  const previewDeadline = useMemo(() => {
    if (!hasDeadline) return null;
    if (deadlinePreset === "today") return t("taskEditor.deadlineToday").toLowerCase();
    if (deadlinePreset === "tomorrow") return t("taskEditor.deadlineTomorrow").toLowerCase();
    return formatHumanDateNl(pickedYmd);
  }, [hasDeadline, deadlinePreset, pickedYmd, t]);

  const previewScheduleTime = useMemo(() => {
    if (scheduleDatePreset === "none") return null;
    if (scheduleTime) return formatHumanDateNl(scheduleDateYmd, scheduleTime);
    if (scheduleDatePreset === "today") return t("taskEditor.deadlineToday").toLowerCase();
    if (scheduleDatePreset === "tomorrow") return t("taskEditor.deadlineTomorrow").toLowerCase();
    return formatHumanDateNl(scheduleDateYmd);
  }, [scheduleDatePreset, scheduleTime, scheduleDateYmd, t]);

  const handleApplyPhrase = () => {
    const parsed = parseTaskSchedulePhrase(phraseInput);
    if (parsed.unrecognized) {
      setPhraseFeedback(t("taskEditor.nlpNoMatch"));
      return;
    }
    if (parsed.repeatSelection) {
      setRepeatSelection(parsed.repeatSelection);
    }
    const parsedHasExplicitDeadline =
      parsed.hasDeadline === true ||
      (parsed.deadlinePreset !== undefined && parsed.deadlinePreset !== "none");
    const parsedHasExplicitNoDeadline = parsed.hasDeadline === false;

    if (parsedHasExplicitDeadline && parsed.deadlinePreset) {
      selectDeadlinePreset(parsed.deadlinePreset);
      if (parsed.pickedYmd) setPickedYmd(parsed.pickedYmd);
      if (parsed.dueAtIso) setDueAtOverride(parsed.dueAtIso);
      setActiveField("deadline");
    } else if (
      parsedHasExplicitNoDeadline ||
      (parsed.repeatSelection || parsed.scheduleTime || parsed.weeklyAnchorYmd)
    ) {
      selectDeadlinePreset("none");
    }
    if (parsed.scheduleTime) {
      setScheduleTime(parsed.scheduleTime);
      setDueAtOverride(null);
      setActiveField("schedule");
    } else if (parsed.dueAtIso && parsed.hasDeadline === true) {
      const time = extractScheduleTimeFromIso(parsed.dueAtIso);
      if (time) setScheduleTime(time);
    }
    const parsedScheduleYmd = parsed.scheduleDateYmd ?? parsed.weeklyAnchorYmd;
    if (parsedScheduleYmd && parsed.hasDeadline !== true) {
      const today = getCalendarDateAmsterdam();
      const tomorrow = getTomorrowCalendarDateAmsterdam();
      setScheduleDateYmd(parsedScheduleYmd);
      if (parsedScheduleYmd === today) setScheduleDatePreset("today");
      else if (parsedScheduleYmd === tomorrow) setScheduleDatePreset("tomorrow");
      else setScheduleDatePreset("pick");
    }
    if (parsed.duration != null) setDuration(parsed.duration);
    if (parsed.energyLevel) setEnergyLevel(parsed.energyLevel);
    setPhraseFeedback(
      `${t("taskEditor.nlpApplied")} ${parsed.applied.join(", ")}`
    );
  };

  const handleSave = () => {
    const isDeadline = hasDeadline;
    let dueAt: string | null = null;

    if (isDeadline) {
      dueAt = resolveDueAtForDeadline();
    } else if (scheduleDatePreset !== "none" && scheduleTime) {
      dueAt = mergeDateAndTime(
        scheduleDateYmd,
        scheduleTime.hour,
        scheduleTime.minute
      );
    }

    const remindersToSave =
      reminderMinutes !== null ? [reminderMinutes] : [];

    const savePayload: TaskScheduleEditorTask = {
      ...task,
      title: title.trim() || task.title,
      dueAt,
      isDeadline,
      reminders: remindersToSave,
      repeat: repeatSelection.repeat,
      repeatWeekdays: repeatSelection.repeatWeekdays,
      duration: duration || null,
      estimatedDuration: duration || null,
      energyLevel: energyLevel || "medium",
    };

    if (scheduleDatePreset === "none" && !isDeadline) {
      savePayload.created_at = `${getCalendarDateAmsterdam()}T12:00:00.000Z`;
    } else if (scheduleTime && !isDeadline) {
      savePayload.created_at = buildCreatedAtWithScheduleTime(
        scheduleDateYmd,
        scheduleTime.hour,
        scheduleTime.minute
      );
    } else if (repeatSelection.repeat === "weekly" && scheduleDatePreset !== "none") {
      savePayload.created_at = scheduleTime
        ? buildCreatedAtWithScheduleTime(
            scheduleDateYmd,
            scheduleTime.hour,
            scheduleTime.minute
          )
        : `${scheduleDateYmd}T12:00:00.000Z`;
    }

    if (hasPlannedMoment) {
      requestNotificationPermission();
    }
    onSave(savePayload);
    onClose();
  };

  const scheduleTimeInputValue = scheduleTime
    ? `${padTimePart(scheduleTime.hour)}:${padTimePart(scheduleTime.minute)}`
    : "";

  return (
    <div className="flex max-h-[min(92dvh,820px)] w-full flex-col overflow-hidden rounded-t-3xl border border-gray-200/80 bg-white shadow-2xl sm:rounded-3xl">
      <div className="flex shrink-0 justify-center pt-3 md:hidden" aria-hidden>
        <div className="h-1 w-10 rounded-full bg-gray-300" />
      </div>

      <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3 sm:px-6 sm:pt-5">
        <h2 className="text-lg font-bold text-[#0F172A]">{t("taskEditor.title")}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label={t("taskEditor.close")}
        >
          <XMarkIcon className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
          {t("taskEditor.previewLabel")}
        </p>

        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex items-start gap-3">
            {task.priority ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] text-sm font-bold text-white">
                {task.priority}
              </div>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/80 text-sm font-bold text-white">
                ·
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="break-words text-[15px] font-bold leading-snug text-[#0F172A]">
                  {title.trim() || task.title}
                </p>
                {duration ? (
                  <span className="shrink-0 rounded-lg bg-white/80 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700">
                    {duration}m
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <EnergyDotTask energy={appEnergyToSt(energyLevel)} size={8} />
                  {energyLevel === "low"
                    ? t("taskEditor.enLow")
                    : energyLevel === "high"
                      ? t("taskEditor.enHigh")
                      : t("taskEditor.enMed")}
                </span>
                {previewScheduleTime ? (
                  <>
                    <span className="text-gray-300">·</span>
                    <span>{previewScheduleTime}</span>
                  </>
                ) : null}
                {previewDeadline ? (
                  <>
                    <span className="text-gray-300">·</span>
                    <span>{previewDeadline}</span>
                  </>
                ) : null}
                {previewRepeatLabel ? (
                  <>
                    <span className="text-gray-300">·</span>
                    <span>{previewRepeatLabel}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("taskEditor.titlePh")}
          className="mb-4 w-full border-0 bg-transparent p-0 text-xl font-bold text-[#0F172A] placeholder:text-gray-300 focus:outline-none focus:ring-0"
        />

        <p className="mb-4 text-[15px] leading-relaxed text-gray-600">
          {t("taskEditor.sentenceScheduleTime")}{" "}
          <MadLibsChip
            active={activeField === "schedule"}
            onClick={() => toggleField("schedule")}
          >
            {scheduleTimeChipLabel}
          </MadLibsChip>
          {isOneOffRepeat ? (
            <>
              ,{" "}
              <MadLibsChip
                active={activeField === "repeat"}
                onClick={() => toggleField("repeat")}
              >
                {repeatChipLabel}
              </MadLibsChip>
            </>
          ) : (
            <>
              , {t("taskEditor.sentenceRepeat")}{" "}
              <MadLibsChip
                active={activeField === "repeat"}
                onClick={() => toggleField("repeat")}
              >
                {repeatChipLabel}
              </MadLibsChip>
            </>
          )}
          , {t("taskEditor.sentenceDuration")}{" "}
          <MadLibsChip
            active={activeField === "duration"}
            onClick={() => toggleField("duration")}
          >
            {durationChipLabel}
          </MadLibsChip>{" "}
          {t("taskEditor.sentenceEnergy")}{" "}
          <MadLibsChip
            active={activeField === "energy"}
            tone="energy"
            onClick={() => toggleField("energy")}
          >
            <EnergyDotTask energy={appEnergyToSt(energyLevel)} size={8} />
            {energyChipLabel}
          </MadLibsChip>
          {hasDeadline ? (
            <>
              {t("taskEditor.sentenceDeadline")}{" "}
              <MadLibsChip
                active={activeField === "deadline"}
                tone="deadline"
                onClick={() => toggleField("deadline")}
              >
                {deadlineChipLabel}
              </MadLibsChip>
            </>
          ) : (
            <>
              ,{" "}
              <MadLibsChip
                active={activeField === "deadline"}
                tone="deadline"
                onClick={() => toggleField("deadline")}
              >
                {t("taskEditor.deadlineChipNone")}
              </MadLibsChip>
            </>
          )}
          {hasPlannedMoment ? (
            <>
              {t("taskEditor.sentenceReminder")}{" "}
              <MadLibsChip
                active={activeField === "reminder"}
                onClick={() => toggleField("reminder")}
              >
                {reminderChipLabel}
              </MadLibsChip>
            </>
          ) : null}
          .
        </p>

        {activeField === "schedule" ? (
          <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
              {t("taskEditor.panelSchedule")}
            </p>
            <p className="mb-2 text-xs font-medium text-gray-600">
              {t("taskEditor.scheduleDateLabel")}
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {(
                [
                  ...(repeatSelection.repeat !== "weekly"
                    ? ([["none", t("taskEditor.scheduleNone")]] as const)
                    : []),
                  ["today", t("taskEditor.deadlineToday")],
                  ["tomorrow", t("taskEditor.deadlineTomorrow")],
                  ["pick", t("taskEditor.deadlinePick")],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectScheduleDatePreset(key)}
                  className={panelChipClass(scheduleDatePreset === key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {scheduleDatePreset === "pick" ? (
              <input
                type="date"
                min={getCalendarDateAmsterdam()}
                value={scheduleDateYmd}
                onChange={(e) => setScheduleDateYmd(e.target.value)}
                className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            ) : null}
            {scheduleDatePreset !== "none" ? (
              <>
                <p className="mb-2 text-xs font-medium text-gray-600">
                  {t("taskEditor.scheduleTimeLabel")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={scheduleTimeInputValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) {
                        setScheduleTime(null);
                        return;
                      }
                      const [h, m] = value.split(":").map(Number);
                      if (!Number.isNaN(h) && !Number.isNaN(m)) {
                        setScheduleTime({ hour: h, minute: m });
                      }
                    }}
                    className="min-w-[8.5rem] rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setScheduleTime(null)}
                    className={panelChipClass(scheduleTime === null)}
                  >
                    {t("taskEditor.deadlineNone")}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {activeField === "deadline" ? (
          <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
              {t("taskEditor.panelDeadline")}
            </p>
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
                  onClick={() => selectDeadlinePreset(key)}
                  className={panelChipClass(deadlinePreset === key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {deadlinePreset === "pick" ? (
              <input
                type="date"
                value={pickedYmd}
                onChange={(e) => {
                  setPickedYmd(e.target.value);
                  setDueAtOverride(null);
                }}
                className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            ) : null}
          </div>
        ) : null}

        {activeField === "repeat" ? (
          <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
              {t("taskEditor.panelRepeat")}
            </p>
            <div className="flex flex-wrap gap-2">
              {REPEAT_OPTIONS.map((opt) => {
                const active =
                  repeatSelection.repeat === opt.repeat &&
                  repeatSelection.repeatWeekdays === opt.repeatWeekdays;
                return (
                  <button
                    key={opt.labelKey}
                    type="button"
                    onClick={() =>
                      setRepeatSelection({
                        repeat: opt.repeat,
                        repeatWeekdays: opt.repeatWeekdays,
                      })
                    }
                    className={panelChipClass(active)}
                  >
                    {t(`taskEditor.${opt.labelKey}`)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeField === "duration" ? (
          <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
              {t("taskEditor.panelDuration")}
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {DURATION_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDuration(mins)}
                  className={panelChipClass(duration === mins)}
                >
                  {mins} min
                </button>
              ))}
            </div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              {t("taskEditor.durationCustomLabel")}
            </label>
            <input
              type="number"
              min={1}
              max={480}
              value={duration ?? ""}
              onChange={(e) =>
                setDuration(e.target.value ? parseInt(e.target.value, 10) : null)
              }
              placeholder={t("taskEditor.durationPh")}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        ) : null}

        {activeField === "energy" ? (
          <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
              {t("taskEditor.panelEnergy")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(["low", "medium", "high"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergyLevel(level)}
                  className={`${panelChipClass(energyLevel === level)} inline-flex items-center gap-2`}
                >
                  <EnergyDotTask energy={appEnergyToSt(level)} size={10} />
                  {level === "low"
                    ? t("taskEditor.enLow")
                    : level === "medium"
                      ? t("taskEditor.enMed")
                      : t("taskEditor.enHigh")}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {activeField === "reminder" && hasPlannedMoment ? (
          <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
              {t("taskEditor.panelReminder")}
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((opt) => {
                const active = reminderMinutes === opt.minutes;
                const label =
                  opt.minutes === null
                    ? t("taskEditor.reminderNone")
                    : t("taskEditor.reminderBefore", { n: opt.n! });
                return (
                  <button
                    key={opt.minutes ?? "none"}
                    type="button"
                    onClick={() => setReminderMinutes(opt.minutes)}
                    className={panelChipClass(active)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              {t("taskEditor.reminderCustomLabel")}
            </label>
            <input
              type="number"
              min={1}
              max={1440}
              value={
                reminderMinutes != null && !isPresetReminderMinutes(reminderMinutes)
                  ? reminderMinutes
                  : ""
              }
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw) {
                  setReminderMinutes(null);
                  return;
                }
                const parsed = parseInt(raw, 10);
                if (!Number.isFinite(parsed) || parsed < 1) return;
                setReminderMinutes(Math.min(parsed, 1440));
              }}
              placeholder={t("taskEditor.reminderPh")}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        ) : null}

        <div className="mb-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 p-4">
          <p className="mb-2 text-xs font-semibold text-gray-600">
            {t("taskEditor.nlpOptionalTitle")}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={phraseInput}
              onChange={(e) => setPhraseInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyPhrase();
                }
              }}
              placeholder={t("taskEditor.nlpPlaceholder")}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="button"
              onClick={handleApplyPhrase}
              className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
            >
              {t("taskEditor.nlpApply")}
            </button>
          </div>
          {phraseFeedback ? (
            <p className="mt-2 text-xs leading-relaxed text-gray-500">{phraseFeedback}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
        >
          {t("taskEditor.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <CheckIcon className="h-4 w-4" aria-hidden />
          {t("taskEditor.save")}
        </button>
      </div>
    </div>
  );
}
