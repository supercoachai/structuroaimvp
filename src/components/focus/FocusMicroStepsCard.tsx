"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { type MicroStep, visibleMicroSteps } from "@/lib/microSteps";
import { useI18n } from "@/lib/i18n";
import FocusMicroAiSuggest from "@/components/focus/FocusMicroAiSuggest";

/** Behoud uitklap-status per taak over remounts (bijv. na optimistische task-update). */
const microCardExpandedByTask = new Map<string, boolean>();

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
  onRemoveStep?: (stepId: string) => void;
  onApplyAiSteps: (steps: MicroStep[]) => void | Promise<void>;
  inputDisabled?: boolean;
  aiDisabled?: boolean;
  inputPlaceholder?: string;
  className?: string;
  headerAction?: ReactNode;
  defaultExpanded?: boolean;
  /** Bijv. timer afgelopen: kaart geforceerd ingeklapt. */
  forceCollapsed?: boolean;
};

export default function FocusMicroStepsCard({
  taskId,
  taskTitle,
  steps,
  activeStepIdx: _activeStepIdx,
  energyLevel,
  durationMin,
  inlineNewStep,
  onInlineNewStepChange,
  onInlineAddStep,
  onToggleStep,
  onRemoveStep,
  onApplyAiSteps,
  inputDisabled = false,
  aiDisabled = false,
  inputPlaceholder,
  className = "",
  headerAction,
  defaultExpanded = false,
  forceCollapsed = false,
}: FocusMicroStepsCardProps) {
  const { t } = useI18n();
  const [expanded, setExpandedState] = useState(
    () => microCardExpandedByTask.get(taskId) ?? defaultExpanded
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stepsOverflow, setStepsOverflow] = useState(false);
  const displaySteps = visibleMicroSteps(steps);
  const completedStepsCount = displaySteps.filter((step) => step.done).length;
  const activeIdx = useMemo(() => {
    const idx = displaySteps.findIndex((step) => !step.done);
    return idx === -1 ? displaySteps.length : idx;
  }, [displaySteps]);

  const setExpanded = (value: boolean | ((open: boolean) => boolean)) => {
    setExpandedState((open) => {
      const next = typeof value === "function" ? value(open) : value;
      microCardExpandedByTask.set(taskId, next);
      return next;
    });
  };

  useEffect(() => {
    if (forceCollapsed) {
      microCardExpandedByTask.set(taskId, false);
      setExpandedState(false);
      return;
    }
    setExpandedState(microCardExpandedByTask.get(taskId) ?? defaultExpanded);
  }, [taskId, defaultExpanded, forceCollapsed]);

  const isExpanded = expanded && !forceCollapsed;

  useLayoutEffect(() => {
    if (!isExpanded) {
      setStepsOverflow(false);
      return;
    }

    const scrollEl = scrollRef.current;
    const cardEl = scrollEl?.closest(".focus-screen__micro-card");
    if (!scrollEl || !cardEl) return;

    const measure = () => {
      const footerEl = cardEl.querySelector(".focus-screen__micro-card-footer");
      const headerEl = cardEl.querySelector(".focus-screen__micro-card-toggle")?.parentElement;
      const cardMax = cardEl.clientHeight;
      const headerH = headerEl?.getBoundingClientRect().height ?? 0;
      const footerH = footerEl?.getBoundingClientRect().height ?? 0;
      const scrollMt = parseFloat(getComputedStyle(scrollEl).marginTop) || 0;
      const available = cardMax - headerH - footerH - scrollMt;
      const contentH = scrollEl.scrollHeight;
      setStepsOverflow(contentH > available + 1);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(cardEl);
    ro.observe(scrollEl);
    if (scrollEl.firstElementChild) ro.observe(scrollEl.firstElementChild);
    return () => ro.disconnect();
  }, [isExpanded, displaySteps.length, displaySteps.map((s) => `${s.id}:${s.title}`).join("|")]);

  const summaryLabel =
    displaySteps.length > 0
      ? t("focus.stepsProgress", {
          done: String(completedStepsCount),
          total: String(displaySteps.length),
        })
      : t("focus.microSummaryEmpty");

  const collapsedProgressPct =
    displaySteps.length > 0
      ? Math.round((completedStepsCount / displaySteps.length) * 100)
      : 0;

  const layersIcon = (
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
  );

  return (
    <div
      className={`focus-screen__micro-card${
        isExpanded ? "" : " focus-screen__micro-card--collapsed"
      } ${className}`.trim()}
    >
      <div className="mb-0 flex shrink-0 items-center gap-2 sm:mb-0">
        <button
          type="button"
          onClick={() => {
            if (forceCollapsed) return;
            setExpanded((open) => !open);
          }}
          aria-expanded={isExpanded}
          aria-disabled={forceCollapsed}
          aria-label={
            isExpanded ? t("focus.microCollapseAria") : t("focus.microExpandAria")
          }
          className={`focus-screen__micro-card-toggle flex min-w-0 flex-1 rounded-lg text-left transition-colors hover:bg-white/[0.03] ${
            isExpanded ? "items-center gap-2 py-1" : "flex-col items-stretch py-2"
          }`}
        >
          {isExpanded ? (
            <>
              {layersIcon}
              <span className="min-w-0 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
                {t("focus.microTitle")}
              </span>
              <ChevronDownIcon
                className="ml-auto h-4 w-4 shrink-0 rotate-180 text-[#64748B] transition-transform duration-200"
                aria-hidden
              />
            </>
          ) : (
            <div className="focus-screen__micro-collapsed w-full min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                {layersIcon}
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">
                  {t("focus.microTitle")}
                </span>
                {displaySteps.length > 0 ? (
                  <span className="shrink-0 text-[12px] font-medium tabular-nums text-[#94A3B8]">
                    {t("focus.microCollapsedCount", {
                      done: String(completedStepsCount),
                      total: String(displaySteps.length),
                    })}
                  </span>
                ) : (
                  <span className="shrink-0 text-[12px] font-medium text-[#64748B]">
                    {summaryLabel}
                  </span>
                )}
                <ChevronDownIcon
                  className="h-4 w-4 shrink-0 text-[#64748B] transition-transform duration-200"
                  aria-hidden
                />
              </div>
              {displaySteps.length > 0 ? (
                <div
                  className="focus-screen__micro-collapsed-bar"
                  role="progressbar"
                  aria-valuenow={completedStepsCount}
                  aria-valuemin={0}
                  aria-valuemax={displaySteps.length}
                  aria-label={summaryLabel}
                >
                  <div
                    className="focus-screen__micro-collapsed-bar-fill"
                    style={{ width: `${collapsedProgressPct}%` }}
                  />
                </div>
              ) : null}
            </div>
          )}
        </button>
        {headerAction ? (
          <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
            {headerAction}
          </div>
        ) : null}
      </div>

      {isExpanded ? (
        <>
          <div
            ref={scrollRef}
            className={`focus-screen__micro-steps-scroll mt-2 flex flex-col gap-1 sm:mt-3${
              stepsOverflow ? " focus-screen__micro-steps-scroll--overflowing" : ""
            }`}
          >
            {displaySteps.length === 0 ? (
              <FocusMicroAiSuggest
                taskTitle={taskTitle}
                energyLevel={energyLevel}
                durationMin={durationMin}
                onApplySteps={onApplyAiSteps}
                disabled={aiDisabled}
              />
            ) : null}

            {displaySteps.map((step, idx) => {
              const isDone = Boolean(step.done);
              const isActive = !isDone && idx === activeIdx;
              return (
                <div
                  key={`${step.id}-${idx}`}
                  className={`focus-micro-step${isActive ? " focus-micro-step--active" : ""}`}
                >
                  <button
                    type="button"
                    className="focus-micro-step-main"
                    onClick={() => onToggleStep(step.id)}
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
                  {onRemoveStep ? (
                    <button
                      type="button"
                      className="focus-micro-step-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveStep(step.id);
                      }}
                      aria-label={t("focus.microRemoveStepAria")}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
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

            {displaySteps.length > 0 ? (
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-sm text-[#64748B]">{summaryLabel}</span>
                <div className="flex gap-1.5">
                  {displaySteps.map((step, idx) => (
                    <div
                      key={`${step.id}-${idx}`}
                      className={`h-2 w-6 rounded-full transition-colors ${
                        step.done
                          ? "bg-[#22c55e]"
                          : idx === activeIdx
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
