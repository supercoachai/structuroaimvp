"use client";

type ProgressDotsProps = {
  total?: number;
  done?: number;
  current?: number;
};

export default function ProgressDots({ total = 3, done = 0, current = -1 }: ProgressDotsProps) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < done;
        const isCurrent = i === current;
        return (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-sm transition-colors duration-200"
            style={{
              background: isDone
                ? 'var(--st-green)'
                : isCurrent
                  ? 'var(--st-blue)'
                  : 'rgba(14,23,48,0.08)',
              boxShadow: isCurrent ? '0 0 0 3px rgba(45,91,251,0.15)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
