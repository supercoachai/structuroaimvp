"use client";

export type SatisfactionLevel = "low" | "good" | "great";

type SatisfactionOption = {
  key: SatisfactionLevel;
  emoji: string;
  label: string;
};

type DagafsluitingSatisfactionCardsProps = {
  value: SatisfactionLevel | null;
  onChange: (value: SatisfactionLevel) => void;
  options: SatisfactionOption[];
};

export default function DagafsluitingSatisfactionCards({
  value,
  onChange,
  options,
}: DagafsluitingSatisfactionCardsProps) {
  return (
    <div className="dagafsluiting-satisfaction-grid grid grid-cols-3 gap-2.5">
      {options.map((opt) => {
        const selected = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.key)}
            className={`dagafsluiting-satisfaction-card flex min-h-[72px] flex-col items-center justify-center rounded-2xl border-[1.5px] px-2 py-3 text-center transition-all duration-150 active:scale-[0.98] ${
              selected
                ? "border-[var(--st-line-strong)] bg-[var(--st-surface-2)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                : "border-[var(--st-line)] bg-white hover:border-[var(--st-line-strong)] hover:bg-[var(--st-surface-2)]"
            }`}
          >
            <span className="text-[1.35rem] leading-none" aria-hidden>
              {opt.emoji}
            </span>
            <span className="mt-1.5 text-[15px] font-semibold leading-tight text-[var(--st-ink)]">
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
