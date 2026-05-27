"use client";

type HomeTodayProgressProps = {
  current: number;
  total: number;
  doneMinutes: number;
  totalMinutes: number;
  todayLabel: string;
  minutesLabel: string;
};

/** Voortgang vandaag: uppercase labels + segmentbalk (HTML dashboard). */
export default function HomeTodayProgress({
  current,
  total,
  doneMinutes,
  totalMinutes,
  todayLabel,
  minutesLabel,
}: HomeTodayProgressProps) {
  const safeTotal = Math.max(1, total);
  const filled = Math.min(Math.max(current, 0), safeTotal);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span
          className="st-mono uppercase"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: 'var(--st-muted)',
          }}
        >
          {todayLabel}
        </span>
        <span
          className="st-mono uppercase"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: 'var(--st-muted-2)',
          }}
        >
          {minutesLabel}
        </span>
      </div>
      <div
        className="flex w-full gap-1.5"
        role="progressbar"
        aria-valuenow={filled}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-label={todayLabel}
      >
        {Array.from({ length: safeTotal }, (_, index) => {
          const isFilled = index < filled;
          return (
            <div
              key={index}
              className="h-1.5 min-w-0 flex-1 rounded-full"
              style={{
                background: isFilled ? 'var(--st-blue)' : 'rgba(26, 35, 64, 0.10)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
