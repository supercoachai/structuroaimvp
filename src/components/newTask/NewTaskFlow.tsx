"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import EnergyIcon from "@/components/structuro/EnergyIcon";
import { useI18n } from "@/lib/i18n";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";
import {
  NEW_TASK_DURATION_PRESETS,
  NEW_TASK_ENERGIES,
  type DeadlinePickId,
  type DurationValue,
  type NewTaskEnergyLevel,
  type NewTaskFlowPayload,
  type NewTaskRepeatChoice,
  type ScheduleDatePickId,
} from "@/lib/newTask/newTaskFlowTypes";
import { resolveScheduleYmdFromPick } from "@/lib/newTask/buildTaskFromFlowPayload";
import { formatScheduleTime } from "@/lib/taskScheduleTime";
import TaskRepeatPicker, {
  type TaskRepeatSelection,
} from "@/components/tasks/TaskRepeatPicker";
import {
  DEFAULT_INTERVAL_DAYS,
  formatRepeatLabel,
} from "@/lib/taskRecurrence";
import { fetchMicroStepSuggestions } from "@/lib/ai/fetchMicroStepSuggestions";
import { microSuggestErrorMessage } from "@/lib/ai/microSuggestErrorMessage";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { captureProductEvent } from "@/lib/posthog/track";

const AUTO_ADVANCE_MS = 280;
const DONE_CLOSE_MS = 1800;
const TOTAL_STEPS = 5;

export type NewTaskFlowProps = {
  onSave: (payload: NewTaskFlowPayload) => void | Promise<void>;
  onClose?: () => void;
  mode?: "panel" | "inline";
  variant?: "default" | "compact";
  initialTitle?: string;
  className?: string;
  showClose?: boolean;
  saving?: boolean;
  /** Sla deadline-stap over (bijv. quick-add balk). */
  skipDeadline?: boolean;
  /** Sla titel-stap over (bijv. omzetten geparkeerde gedacht). */
  skipTitle?: boolean;
  /** Vult beschikbare hoogte (embedded in dagstart/swiper). */
  fillContainer?: boolean;
};

