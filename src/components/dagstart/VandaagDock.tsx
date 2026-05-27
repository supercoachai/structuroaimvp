"use client";

import DeadlineLabel from '@/components/structuro/DeadlineLabel';
import EnergyDotTask from '@/components/structuro/EnergyDotTask';
import type { DagstartCardTask } from './DagstartCardStack';

type VandaagDockProps = {
  kept: DagstartCardTask[];
  total: number;
  onRemove: (id: string) => void;
  label: string;
  totalLabel: string;
  emptyHint: string;
  removeAria: string;
  structuroMode?: boolean;
  swapLabel?: string;
  swapAria?: string;
  swapDisabled?: boolean;
  onSwap?: (id: string) => void;
};

function DockRow({
  task,
  index,
  onRemove,
  removeAria,
  structuroMode,
  swapLabel,
  swapAria,
  swapDisabled,
  onSwap,
}: {
  task: DagstartCardTask;
  index: number;
  onRemove: (id: string) => void;
  removeAria: string;
  structuroMode?: boolean;
  swapLabel?: string;
  swapAria?: string;
  swapDisabled?: boolean;
  onSwap?: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-[11px] border px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5"
      style={{
        background: 'var(--st-blue-haze)',
        borderColor: 'color-mix(in oklab, var(--st-blue) 14%, transparent)',
      }}
    >
      <span
        className="flex shrink-0 items-center justify-center rounded-[7px] text-[10px] font-semibold text-white sm:text-[11px]"
        style={{
          width: 22,
          height: 22,
          background: 'linear-gradient(180deg, #5A84F9, var(--st-blue-deep))',
          boxShadow: '0 1px 0 rgba(255,255,255,0.35) inset',
        }}
      >
        {index + 1}
      </span>
      <EnergyDotTask energy={task.energy} size={7} />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--st-ink)] sm:text-[13.5px]">
        {task.title}
      </span>
      {task.deadline ? (
        <DeadlineLabel deadline={task.deadline} overdue={task.overdue} compact />
      ) : null}
      <span
        className="st-mono hidden shrink-0 text-[10px] font-medium sm:inline"
        style={{
          color: 'var(--st-blue-deep)',
          padding: '2px 7px',
          borderRadius: 999,
          background: 'rgba(59,107,247,0.08)',
        }}
      >
        {task.minutes}m
      </span>
      {structuroMode ? (
        <button
          type="button"
          onClick={() => onSwap?.(task.id)}
          disabled={swapDisabled}
          aria-label={swapAria}
          className="shrink-0 rounded-lg border bg-white px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-[var(--st-surface-2)] disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
          style={{
            borderColor: 'var(--st-line)',
            color: 'var(--st-blue)',
          }}
        >
          {swapLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onRemove(task.id)}
          aria-label={removeAria}
          className="flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent"
          style={{ width: 20, height: 20, color: 'var(--st-muted)' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function VandaagDock({
  kept,
  total,
  onRemove,
  label,
  totalLabel,
  emptyHint,
  removeAria,
  structuroMode = false,
  swapLabel,
  swapAria,
  swapDisabled = false,
  onSwap,
}: VandaagDockProps) {
  return (
    <div className="shrink-0">
      <div className="mb-2 flex items-baseline justify-between gap-2 sm:mb-2.5">
        <span className="st-label min-w-0 truncate text-[10px] sm:text-xs">{label}</span>
        <span className="st-mono shrink-0 text-[10px] text-[var(--st-muted)] sm:text-xs">
          {totalLabel.replace('{n}', String(total))}
        </span>
      </div>

      {kept.length === 0 ? (
        <div
          className="rounded-xl border-[1.5px] border-dashed px-3 py-3 text-center text-xs text-[var(--st-muted)] sm:px-3.5 sm:py-3.5 sm:text-[13px]"
          style={{ borderColor: 'var(--st-line-strong)', minHeight: 52 }}
        >
          {emptyHint}
        </div>
      ) : (
        <div className="flex flex-col gap-1 sm:gap-1.5" style={{ minHeight: 52 }}>
          {kept.map((t, i) => (
            <DockRow
              key={t.id}
              task={t}
              index={i}
              onRemove={onRemove}
              removeAria={removeAria}
              structuroMode={structuroMode}
              swapLabel={swapLabel}
              swapAria={swapAria}
              swapDisabled={swapDisabled}
              onSwap={onSwap}
            />
          ))}
        </div>
      )}
    </div>
  );
}
