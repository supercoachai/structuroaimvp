"use client";

import type { ReactNode } from "react";
import EnergyDotTask from "@/components/structuro/EnergyDotTask";
import DeadlineLabel from "@/components/structuro/DeadlineLabel";
import { appEnergyToSt } from "@/lib/structuro/energyTokens";
import { getTaskDeadlineMeta } from "@/lib/taskDeadlineDisplay";

export type FocusSlotTask = {
  id: string;
  title: string;
  energyLevel?: string | null;
  duration?: number | null;
  estimatedDuration?: number | null;
  dueAt?: string | null;
};

type SlotConfig = {
  slot: number;
  label: string;
  description: string;
  task: FocusSlotTask | null;
};

type DagstartFocusSlotsProps = {
  title: string;
  titleExtra?: ReactNode;
  slots: SlotConfig[];
  swapLabel: string;
  swapAria: string;
  swapSlotTarget: number | null;
  onSwapClick: (slot: number) => void;
};

export default function DagstartFocusSlots({
  title,
  titleExtra,
  slots,
  swapLabel,
  swapAria,
  swapSlotTarget,
  onSwapClick,
}: DagstartFocusSlotsProps) {
  return (
    <section className="shrink-0">
      <div className="mb-3 flex items-center gap-1.5">
        <h3 className="st-label text-[10px] sm:text-xs">{title}</h3>
        {titleExtra}
      </div>
      <div className="flex flex-col gap-2.5">
        {slots.map(({ slot, label, description, task }) => {
          const minutes = task?.duration || task?.estimatedDuration || 15;
          const deadlineMeta = task?.dueAt ? getTaskDeadlineMeta(task.dueAt) : null;
          const swapping = swapSlotTarget === slot;
          return (
            <div
              key={slot}
              className={`rounded-xl border bg-white p-3 shadow-sm transition-colors ${
                swapping ? "border-[var(--st-blue)] ring-2 ring-[var(--st-blue)]/20" : "border-[var(--st-line)]"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                      style={{
                        background: "linear-gradient(180deg, #5A84F9, var(--st-blue-deep))",
                      }}
                    >
                      {slot}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--st-muted)]">
                      {label}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-7 text-[11px] text-[var(--st-muted-2)]">{description}</p>
                </div>
                {task ? (
                  <button
                    type="button"
                    onClick={() => onSwapClick(slot)}
                    aria-label={swapAria}
                    className="shrink-0 rounded-lg border border-[var(--st-line)] bg-white px-2 py-1 text-[10px] font-semibold text-[var(--st-blue)] hover:bg-[var(--st-surface-2)] sm:text-xs"
                  >
                    {swapLabel}
                  </button>
                ) : null}
              </div>
              {task ? (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--st-blue-haze)] px-2.5 py-2">
                  <EnergyDotTask energy={appEnergyToSt(task.energyLevel)} size={7} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--st-ink)]">
                    {task.title}
                  </span>
                  {deadlineMeta ? (
                    <DeadlineLabel
                      deadline={deadlineMeta.label}
                      overdue={deadlineMeta.overdue}
                      compact
                    />
                  ) : null}
                  <span className="st-mono shrink-0 text-[10px] font-medium text-[var(--st-blue-deep)]">
                    {minutes}m
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