function truncateTitle(title: string | undefined | null, max = 22): string {
  const t = String(title ?? "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path
        d="M2 2L12 12M12 2L2 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckMarkIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12L10 17L19 7"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NewTaskFlow({
  onSave,
  onClose,
  mode = "panel",
  variant = "default",
  initialTitle = "",
  className = "",
  showClose = true,
  saving = false,
  skipDeadline = false,
  skipTitle = false,
  fillContainer = false,
}: NewTaskFlowProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-US" : "nl-NL";
  const hasPresetTitle = Boolean(String(initialTitle ?? "").trim());

  const [step, setStep] = useState(() =>
    skipTitle && hasPresetTitle ? 1 : 0
  );
  const [title, setTitle] = useState(() => String(initialTitle ?? ""));
  const [energy, setEnergy] = useState<NewTaskEnergyLevel | null>(null);
  const [duration, setDuration] = useState<DurationValue | null>(null);
  const [customDuration, setCustomDuration] = useState("");
  const [scheduleDatePick, setScheduleDatePick] = useState<ScheduleDatePickId>("none");
  const [scheduleCustomDate, setScheduleCustomDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState<{ hour: number; minute: number } | null>(null);
  const [deadlinePick, setDeadlinePick] = useState<DeadlinePickId>("none");
  const [customDate, setCustomDate] = useState("");
  const [repeatPick, setRepeatPick] = useState<NewTaskRepeatChoice>("none");
  const [repeatIntervalDays, setRepeatIntervalDays] =
    useState(DEFAULT_INTERVAL_DAYS);
  const [microsteps, setMicrosteps] = useState<string[]>([]);
  const [microEditing, setMicroEditing] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const microUsedAiRef = useRef(false);

  const resetFlow = useCallback(() => {
    setStep(skipTitle && hasPresetTitle ? 1 : 0);
    setTitle(String(initialTitle ?? ""));
    setEnergy(null);
    setDuration(null);
    setCustomDuration("");
    setScheduleDatePick("none");
    setScheduleCustomDate("");
    setScheduleTime(null);
    setDeadlinePick("none");
    setCustomDate("");
    setRepeatPick("none");
    setRepeatIntervalDays(DEFAULT_INTERVAL_DAYS);
    setMicrosteps([]);
    setMicroEditing(false);
    microUsedAiRef.current = false;
  }, [skipTitle, hasPresetTitle, initialTitle]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
  }, []);

  const handleRepeatChange = useCallback((choice: NewTaskRepeatChoice) => {
    setRepeatPick(choice);
    if (
      (choice === "weekly" || choice === "interval") &&
      scheduleDatePick === "none"
    ) {
      setScheduleDatePick("today");
    }
  }, [scheduleDatePick]);

  useEffect(() => {
    if (
      (repeatPick === "weekly" || repeatPick === "interval") &&
      scheduleDatePick === "none"
    ) {
      setScheduleDatePick("today");
    }
  }, [repeatPick, scheduleDatePick]);

  const energyMeta = useMemo(
    () => NEW_TASK_ENERGIES.find((e) => e.id === energy),
    [energy]
  );

  const durationText = useMemo(() => {
    if (duration == null) return null;
    if (duration === "custom") {
      const n = customDuration.trim();
      return n ? `${n} min` : null;
    }
    return `${duration} min`;
  }, [duration, customDuration]);

  const deadlinePayload = useMemo((): NewTaskFlowPayload["deadline"] => {
    if (!deadlinePick || deadlinePick === "none") return null;
    if (deadlinePick === "today") return "today";
    if (deadlinePick === "tomorrow") return "tomorrow";
    if (deadlinePick === "custom" && customDate) return customDate;
    return null;
  }, [deadlinePick, customDate]);

  const scheduleDateYmd = useMemo(
    () => resolveScheduleYmdFromPick(scheduleDatePick, scheduleCustomDate),
    [scheduleDatePick, scheduleCustomDate]
  );

  const repeatChipText = useMemo(() => {
    if (repeatPick === "none") return null;
    return formatRepeatLabel(
      {
        repeat:
          repeatPick === "interval"
            ? "interval"
            : repeatPick === "weekly"
              ? "weekly"
              : "daily",
        repeatWeekdays: repeatPick === "weekdays" ? "weekdays" : "all",
        repeatIntervalDays:
          repeatPick === "interval" ? repeatIntervalDays : undefined,
      },
      t,
      "newTask"
    );
  }, [repeatPick, repeatIntervalDays, t]);

  const scheduleChipText = useMemo(() => {
    if (scheduleDatePick === "none") return t("newTask.scheduleChipNone");
    const timeConnector = locale === "en" ? " at " : " om ";
    const timeSuffix = scheduleTime
      ? `${timeConnector}${formatScheduleTime(scheduleTime.hour, scheduleTime.minute)}`
      : "";
    let datePart: string;
    if (scheduleDatePick === "tomorrow") datePart = t("newTask.deadlineTomorrow");
    else if (scheduleDatePick === "custom" && scheduleCustomDate) {
      datePart = new Date(`${scheduleCustomDate}T12:00:00`).toLocaleDateString(dateLocale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } else datePart = t("newTask.deadlineToday");
    return `${datePart}${timeSuffix}`;
  }, [scheduleDatePick, scheduleCustomDate, scheduleTime, dateLocale, locale, t]);

  const deadlineChipText = useMemo(() => {
    if (!deadlinePick || deadlinePick === "none") return null;
    if (deadlinePick === "today") return t("newTask.deadlineToday");
    if (deadlinePick === "tomorrow") return t("newTask.deadlineTomorrow");
    if (deadlinePick === "custom" && customDate) {
      return new Date(`${customDate}T12:00:00`).toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "short",
      });
    }
    return null;
  }, [deadlinePick, customDate, dateLocale, t]);

  const microStepIndex = skipDeadline ? 3 : 4;
  const doneStepIndex = skipDeadline ? 4 : 5;
  const firstStepIndex = skipTitle ? 1 : 0;

  const scheduleAdvance = useCallback((next: number) => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => setStep(next), AUTO_ADVANCE_MS);
  }, []);

  const goBack = useCallback(() => {
    setStep((s) => {
      if (skipTitle && s === firstStepIndex) {
        onClose?.();
        return s;
      }
      if (skipDeadline && s === microStepIndex) return 2;
      return s - 1;
    });
  }, [skipDeadline, skipTitle, firstStepIndex, microStepIndex, onClose]);

  const resolvedDurationMin = useCallback((): number | null => {
    if (duration == null) return null;
    if (duration === "custom") {
      const n = parseInt(customDuration.trim(), 10);
      if (!Number.isFinite(n) || n < 1 || n > 480) return null;
      return n;
    }
    return duration;
  }, [duration, customDuration]);

  const persist = useCallback(async () => {
    const trimmed = String(title ?? "").trim();
    const mins = resolvedDurationMin();
    if (!trimmed || !energy || mins == null) return;

    const payload: NewTaskFlowPayload = {
      title: trimmed,
      energy,
      durationMin: mins,
      scheduleDate:
        skipDeadline || scheduleDatePick === "none" ? undefined : scheduleDateYmd ?? undefined,
      scheduleTime:
        skipDeadline || scheduleDatePick === "none" ? null : scheduleTime,
      deadline: skipDeadline ? null : deadlinePayload,
      microsteps: microsteps.map((s) => s.trim()).filter(Boolean),
      repeat: skipDeadline ? undefined : repeatPick,
      repeatIntervalDays:
        skipDeadline || repeatPick !== "interval"
          ? undefined
          : repeatIntervalDays,
    };

    setSaveBusy(true);
    try {
      await onSave(payload);
      const trimmedMicro = payload.microsteps;
      captureProductEvent(ANALYTICS_EVENTS.new_task_flow_completed, {
        micro_source:
          trimmedMicro.length === 0
            ? "skip"
            : microUsedAiRef.current
              ? "ai"
              : "manual",
        had_microsteps: trimmedMicro.length > 0,
        source: variant === "compact" ? "compact" : "default",
      });
      setStep(doneStepIndex);
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
      doneTimerRef.current = setTimeout(() => {
        if (mode === "inline") {
          resetFlow();
        } else {
          onClose?.();
        }
      }, DONE_CLOSE_MS);
    } catch (err) {
      console.error("NewTaskFlow save failed:", err);
    } finally {
      setSaveBusy(false);
    }
  }, [
    title,
    energy,
    resolvedDurationMin,
    scheduleDatePick,
    scheduleDateYmd,
    scheduleTime,
    deadlinePayload,
    repeatPick,
    microsteps,
    onSave,
    mode,
    variant,
    onClose,
    resetFlow,
    skipDeadline,
    doneStepIndex,
  ]);

  const busy = saving || saveBusy;
  const compact = variant === "compact";
  const embedded = fillContainer && compact;
  const skippedStepCount = (skipTitle ? 1 : 0) + (skipDeadline ? 1 : 0);
  const progressSteps = TOTAL_STEPS - skippedStepCount;
  const progressIndex =
    step - (skipTitle ? 1 : 0) - (skipDeadline && step >= microStepIndex ? 1 : 0);

  const deadlineStepReady =
    deadlinePick != null &&
    (deadlinePick !== "custom" || Boolean(customDate.trim())) &&
    (scheduleDatePick !== "custom" || Boolean(scheduleCustomDate.trim()));

  const showFooterPrimary =
    (!skipTitle && step === 0) ||
    (step === 2 && duration === "custom") ||
    (!skipDeadline && step === 3 && deadlineStepReady);

  const showMicroSubmit = step === microStepIndex && microEditing;

  return (
    <div
      className={`new-task-flow flex min-h-0 flex-col overflow-hidden bg-[var(--st-surface,#fff)] ${
        compact ? "new-task-flow--compact rounded-[20px]" : "new-task-flow--default rounded-[32px]"
      } ${fillContainer ? "new-task-flow--embedded h-full max-h-full" : ""} ${className}`}
    >
      {step < doneStepIndex ? (
        <div
          className={`new-task-flow-header flex shrink-0 items-center justify-between ${
            embedded ? "px-4 pt-2 sm:px-5" : "px-5 pt-4 sm:px-[22px] sm:pt-[18px]"
          }`}
        >
          <div className="flex flex-1 items-center gap-1.5">
            {Array.from({ length: progressSteps }).map((_, i) => (
              <div
                key={i}
                className={`new-task-flow-dot h-[3px] max-w-7 flex-1 rounded-sm transition-all duration-300 ${
                  i < progressIndex
                    ? "new-task-flow-dot--done"
                    : i === progressIndex
                      ? "new-task-flow-dot--current"
                      : ""
                }`}
              />
            ))}
          </div>
          {showClose ? (
            <button
              type="button"
              onClick={() => onClose?.()}
              className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--st-muted-2)] transition-colors hover:bg-[var(--st-surface-2,#F6F8FC)] hover:text-[var(--st-ink)]"
              aria-label={t("common.close")}
            >
              <CloseIcon />
            </button>
          ) : (
            <span className="ml-3 w-8 shrink-0" aria-hidden />
          )}
        </div>
      ) : null}

      {step >= 2 && step < doneStepIndex ? (
        <div
          className={`new-task-flow-answers flex shrink-0 flex-wrap gap-1.5 px-5 sm:px-[22px] ${
            embedded ? "min-h-0 pt-2" : "min-h-9 pt-3.5"
          }`}
        >
          {!skipTitle && String(title ?? "").trim() ? (
            <AnswerChip onClick={() => setStep(0)}>
              <span className="text-[var(--st-muted-2)]">{t("newTask.chipTask")}</span>
              <span className="font-medium">{truncateTitle(title)}</span>
            </AnswerChip>
          ) : null}
          {energyMeta && step > 1 ? (
            <AnswerChip onClick={() => setStep(1)}>
              <EnergyIcon kind={energyMeta.iconKind} size={14} color={energyMeta.color} />
              <span>{t(`newTask.${energyMeta.labelKey}`)}</span>
            </AnswerChip>
          ) : null}
          {durationText && step > 2 ? (
            <AnswerChip onClick={() => setStep(2)}>
              <span>{durationText}</span>
            </AnswerChip>
          ) : null}
          {!skipDeadline && step > 3 ? (
            <AnswerChip onClick={() => setStep(3)}>
              <span>{scheduleChipText}</span>
            </AnswerChip>
          ) : null}
          {!skipDeadline && deadlineChipText && step > 3 ? (
            <AnswerChip onClick={() => setStep(3)}>
              <span>{deadlineChipText}</span>
            </AnswerChip>
          ) : null}
          {!skipDeadline && repeatChipText && step > 3 ? (
            <AnswerChip onClick={() => setStep(3)}>
              <span>{repeatChipText}</span>
            </AnswerChip>
          ) : null}
        </div>
      ) : null}

      <div
        className={`new-task-flow-stage flex flex-col px-5 sm:px-6 ${
          embedded || (compact && !fillContainer)
            ? "min-h-0 shrink-0 justify-start overflow-visible py-1"
            : "min-h-0 flex-1 justify-center overflow-y-auto overflow-x-hidden py-4 sm:py-5"
        } ${compact && !embedded && fillContainer ? "py-3" : ""}`}
      >
        {!skipTitle && step === 0 ? (
          <StepTitle
            title={title}
            onTitleChange={setTitle}
            onNext={() => {
              if (String(title ?? "").trim()) setStep(1);
            }}
            compact={compact}
          />
        ) : null}

        {step === 1 ? (
          <StepEnergy
            value={energy}
            onPick={(id) => {
              setEnergy(id);
              scheduleAdvance(2);
            }}
            compact={compact}
            embedded={embedded}
          />
        ) : null}

        {step === 2 ? (
          <StepDuration
            value={duration}
            customValue={customDuration}
            onPick={(v) => {
              setDuration(v);
              if (v !== "custom") scheduleAdvance(skipDeadline ? 4 : 3);
            }}
            onCustomChange={setCustomDuration}
            compact={compact}
          />
        ) : null}

        {!skipDeadline && step === 3 ? (
          <StepDeadline
            scheduleDatePick={scheduleDatePick}
            scheduleCustomDate={scheduleCustomDate}
            scheduleTime={scheduleTime}
            onScheduleDatePick={setScheduleDatePick}
            onScheduleCustomChange={setScheduleCustomDate}
            onScheduleTimeChange={setScheduleTime}
            value={deadlinePick}
            customDate={customDate}
            repeatPick={repeatPick}
            repeatIntervalDays={repeatIntervalDays}
            onPick={setDeadlinePick}
            onCustomChange={setCustomDate}
            onRepeatChange={handleRepeatChange}
            onRepeatIntervalDaysChange={setRepeatIntervalDays}
            compact={compact}
          />
        ) : null}

        {step === microStepIndex ? (
          <StepMicro
            title={title}
            energy={energy}
            durationMin={resolvedDurationMin()}
            microsteps={microsteps}
            setMicrosteps={setMicrosteps}
            editing={microEditing}
            setEditing={setMicroEditing}
            onSave={() => void persist()}
            busy={busy}
            compact={compact}
            embedded={embedded}
            onAiUsed={() => {
              microUsedAiRef.current = true;
            }}
          />
        ) : null}

        {step === doneStepIndex ? (
          <StepDone
            title={title}
            deadlineText={deadlineChipText}
            compact={compact}
          />
        ) : null}
      </div>

      {step < doneStepIndex ? (
        <div
          className={`new-task-flow-footer flex shrink-0 items-center justify-between px-5 sm:px-6 ${
            embedded ? "pb-3 pt-2" : "pb-6 pt-4 sm:pb-7"
          }`}
        >
          {step > firstStepIndex ? (
            <button
              type="button"
              onClick={goBack}
              className="new-task-flow-link rounded-full px-3.5 py-2 text-sm text-[var(--st-muted)] transition-colors hover:text-[var(--st-ink)]"
            >
              {t("newTask.back")}
            </button>
          ) : (
            <span />
          )}

          {!skipTitle && step === 0 ? (
            <button
              type="button"
              disabled={!String(title ?? "").trim()}
              onClick={() => {
                if (String(title ?? "").trim()) setStep(1);
              }}
              className="new-task-flow-link new-task-flow-link--primary rounded-full px-3.5 py-2 text-sm font-medium text-[var(--st-blue)] disabled:pointer-events-none disabled:opacity-35"
            >
              {t("newTask.continue")}
            </button>
          ) : null}

          {step === 2 && duration === "custom" ? (
            <button
              type="button"
              disabled={!customDuration.trim() || resolvedDurationMin() == null}
              onClick={() =>
                resolvedDurationMin() != null && setStep(skipDeadline ? 4 : 3)
              }
              className="new-task-flow-link new-task-flow-link--primary rounded-full px-3.5 py-2 text-sm font-medium text-[var(--st-blue)] disabled:pointer-events-none disabled:opacity-35"
            >
              {t("newTask.continue")}
            </button>
          ) : null}

          {!skipDeadline && step === 3 && deadlineStepReady ? (
            <button
              type="button"
              onClick={() => setStep(4)}
              className="new-task-flow-link new-task-flow-link--primary rounded-full px-3.5 py-2 text-sm font-medium text-[var(--st-blue)]"
            >
              {t("newTask.continue")}
            </button>
          ) : null}

          {showMicroSubmit ? (
            <button
              type="button"
              onClick={() => void persist()}
              disabled={busy}
              className="new-task-flow-link new-task-flow-link--primary ml-auto rounded-full px-3.5 py-2 text-sm font-medium text-[var(--st-blue)] disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? t("newTask.saving") : t("newTask.submit")}
            </button>
          ) : null}

          {!showFooterPrimary && !showMicroSubmit ? <span /> : null}
        </div>
      ) : null}
    </div>
  );
}

