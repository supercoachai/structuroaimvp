"use client";

type DagafsluitingProgressDotsProps = {
  step: 1 | 2 | 3;
};

export default function DagafsluitingProgressDots({ step }: DagafsluitingProgressDotsProps) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={3}
    >
      {[1, 2, 3].map((s) =>
        step === s ? (
          <span
            key={s}
            className="h-1.5 w-8 rounded-full bg-[var(--st-blue)]"
            aria-current="step"
          />
        ) : (
          <span
            key={s}
            className="h-1.5 w-1.5 rounded-full bg-[var(--st-line-strong)]"
            aria-hidden
          />
        )
      )}
    </div>
  );
}
