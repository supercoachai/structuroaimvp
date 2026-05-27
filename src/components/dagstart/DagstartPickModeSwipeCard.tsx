"use client";

type DagstartPickModeSwipeCardProps = {
  selfTitle: string;
  structuroTitle: string;
  cardTitle: string;
  cardLabel: string;
  onPickSelf: () => void;
  onPickStructuro: () => void;
  busy?: boolean;
  className?: string;
};

/** Keuze-kaart in stap 2: zelfde opmaak als taakkaarten, alleen knoppen (geen swipe). */
export default function DagstartPickModeSwipeCard({
  selfTitle,
  structuroTitle,
  cardTitle,
  cardLabel,
  onPickSelf,
  onPickStructuro,
  busy = false,
  className = "",
}: DagstartPickModeSwipeCardProps) {
  return (
    <div
      className={`relative flex w-full flex-col items-center py-1 sm:py-2 ${className}`.trim()}
    >
      <div className="relative w-full max-w-sm">
        <div
          className="relative z-[3] w-full shrink-0 flex-col overflow-hidden rounded-[16px] p-3.5 sm:p-4"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%)",
            boxShadow:
              "0 0 0 0.5px rgba(14,23,48,0.10), 0 1px 0 rgba(255,255,255,0.65) inset, 0 6px 18px -6px rgba(14,23,48,0.12)",
          }}
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span
              className="uppercase"
              style={{
                fontSize: 10,
                color: "var(--st-muted)",
                letterSpacing: "0.16em",
                fontWeight: 700,
              }}
            >
              {cardLabel}
            </span>
          </div>

          <h2 className="mb-3 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-[var(--st-ink)] sm:text-base">
            {cardTitle}
          </h2>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onPickSelf}
              disabled={busy}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[11px] border bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                height: 36,
                background: "var(--st-surface-2)",
                borderColor: "var(--st-line)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--st-muted)",
              }}
            >
              {selfTitle}
            </button>
            <button
              type="button"
              onClick={onPickStructuro}
              disabled={busy}
              className="st-btn-primary flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-0 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ height: 36, padding: 0, fontSize: 13 }}
            >
              {structuroTitle}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