function AnswerChip({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="new-task-flow-chip inline-flex items-center gap-1.5 rounded-full border border-[var(--st-line)] bg-[var(--st-surface-2,#F6F8FC)] px-2.5 py-1.5 text-xs font-medium text-[var(--st-ink-soft,#2C3753)] transition-colors hover:border-[var(--st-line-strong)] hover:bg-white hover:text-[var(--st-ink)]"
    >
      {children}
    </button>
  );
}

function StepEyebrow({ children, embedded }: { children: ReactNode; embedded?: boolean }) {
  return (
    <p
      className={`new-task-flow-eyebrow font-medium uppercase tracking-[0.22em] text-[var(--st-muted-2)] ${
        embedded ? "mb-1.5 text-[10px]" : "mb-3 text-[11px]"
      }`}
    >
      {children}
    </p>
  );
}

function StepQuestion({
  children,
  compact,
  embedded,
}: {
  children: ReactNode;
  compact?: boolean;
  embedded?: boolean;
}) {
  return (
    <h2
      className={`new-task-flow-q m-0 font-medium leading-tight tracking-tight text-[var(--st-ink)] ${
        embedded
          ? "mb-3 text-[1.2rem]"
          : compact
            ? "mb-6 text-[clamp(1.25rem,5vw,1.5rem)]"
            : "mb-6 text-[clamp(1.35rem,5.5vw,1.625rem)]"
      }`}
    >
      {children}
    </h2>
  );
}

