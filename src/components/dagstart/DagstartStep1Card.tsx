"use client";

import { useMemo, type ReactNode } from "react";
import { getDayStartTimeOfDay } from "@/lib/dayStartGreeting";
import { getDagstartStep1Quote } from "@/lib/dagstart/step1Quote";
import DagstartEnergyCards, { type DagstartEnergyValue } from "./DagstartEnergyCards";

type DagstartStep1CardProps = {
  userName: string | null;
  stepLabel: string;
  question: string;
  labels: Record<"low" | "medium" | "high", string>;
  sublabels: Record<"low" | "medium" | "high", string>;
  value: DagstartEnergyValue | null;
  onChange: (value: DagstartEnergyValue) => void;
  locale: string;
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  greetingFallbackName: string;
  exiting?: boolean;
  footer?: ReactNode;
  /** Optioneel ℹ-icoon naast de energievraag. */
  questionExtra?: ReactNode;
};

export default function DagstartStep1Card({
  userName,
  stepLabel,
  question,
  labels,
  sublabels,
  value,
  onChange,
  locale,
  greetingMorning,
  greetingAfternoon,
  greetingEvening,
  greetingFallbackName,
  exiting = false,
  footer,
  questionExtra,
}: DagstartStep1CardProps) {
  const greetingLine = useMemo(() => {
    const name = userName?.trim() || greetingFallbackName;
    const period = getDayStartTimeOfDay();
    const template =
      period === "morning"
        ? greetingMorning
        : period === "afternoon"
          ? greetingAfternoon
          : greetingEvening;
    return template.replace("{name}", name);
  }, [
    userName,
    greetingMorning,
    greetingAfternoon,
    greetingEvening,
    greetingFallbackName,
  ]);

  const quote = useMemo(() => getDagstartStep1Quote(locale), [locale]);

  return (
    <div
      className={`w-full max-w-sm rounded-[20px] bg-[var(--st-surface)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out ${
        exiting ? "pointer-events-none translate-y-2 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className="relative h-1 min-w-0 flex-1 overflow-hidden rounded-full"
          style={{ background: "var(--st-surface-2)" }}
          role="progressbar"
          aria-valuenow={1}
          aria-valuemin={1}
          aria-valuemax={2}
          aria-label={stepLabel}
        >
          <div
            className="absolute inset-y-0 left-0 w-1/2 rounded-full"
            style={{ background: "var(--st-blue)" }}
            aria-hidden
          />
        </div>
        <span className="shrink-0 text-xs text-[var(--st-muted-2)]">{stepLabel}</span>
      </div>

      <p
        className="mb-1 text-center text-xl font-semibold tracking-tight text-[var(--st-ink)]"
        suppressHydrationWarning
      >
        {greetingLine ?? "\u00A0"}
      </p>

      <p
        className="mb-4 text-center text-[0.7rem] italic leading-snug text-[var(--st-muted-2)]"
        suppressHydrationWarning
      >
        {quote ? `\u201C${quote}\u201D` : "\u00A0"}
      </p>

      <div className="border-t border-[var(--st-line)]" />

      <p className="mb-3 mt-4 flex items-center justify-center gap-1.5 text-center text-sm font-medium text-[var(--st-muted)]">
        <span>{question}</span>
        {questionExtra}
      </p>

      <DagstartEnergyCards
        value={value}
        onChange={onChange}
        labels={labels}
        sublabels={sublabels}
      />

      {footer ? <div className="mt-4 border-t border-[var(--st-line)] pt-4">{footer}</div> : null}
    </div>
  );
}
