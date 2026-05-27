"use client";

import type { ReactNode } from "react";
import EnergyDotTask from "@/components/structuro/EnergyDotTask";
import { appEnergyToSt } from "@/lib/structuro/energyTokens";

export type SuggestionListItem =
  | { kind: "task"; id: string; title: string; energyLevel?: string | null; minutes: number }
  | { kind: "reminder"; id: string; title: string; energyLevel?: string | null; badge: string };

type DagstartSuggestionsListProps = {
  title: string;
  titleExtra?: ReactNode;
  items: SuggestionListItem[];
  emptyHint: string;
  showAllLabel: string;
  showLessLabel: string;
  hasMore: boolean;
  showAll: boolean;
  onToggleShowAll: () => void;
  pickingId: string | null;
  focusedIds: Set<string>;
  onPick: (item: SuggestionListItem) => void;
};

export default function DagstartSuggestionsList({
  title,
  titleExtra,
  items,
  emptyHint,
  showAllLabel,
  showLessLabel,
  hasMore,
  showAll,
  onToggleShowAll,
  pickingId,
  focusedIds,
  onPick,
}: DagstartSuggestionsListProps) {
  return (
    <section className="pb-2">
      <div className="mb-2 flex items-center gap-1.5">
        <h3 className="st-label text-[10px] sm:text-xs">{title}</h3>
        {titleExtra}
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--st-line-strong)] px-3 py-4 text-center text-xs text-[var(--st-muted)]">
          {emptyHint}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => {
            const focused = focusedIds.has(item.id);
            const picking = pickingId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={focused || picking}
                  onClick={() => onPick(item)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    focused
                      ? "cursor-default border-[var(--st-line)] bg-[var(--st-surface-2)] opacity-60"
                      : "border-[var(--st-line)] bg-white hover:border-[var(--st-blue)] hover:bg-[var(--st-blue-haze)]"
                  } ${picking ? "opacity-70" : ""}`}
                >
                  <EnergyDotTask
                    energy={appEnergyToSt(item.energyLevel)}
                    size={7}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--st-ink)]">
                    {item.title}
                  </span>
                  {item.kind === "reminder" ? (
                    <span className="shrink-0 rounded-full bg-[var(--st-surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--st-muted)]">
                      {item.badge}
                    </span>
                  ) : (
                    <span className="st-mono shrink-0 text-[10px] text-[var(--st-muted)]">
                      {item.minutes}m
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {hasMore ? (
        <button
          type="button"
          onClick={onToggleShowAll}
          className="mt-2 w-full text-center text-xs font-medium text-[var(--st-blue)]"
        >
          {showAll ? showLessLabel : showAllLabel}
        </button>
      ) : null}
    </section>
  );
}
