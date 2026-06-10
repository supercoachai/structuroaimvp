"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { type MicroStep } from "@/lib/microSteps";
import { useI18n } from "@/lib/i18n";
import FocusMicroAiSuggest from "@/components/focus/FocusMicroAiSuggest";

type FocusMicroStepsCardProps = {
  taskId: string;
  taskTitle: string;
  steps: MicroStep[];
  activeStepIdx: number;
  energyLevel?: string | null;
  durationMin?: number | null;
  inlineNewStep: string;
  onInlineNewStepChange: (value: string) => void;
  onInlineAddStep: () => void;
  onToggleStep: (stepId: string) => void;
  onApplyAiSteps: (steps: MicroStep[]) => void | Promise<void>;
  microUndoSnapshot?: MicroStep[] | null;
  onUndo?: () => void;
  inputDisabled?: boolean;
  aiDisabled?: boolean;
  inputPlaceholder?: string;
  className?: string;
  headerAction?: ReactNode;
  defaultExpanded?: boolean;
};

export default function FocusMicroStepsCard({
  taskId,
  taskTitle,
  steps,
  activeStepIdx,
  energyLevel,
  durationMin,
  inlineNewStep,
  onInlineNewStepChange,
  onInlineAddStep,
  onToggleStep,
  onApplyAiSteps,
  microUndoSnapshot,
  onUndo,
  inputDisabled = false,
  aiDisabled = false,
  inputPlaceholder,
  className = "",
  headerAction,
  defaultExpanded = false,
}: FocusMicroStepsCardProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const completedStepsCount = steps.filter((step) => step.done).length;

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [taskId, defaultExpanded]);

  const summaryLabel =
    steps.length > 0
      ? t("focus.stepsProgress", {
          done: String(completedStepsCount),
          total: String(steps.length),
        })
      : t("focus.microSummaryEmpty");

  return (
    <div
      className={`focus-screen__micro-card${
        expanded ? "" : " focus-screen__micro-card--collapsed"
      } ${className}`.trim()}
    >
      <div className="mb-0 flex shrink-0 items-center gap-2 sm:mb-0">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-label={
            expanded ? t("focus.microCollapseAria") : t("focus.microExpandAria")
          }
          className="focus-screen__micro-card-toggle flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left transition-colors hover:bg-white/[0.03]"
        >
          <svg
            className="h-3.5 w-3.5 shrink-0 text-violet-400/90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 2 2 7l10 5 10-5-10-5z" />
            <path d="m2 17 10 5 10-5" />
            <path d="m2 12 10 5 10-5" />
          </svg>
          <span className="min-w-0 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
            {t("focus.microTitle")}
          </span>
          {!expanded ? (
            <span className="min-w-0 truncate text-[12px] font-medium normal-case tracking-normal text-[#64748B]">
              {summaryLabel}
            </span>
          ) : null}
          <ChevronDownIcon
            className={`ml-auto h-4 w-4 shrink-0 text-[#64748B] transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
        {headerAction ? (
          <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
            {headerAction}
          </div>
        ) : null}
      </div>

      {expanded ? (
        <>
          <div className="focus-screen__micro-steps-scroll mt-2 flex flex-col gap-1 sm:mt-3">
            {steps.length === 0 ? (
              <FocusMicroAiSuggest
                taskTitle={taskTitle}
                energyLevel={energyLevel}
                durationMin={durationMin}
                onApplySteps={onApplyAiSteps}
                disabled={aiDisabled}
              />
            ) : null}

            {steps.map((step, idx) => {
              const isDone = Boolean(step.done);
              const isActive = !isDone && idx === activeStepIdx;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onToggleStep(step.id)}
                  className={`focus-micro-step${isActive ? " focus-micro-step--active" : ""}`}
                >
                  {isDone ? (
                    <>
                      <svg
                        className="h-4 w-4 shrink-0 text-[#22c55e]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span className="text-[13.5px] text-[#94A3B8] line-through">
                        {step.title}
                      </span>
                    </>
                  ) : isActive ? (
                    <>
                      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-violet-400" />
                      <span className="text-[13.5px] font-semibold text-white">
                        {step.title}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[#64748B]" />
                      <span className="text-[13.5px] text-[#94A3B8]">{step.title}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="focus-screen__micro-card-footer">
            <div className="focus-micro-input-row mt-2 flex items-center gap-2 sm:mt-3">
              <input
                type="text"
                value={inlineNewStep}
                onChange={(event) => onInlineNewStepChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onInlineAddStep();
                  }
                }}
                disabled={inputDisabled}
                placeholder={inputPlaceholder ?? t("focus.microPh")}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-[#64748B] focus:border-violet-400/40 focus:outline-none focus:ring-1 focus:ring-violet-500/30 disabled:opacity-50"
                autoComplete="off"
                enterKeyHint="done"
              />
              <button
                type="button"
                onClick={onInlineAddStep}
                disabled={inputDisabled || !inlineNewStep.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-light text-white transition hover:bg-white/15 disabled:opacity-40"
                aria-label={t("tasks.microAdd")}
              >
                +
              </button>
            </div>

            {microUndoSnapshot && onUndo ? (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={onUndo}
                  className="text-xs font-medium text-[#94A3B8] underline decoration-white/20 underline-offset-2 hover:text-white"
                >
                  {t("focus.undo")}
                </button>
              </div>
            ) : null}

            {steps.length > 0 ? (
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-sm text-[#64748B]">{summaryLabel}</span>
                <div className="flex gap-1.5">
                  {steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className={`h-2 w-6 rounded-full transition-colors ${
                        step.done
                          ? "bg-[#22c55e]"
                          : idx === activeStepIdx
                            ? "bg-violet-500"
                            : "bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
