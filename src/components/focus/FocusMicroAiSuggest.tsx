"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDownIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { fetchMicroStepSuggestions } from "@/lib/ai/fetchMicroStepSuggestions";
import { microSuggestErrorMessage } from "@/lib/ai/microSuggestErrorMessage";
import {
  microStepId,
  type MicroStep,
  type MicroStepDifficulty,
} from "@/lib/microSteps";
import { useI18n } from "@/lib/i18n";

type FocusMicroAiSuggestProps = {
  taskTitle: string;
  energyLevel?: string | null;
  durationMin?: number | null;
  onApplySteps: (steps: MicroStep[]) => void | Promise<void>;
  disabled?: boolean;
};

function normalizeEnergy(
  energy: string | null | undefined
): MicroStepDifficulty | null {
  if (energy === "low" || energy === "medium" || energy === "high") {
    return energy;
  }
  return null;
}

export default function FocusMicroAiSuggest({
  taskTitle,
  energyLevel,
  durationMin,
  onApplySteps,
  disabled = false,
}: FocusMicroAiSuggestProps) {
  const { t, locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setExpanded(false);
    setError(null);
  }, [taskTitle]);

  const requestSuggestions = useCallback(async () => {
    const trimmedTitle = taskTitle.trim();
    if (!trimmedTitle || loading || disabled) return;

    setLoading(true);
    setError(null);
    try {
      const energy = normalizeEnergy(energyLevel);
      const result = await fetchMicroStepSuggestions({
        title: trimmedTitle,
        energyLevel: energy,
        durationMin: durationMin ?? null,
        locale: locale === "en" ? "en" : "nl",
      });
      const difficulty = energy ?? "medium";
      const steps: MicroStep[] = result.steps.map((title) => ({
        id: microStepId(),
        title,
        minutes: null,
        difficulty,
        done: false,
      }));
      await onApplySteps(steps);
    } catch (err) {
      setError(microSuggestErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  }, [
    taskTitle,
    energyLevel,
    durationMin,
    locale,
    loading,
    disabled,
    onApplySteps,
    t,
  ]);

  return (
    <div className="mb-2 sm:mb-3">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 rounded-[10px] py-1 text-left transition-colors hover:bg-white/[0.03]"
      >
        <SparklesIcon
          className="h-3.5 w-3.5 shrink-0 text-violet-400/90"
          aria-hidden
        />
        <span className="min-w-0 flex-1 text-[13px] font-medium text-violet-200/90">
          {t("focus.microAiCollapsed")}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-[#64748B] transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="mt-2.5 border-t border-white/[0.06] pt-2.5">
          <p className="text-[13px] leading-relaxed text-[#94A3B8]">
            {t("focus.microAiPrompt")}
          </p>
          <button
            type="button"
            onClick={() => void requestSuggestions()}
            disabled={loading || disabled}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/35 bg-violet-500/12 px-3 py-2.5 text-[13px] font-semibold text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-50"
          >
            <SparklesIcon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            {loading
              ? t("newTask.microSuggestLoading")
              : t("newTask.microSuggestBtn")}
          </button>
          {error ? (
            <p className="mt-2 text-[12px] leading-relaxed text-rose-300/90">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
