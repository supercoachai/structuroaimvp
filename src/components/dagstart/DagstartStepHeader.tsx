"use client";

type DagstartStepHeaderProps = {
  step: 1 | 2;
  stepLabel: string;
  stepFeelLabel: string;
  stepComposeLabel: string;
  chromeTitle: string;
  compact?: boolean;
};

export default function DagstartStepHeader({
  step,
  stepLabel,
  stepFeelLabel,
  stepComposeLabel,
  chromeTitle,
  compact = false,
}: DagstartStepHeaderProps) {
  const progressPct = step === 1 ? 50 : 100;

  return (
    <header className={`shrink-0 ${compact ? "mb-2" : "mb-4 max-[380px]:mb-3"}`}>
      <div
        className={`flex items-center justify-between gap-2 ${compact ? "mb-2" : "mb-3 max-[380px]:mb-2"}`}
      >
        <span
          className="uppercase text-[11px] font-bold tracking-[0.14em] text-[var(--st-muted)] max-[380px]:text-[10px]"
        >
          {chromeTitle}
        </span>
        <span className="text-xs text-[var(--st-muted-2)] max-[380px]:text-[11px]">{stepLabel}</span>
      </div>

      <div
        className={`overflow-hidden rounded-full ${compact ? "mb-2" : "mb-3 max-[380px]:mb-2"}`}
        style={{ height: 4, background: "var(--st-surface-2)" }}
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progressPct}%`,
            background: "linear-gradient(90deg, var(--st-blue), #5A84F9)",
          }}
        />
      </div>

      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <span
          className="min-w-0 flex-1 truncate text-[13px] max-[380px]:text-xs"
          style={{
            fontWeight: step === 1 ? 600 : 500,
            color: step === 2 ? "var(--st-blue)" : "var(--st-ink)",
          }}
        >
          {step === 2 ? `✓ ${stepFeelLabel}` : stepFeelLabel}
        </span>
        <span
          className="max-w-[48%] shrink-0 truncate text-right text-[13px] max-[380px]:text-xs"
          style={{
            fontWeight: step === 2 ? 600 : 500,
            color: step === 2 ? "var(--st-ink)" : "var(--st-muted-2)",
          }}
        >
          {stepComposeLabel}
        </span>
      </div>
    </header>
  );
}