function StepTitle({
  title,
  onTitleChange,
  onNext,
  compact,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  onNext: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => ref.current?.focus(), 200);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="new-task-flow-step w-full">
      <StepEyebrow>{t("newTask.eyebrowNew")}</StepEyebrow>
      <StepQuestion compact={compact}>{t("newTask.qTitle")}</StepQuestion>
      <input
        ref={ref}
        className="new-task-flow-input w-full border-0 border-b-[1.5px] border-[var(--st-line-strong)] bg-transparent px-1 py-3.5 text-xl font-medium tracking-tight text-[var(--st-ink)] outline-none transition-colors placeholder:font-normal placeholder:text-[var(--st-muted-2)] focus:border-[var(--st-blue)]"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onNext();
          }
        }}
        placeholder={t("newTask.titlePh")}
      />
    </div>
  );
}

function StepEnergy({
  value,
  onPick,
  compact,
  embedded,
}: {
  value: NewTaskEnergyLevel | null;
  onPick: (id: NewTaskEnergyLevel) => void;
  compact?: boolean;
  embedded?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="new-task-flow-step w-full">
      <StepEyebrow embedded={embedded}>{t("newTask.eyebrowEnergy")}</StepEyebrow>
      <StepQuestion compact={compact} embedded={embedded}>
        {t("newTask.qEnergy")}
      </StepQuestion>
      <div className={`grid grid-cols-3 ${embedded ? "gap-1.5" : "gap-2.5"}`}>
        {NEW_TASK_ENERGIES.map((e) => {
          const active = value === e.id;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onPick(e.id)}
              className={`flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-px hover:bg-white active:scale-[0.98] ${
                embedded
                  ? "gap-1 rounded-[14px] border px-1 py-2.5"
                  : "gap-2.5 rounded-[18px] border px-2 py-4"
              }`}
              style={{
                background: active ? e.haze : "var(--st-surface-2,#F6F8FC)",
                borderColor: active ? e.color : "var(--st-line)",
                boxShadow: active ? `0 8px 22px -10px ${e.color}55` : "none",
                transform: active ? "translateY(-2px)" : "none",
              }}
            >
              <EnergyIcon
                kind={e.iconKind}
                size={embedded ? 26 : compact ? 30 : 36}
                color={e.color}
              />
              <span
                className={`font-medium tracking-tight ${embedded ? "text-xs leading-tight" : "text-sm"}`}
                style={{ color: active ? e.color : "var(--st-ink)" }}
              >
                {t(`newTask.${e.labelKey}`)}
              </span>
              <span
                className={`leading-tight text-[var(--st-muted-2)] ${
                  embedded ? "text-[9px]" : "-mt-1 text-[11px]"
                }`}
              >
                {t(`newTask.${e.subKey}`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepDuration({
  value,
  customValue,
  onPick,
  onCustomChange,
  compact,
}: {
  value: DurationValue | null;
  customValue: string;
  onPick: (v: DurationValue) => void;
  onCustomChange: (v: string) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== "custom") return;
    const id = window.setTimeout(() => ref.current?.focus(), 200);
    return () => window.clearTimeout(id);
  }, [value]);

  return (
    <div className="new-task-flow-step w-full">
      <StepEyebrow>{t("newTask.eyebrowTime")}</StepEyebrow>
      <StepQuestion compact={compact}>{t("newTask.qDuration")}</StepQuestion>
      <div className="mb-2 flex flex-wrap gap-2">
        {NEW_TASK_DURATION_PRESETS.map((d) => {
          const active = value === d.value;
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => onPick(d.value)}
              className="rounded-[14px] border px-4 py-3 text-[15px] font-medium transition-all"
              style={{
                background: active ? "var(--st-blue-haze)" : "var(--st-surface-2,#F6F8FC)",
                borderColor: active ? "var(--st-blue)" : "var(--st-line)",
                color: active ? "var(--st-blue)" : "var(--st-ink)",
                fontWeight: active ? 600 : 500,
              }}
            >
              {t(`newTask.${d.labelKey}`)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onPick("custom")}
          className="rounded-[14px] border border-dashed px-4 py-3 text-[15px] transition-all"
          style={{
            background: value === "custom" ? "white" : "transparent",
            borderColor: value === "custom" ? "var(--st-blue)" : "var(--st-line-strong)",
            color: value === "custom" ? "var(--st-blue)" : "var(--st-muted)",
          }}
        >
          {t("newTask.durCustom")}
        </button>
      </div>
      {value === "custom" ? (
        <input
          ref={ref}
          type="number"
          inputMode="numeric"
          min={1}
          max={480}
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder={t("newTask.customMinPh")}
          className="new-task-flow-input mt-3.5 w-full border-0 border-b-[1.5px] border-[var(--st-line-strong)] bg-transparent px-1 py-3 text-lg font-medium text-[var(--st-ink)] outline-none focus:border-[var(--st-blue)]"
        />
      ) : null}
    </div>
  );
}

function newTaskRepeatToSelection(
  choice: NewTaskRepeatChoice,
  intervalDays: number
): TaskRepeatSelection {
  if (choice === "weekly") {
    return { repeat: "weekly", repeatWeekdays: "all", repeatAnchor: "planned" };
  }
  if (choice === "interval") {
    return {
      repeat: "interval",
      repeatWeekdays: "all",
      repeatAnchor: "completion",
      repeatIntervalDays: intervalDays,
    };
  }
  if (choice === "weekdays") return { repeat: "daily", repeatWeekdays: "weekdays" };
  if (choice === "daily") return { repeat: "daily", repeatWeekdays: "all" };
  return { repeat: "none", repeatWeekdays: "all" };
}

function selectionToNewTaskRepeat(selection: TaskRepeatSelection): NewTaskRepeatChoice {
  if (selection.repeat === "interval") return "interval";
  if (selection.repeat === "weekly") return "weekly";
  if (selection.repeat === "daily" && selection.repeatWeekdays === "weekdays") {
    return "weekdays";
  }
  if (selection.repeat === "daily") return "daily";
  return "none";
}

type PlanField = "scheduleDate" | "deadline" | "repeat";

function FlowMadLibsChip({
  active,
  children,
  onClick,
  tone = "neutral",
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  tone?: "deadline" | "neutral";
}) {
  const toneClass =
    tone === "deadline"
      ? active
        ? "border-[var(--st-blue)] bg-[var(--st-blue-haze)] text-[var(--st-blue)]"
        : "border-[var(--st-blue)]/35 bg-[var(--st-blue-haze)]/50 text-[var(--st-blue)]"
      : active
        ? "border-[var(--st-line-strong)] bg-white text-[var(--st-ink)] shadow-sm"
        : "border-[var(--st-line)] bg-[var(--st-surface-2,#F6F8FC)] text-[var(--st-ink-soft,#2C3753)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-[10px] border px-2.5 py-0.5 text-[15px] font-semibold transition-colors ${toneClass}`}
    >
      {children}
    </button>
  );
}

function StepDeadline({
  scheduleDatePick,
  scheduleCustomDate,
  scheduleTime,
  onScheduleDatePick,
  onScheduleCustomChange,
  onScheduleTimeChange,
  value,
  customDate,
  repeatPick,
  repeatIntervalDays,
  onPick,
  onCustomChange,
  onRepeatChange,
  onRepeatIntervalDaysChange,
  compact,
}: {
  scheduleDatePick: ScheduleDatePickId;
  scheduleCustomDate: string;
  scheduleTime: { hour: number; minute: number } | null;
  onScheduleDatePick: (id: ScheduleDatePickId) => void;
  onScheduleCustomChange: (v: string) => void;
  onScheduleTimeChange: (time: { hour: number; minute: number } | null) => void;
  value: DeadlinePickId | null;
  customDate: string;
  repeatPick: NewTaskRepeatChoice;
  repeatIntervalDays: number;
  onPick: (id: DeadlinePickId) => void;
  onCustomChange: (v: string) => void;
  onRepeatChange: (choice: NewTaskRepeatChoice) => void;
  onRepeatIntervalDaysChange: (days: number) => void;
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-US" : "nl-NL";
  const todayMin = getCalendarDateAmsterdam();
  const [activeField, setActiveField] = useState<PlanField>("scheduleDate");
  const scheduleTimeInputValue = scheduleTime
    ? `${String(scheduleTime.hour).padStart(2, "0")}:${String(scheduleTime.minute).padStart(2, "0")}`
    : "";

  const toggleField = (field: PlanField) => {
    setActiveField(field);
  };

  const hasDeadline = value != null && value !== "none";
  const isOneOffRepeat = repeatPick === "none";

  const deadlineChipLabel = useMemo(() => {
    if (value == null) return t("newTask.deadlineChipUnset");
    if (value === "none") return t("newTask.deadlineChipNone");
    if (value === "today") return t("newTask.deadlineToday").toLowerCase();
    if (value === "tomorrow") return t("newTask.deadlineTomorrow").toLowerCase();
    if (value === "custom" && customDate) {
      return new Date(`${customDate}T12:00:00`).toLocaleDateString(dateLocale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
    return t("newTask.deadlineCustom").toLowerCase();
  }, [value, customDate, dateLocale, t]);

  const scheduleDateChipLabel = useMemo(() => {
    if (scheduleDatePick === "none") return t("newTask.scheduleChipNone");
    const timeConnector = locale === "en" ? " at " : " om ";
    const timeSuffix = scheduleTime
      ? `${timeConnector}${formatScheduleTime(scheduleTime.hour, scheduleTime.minute)}`
      : "";
    let datePart: string;
    if (scheduleDatePick === "tomorrow") {
      datePart = t("newTask.deadlineTomorrow").toLowerCase();
    } else if (scheduleDatePick === "custom" && scheduleCustomDate) {
      datePart = new Date(`${scheduleCustomDate}T12:00:00`).toLocaleDateString(dateLocale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } else {
      datePart = t("newTask.deadlineToday").toLowerCase();
    }
    return `${datePart}${timeSuffix}`;
  }, [scheduleDatePick, scheduleCustomDate, scheduleTime, dateLocale, locale, t]);

  const repeatChipLabel = useMemo(() => {
    if (repeatPick === "none") return t("newTask.repeatNone").toLowerCase();
    const label = formatRepeatLabel(
      {
        repeat:
          repeatPick === "interval"
            ? "interval"
            : repeatPick === "weekly"
              ? "weekly"
              : "daily",
        repeatWeekdays: repeatPick === "weekdays" ? "weekdays" : "all",
        repeatIntervalDays:
          repeatPick === "interval" ? repeatIntervalDays : undefined,
      },
      t,
      "newTask"
    );
    return (label ?? t("newTask.repeatNone")).toLowerCase();
  }, [repeatPick, repeatIntervalDays, t]);

  const deadlineOptions: { id: DeadlinePickId; labelKey: string }[] = [
    { id: "none", labelKey: "deadlineNone" },
    { id: "today", labelKey: "deadlineToday" },
    { id: "tomorrow", labelKey: "deadlineTomorrow" },
    { id: "custom", labelKey: "deadlineCustom" },
  ];

  const scheduleDateOptions: { id: ScheduleDatePickId; labelKey: string }[] = [
    ...(repeatPick !== "weekly" && repeatPick !== "interval"
      ? [{ id: "none" as const, labelKey: "scheduleNone" }]
      : []),
    { id: "today", labelKey: "deadlineToday" },
    { id: "tomorrow", labelKey: "deadlineTomorrow" },
    { id: "custom", labelKey: "scheduleDateCustom" },
  ];

  const handleScheduleDatePick = (id: ScheduleDatePickId) => {
    onScheduleDatePick(id);
    if (id === "none") onScheduleTimeChange(null);
  };

  const scheduleDateChipButton = (
    <FlowMadLibsChip
      active={activeField === "scheduleDate"}
      onClick={() => toggleField("scheduleDate")}
    >
      {scheduleDateChipLabel}
    </FlowMadLibsChip>
  );

  const deadlineChipButton = (
    <FlowMadLibsChip
      active={activeField === "deadline"}
      tone="deadline"
      onClick={() => toggleField("deadline")}
    >
      {deadlineChipLabel}
    </FlowMadLibsChip>
  );

  const repeatChipButton = (
    <FlowMadLibsChip
      active={activeField === "repeat"}
      onClick={() => toggleField("repeat")}
    >
      {repeatChipLabel}
    </FlowMadLibsChip>
  );

  return (
    <div className="new-task-flow-step w-full">
      <StepEyebrow>{t("newTask.eyebrowPlan")}</StepEyebrow>
      <StepQuestion compact={compact}>{t("newTask.qPlan")}</StepQuestion>
      <p className="mb-4 text-[15px] leading-relaxed text-[var(--st-muted)]">
        {t("newTask.sentenceScheduleDatePrefix")}
        {scheduleDateChipButton}
        {hasDeadline ? (
          <>
            {t("newTask.sentenceDeadlinePrefix")}
            {deadlineChipButton}
          </>
        ) : (
          <>, {deadlineChipButton}</>
        )}
        {isOneOffRepeat ? (
          <>, {repeatChipButton}</>
        ) : (
          <>
            , {t("newTask.sentenceRepeat")} {repeatChipButton}
          </>
        )}
        .
      </p>

      {activeField === "scheduleDate" ? (
        <div className="mb-3 rounded-[16px] border border-[var(--st-line)] bg-[var(--st-surface-2,#F6F8FC)]/80 p-3.5">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-muted-2)]">
            {t("newTask.panelScheduleDate")}
          </p>
          <div className="flex flex-wrap gap-2">
            {scheduleDateOptions.map((d) => {
              const active = scheduleDatePick === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleScheduleDatePick(d.id)}
                  className="rounded-[14px] border px-4 py-2.5 text-sm font-medium transition-all"
                  style={{
                    background: active ? "var(--st-blue-haze)" : "white",
                    borderColor: active ? "var(--st-blue)" : "var(--st-line)",
                    color: active ? "var(--st-blue)" : "var(--st-ink)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {t(`newTask.${d.labelKey}`)}
                </button>
              );
            })}
          </div>
          {scheduleDatePick === "custom" ? (
            <div className="new-task-flow-date mt-3 rounded-[12px] bg-white p-3">
              <input
                type="date"
                min={todayMin}
                value={scheduleCustomDate}
                onChange={(e) => onScheduleCustomChange(e.target.value)}
                className="w-full rounded-[10px] border border-[var(--st-line-strong)] bg-white px-3 py-2.5 text-sm text-[var(--st-ink)] outline-none"
              />
            </div>
          ) : null}
          {scheduleDatePick !== "none" ? (
            <>
              <p className="mb-2 mt-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-muted-2)]">
                {t("taskEditor.scheduleTimeLabel")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={scheduleTimeInputValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      onScheduleTimeChange(null);
                      return;
                    }
                    const [h, m] = v.split(":").map(Number);
                    if (!Number.isNaN(h) && !Number.isNaN(m)) {
                      onScheduleTimeChange({ hour: h, minute: m });
                    }
                  }}
                  className="min-w-[8.5rem] rounded-[10px] border border-[var(--st-line-strong)] bg-white px-3 py-2.5 text-sm text-[var(--st-ink)] outline-none"
                />
                <button
                  type="button"
                  onClick={() => onScheduleTimeChange(null)}
                  className="rounded-[12px] border px-3.5 py-2.5 text-sm font-medium transition-all"
                  style={{
                    background: scheduleTime === null ? "var(--st-blue-haze)" : "white",
                    borderColor: scheduleTime === null ? "var(--st-blue)" : "var(--st-line)",
                    color: scheduleTime === null ? "var(--st-blue)" : "var(--st-ink)",
                  }}
                >
                  {t("newTask.deadlineNone")}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {activeField === "deadline" ? (
        <div className="mb-3 rounded-[16px] border border-[var(--st-line)] bg-[var(--st-surface-2,#F6F8FC)]/80 p-3.5">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-muted-2)]">
            {t("newTask.panelDeadline")}
          </p>
          <div className="flex flex-wrap gap-2">
            {deadlineOptions.map((d) => {
              const active = value === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onPick(d.id)}
                  className="rounded-[14px] border px-4 py-2.5 text-sm font-medium transition-all"
                  style={{
                    background: active ? "var(--st-blue-haze)" : "white",
                    borderColor: active ? "var(--st-blue)" : "var(--st-line)",
                    color: active ? "var(--st-blue)" : "var(--st-ink)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {t(`newTask.${d.labelKey}`)}
                </button>
              );
            })}
          </div>
          {value === "custom" ? (
            <div className="new-task-flow-date mt-3 rounded-[12px] bg-white p-3">
              <input
                type="date"
                min={todayMin}
                value={customDate}
                onChange={(e) => onCustomChange(e.target.value)}
                className="w-full rounded-[10px] border border-[var(--st-line-strong)] bg-white px-3 py-2.5 text-sm text-[var(--st-ink)] outline-none"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-[16px] border border-[var(--st-line)] bg-[var(--st-surface-2,#F6F8FC)]/80 p-3.5">
        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--st-muted-2)]">
          {t("newTask.panelRepeat")}
        </p>
        <TaskRepeatPicker
          compact
          labelPrefix="newTask"
          value={newTaskRepeatToSelection(repeatPick, repeatIntervalDays)}
          onChange={(selection) => {
            const choice = selectionToNewTaskRepeat(selection);
            onRepeatChange(choice);
            if (
              (selection.repeat === "weekly" || selection.repeat === "interval") &&
              scheduleDatePick === "none"
            ) {
              onScheduleDatePick("today");
            }
            if (
              selection.repeat === "interval" &&
              selection.repeatIntervalDays != null
            ) {
              onRepeatIntervalDaysChange(selection.repeatIntervalDays);
            }
          }}
        />
      </div>
    </div>
  );
}

function StepMicro({
  title,
  energy,
  durationMin,
  microsteps,
  setMicrosteps,
  editing,
  setEditing,
  onSave,
  busy,
  compact,
  embedded,
  onAiUsed,
}: {
  title: string;
  energy: NewTaskEnergyLevel | null;
  durationMin: number | null;
  microsteps: string[];
  setMicrosteps: (v: string[]) => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  onSave: () => void;
  busy: boolean;
  compact?: boolean;
  embedded?: boolean;
  onAiUsed?: () => void;
}) {
  const { t, locale } = useI18n();
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const focusFirstMicroInput = () => {
    window.setTimeout(() => {
      document.querySelectorAll<HTMLInputElement>(".new-task-micro-input")[0]?.focus();
    }, 50);
  };

  const startManualMicro = () => {
    setSuggestError(null);
    setMicrosteps([""]);
    setEditing(true);
    focusFirstMicroInput();
  };

  const requestSuggestions = useCallback(async () => {
    const trimmedTitle = String(title ?? "").trim();
    if (!trimmedTitle) return;

    setSuggestLoading(true);
    setSuggestError(null);
    try {
      const result = await fetchMicroStepSuggestions({
        title: trimmedTitle,
        energyLevel: energy,
        durationMin: durationMin,
        locale: locale === "en" ? "en" : "nl",
      });
      onAiUsed?.();
      setMicrosteps(result.steps);
      setEditing(true);
    } catch (error) {
      setSuggestError(microSuggestErrorMessage(error, t));
      setEditing(true);
      if (microsteps.length === 0) {
        setMicrosteps([""]);
      }
    } finally {
      setSuggestLoading(false);
    }
  }, [
    title,
    energy,
    durationMin,
    locale,
    microsteps.length,
    setMicrosteps,
    setEditing,
    onAiUsed,
    t,
  ]);

  const addStep = () => {
    setMicrosteps([...microsteps, ""]);
    setEditing(true);
    window.setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>(".new-task-micro-input");
      inputs[inputs.length - 1]?.focus();
    }, 50);
  };

  const updateStep = (i: number, val: string) => {
    const next = [...microsteps];
    next[i] = val;
    setMicrosteps(next);
  };

  const removeStep = (i: number) => {
    const next = microsteps.filter((_, idx) => idx !== i);
    setMicrosteps(next);
    if (next.length === 0) setEditing(false);
  };

  if (!editing) {
    return (
      <div className="new-task-flow-step w-full">
        <StepEyebrow embedded={embedded}>{t("newTask.eyebrowSplit")}</StepEyebrow>
        <StepQuestion compact={compact} embedded={embedded}>
          {t("newTask.qMicro")}
        </StepQuestion>
        <p
          className={`leading-relaxed text-[var(--st-muted)] ${
            embedded ? "mb-2.5 text-xs" : "mb-6 text-[13.5px]"
          }`}
        >
          {t("newTask.microHint")}
        </p>
        <div className={`grid grid-cols-2 ${embedded ? "gap-2" : "gap-2.5"}`}>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={busy}
            className={`flex flex-col items-center gap-0.5 rounded-[18px] border border-[var(--st-line)] bg-[var(--st-surface-2,#F6F8FC)] transition-all hover:bg-white disabled:opacity-50 ${
              embedded ? "px-2 py-3" : "gap-1 px-3 py-5"
            }`}
          >
            <span className={`font-medium text-[var(--st-ink)] ${embedded ? "text-sm" : "text-base"}`}>
              {t("newTask.microNo")}
            </span>
            <span className={`text-[var(--st-muted-2)] ${embedded ? "text-[10px]" : "text-[11px]"}`}>
              {t("newTask.microNoSub")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => void requestSuggestions()}
            disabled={suggestLoading || busy}
            className={`flex flex-col items-center gap-0.5 rounded-[18px] border border-[var(--st-blue)] bg-[var(--st-blue-haze)] transition-all disabled:opacity-60 ${
              embedded ? "px-2 py-3" : "gap-1 px-3 py-5"
            }`}
          >
            <span className={`font-medium text-[var(--st-blue)] ${embedded ? "text-sm" : "text-base"}`}>
              {suggestLoading ? t("newTask.microSuggestLoading") : t("newTask.microYes")}
            </span>
            <span className={`text-[var(--st-muted-2)] ${embedded ? "text-[10px]" : "text-[11px]"}`}>
              {t("newTask.microSuggestBtn")}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={startManualMicro}
          disabled={busy}
          className={`mt-2.5 flex w-full flex-col items-center gap-0.5 rounded-[18px] border border-[var(--st-line)] bg-white transition-all hover:border-[var(--st-line-strong)] disabled:opacity-50 ${
            embedded ? "px-2 py-3" : "gap-1 px-3 py-4"
          }`}
        >
          <span className={`font-medium text-[var(--st-ink)] ${embedded ? "text-sm" : "text-base"}`}>
            {t("newTask.microSuggestManual")}
          </span>
          <span className={`text-[var(--st-muted-2)] ${embedded ? "text-[10px]" : "text-[11px]"}`}>
            {t("newTask.microManualSub")}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="new-task-flow-step w-full">
      <StepEyebrow embedded={embedded}>{t("newTask.eyebrowMicro")}</StepEyebrow>
      <StepQuestion compact={compact} embedded={embedded}>
        {t("newTask.qMicroFirst")}
      </StepQuestion>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void requestSuggestions()}
          disabled={suggestLoading || busy}
          className="rounded-xl border border-[var(--st-blue)] bg-[var(--st-blue-haze)] px-3.5 py-2 text-[13px] font-semibold text-[var(--st-blue)] transition-colors hover:bg-white disabled:opacity-60"
        >
          {suggestLoading ? t("newTask.microSuggestLoading") : t("newTask.microSuggestAgain")}
        </button>
        <button
          type="button"
          onClick={startManualMicro}
          className="rounded-xl border border-[var(--st-line)] bg-white px-3.5 py-2 text-[13px] font-medium text-[var(--st-muted)] transition-colors hover:border-[var(--st-line-strong)]"
        >
          {t("newTask.microSuggestManual")}
        </button>
      </div>

      {suggestError ? (
        <p className="mb-3 text-[13px] leading-relaxed text-[var(--st-red-deep,#EF4444)]">
          {suggestError}
        </p>
      ) : null}

      <div className="mb-3.5 flex flex-col gap-1.5">
        {microsteps.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 rounded-xl border border-[var(--st-line)] bg-[var(--st-surface-2,#F6F8FC)] px-3 py-2.5"
          >
            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-[var(--st-line-strong)] bg-white font-mono text-[11px] font-medium text-[var(--st-muted)]">
              {i + 1}
            </span>
            <input
              className="new-task-micro-input min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--st-ink)] outline-none placeholder:text-[var(--st-muted-2)]"
              value={s}
              onChange={(e) => updateStep(i, e.target.value)}
              placeholder={i === 0 ? t("newTask.microPhFirst") : t("newTask.microPhNext")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && s.trim()) addStep();
              }}
            />
            <button
              type="button"
              onClick={() => removeStep(i)}
              className="shrink-0 p-1 text-[var(--st-muted-2)] transition-colors hover:text-[var(--st-red-deep,#EF4444)]"
              aria-label={t("common.close")}
            >
              <CloseIcon />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addStep}
          className="rounded-xl border border-dashed border-[var(--st-line-strong)] px-3.5 py-2.5 text-center text-[13.5px] font-medium text-[var(--st-muted)] transition-colors hover:border-[var(--st-blue)] hover:bg-[var(--st-blue-haze)] hover:text-[var(--st-blue)]"
        >
          {t("newTask.microAddStep")}
        </button>
      </div>
    </div>
  );
}

function StepDone({
  title,
  deadlineText,
  compact,
}: {
  title: string;
  deadlineText?: string | null;
  compact?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="new-task-flow-done flex flex-col items-center justify-center gap-5 py-6 text-center">
      <div className="new-task-flow-done-check flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[var(--st-green)] shadow-[0_12px_30px_-10px_rgba(34,197,94,0.5)]">
        <CheckMarkIcon />
      </div>
      <div>
        <h2
          className={`m-0 mb-1.5 font-medium tracking-tight text-[var(--st-ink)] ${
            compact ? "text-xl" : "text-[22px]"
          }`}
        >
          {t("newTask.doneTitle")}
        </h2>
        <p className="m-0 max-w-[280px] text-sm text-[var(--st-muted)]">
          {deadlineText
            ? t("newTask.doneBodyWithDeadline", {
                title: truncateTitle(title, 40),
                deadline: deadlineText,
              })
            : t("newTask.doneBody", { title: truncateTitle(title, 40) })}
        </p>
      </div>
    </div>
  );
}
