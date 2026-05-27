"use client";

type DeadlineLabelProps = {
  deadline: string;
  overdue?: boolean;
  compact?: boolean;
  showCalendarIcon?: boolean;
};

function CalendarIcon({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.5 2V4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10.5 2V4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function DeadlineLabel({
  deadline,
  overdue = false,
  compact = false,
  showCalendarIcon = false,
}: DeadlineLabelProps) {
  const isOverdue = overdue;
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: compact ? '2px 7px' : '3px 9px',
        borderRadius: 999,
        color: isOverdue ? 'var(--st-red-deep)' : 'var(--st-amber-deep)',
        background: isOverdue ? 'var(--st-red-haze)' : 'var(--st-amber-haze)',
        border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
        whiteSpace: 'nowrap',
      }}
    >
      {showCalendarIcon ? <CalendarIcon size={compact ? 10 : 11} /> : null}
      {deadline}
    </span>
  );
}
