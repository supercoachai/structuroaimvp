"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NewTaskFlow from "@/components/newTask/NewTaskFlow";
import type { NewTaskFlowPayload } from "@/lib/newTask/newTaskFlowTypes";
import {
  analyzeDagstartKeep,
  clampDagstartSelection,
  dagstartSlotCapacity,
} from "@/lib/dagstart/dagstartPickLimits";
import { toast } from "@/components/Toast";
import Battery from "./Battery";
import {
  DAGSTART_ENERGIES,
  type DagstartEnergyId,
  type DagstartTaskCard,
} from "./types";

type StepSuggestedProps = {
  energy: DagstartEnergyId | null;
  tasks: DagstartTaskCard[];
  maxSlots: number;
  extraDeadlineSlots: number;
  preselectedIds?: string[];
  onAccept: (pickedIds: string[]) => void;
  onSwitchToSwipe: () => void;
  onAddTask?: (payload: NewTaskFlowPayload) => void | Promise<void>;
  onRequestDeadlineOverflow?: (
    task: DagstartTaskCard,
    onConfirm?: () => void
  ) => void;
  addBusy?: boolean;
};

export default function StepSuggested({
  energy,
  tasks,
  maxSlots,
  extraDeadlineSlots,
  preselectedIds = [],
  onAccept,
  onSwitchToSwipe,
  onAddTask,
  onRequestDeadlineOverflow,
  addBusy = false,
}: StepSuggestedProps) {
  const meta = DAGSTART_ENERGIES.find((e) => e.id === energy);
  const suggested = tasks;
  const slotCapacity = dagstartSlotCapacity(maxSlots, extraDeadlineSlots);
  const tasksById = useMemo(
    () => new Map(tasks.map((t) => [t.id, t])),
    [tasks]
  );

  const defaultSelected = useMemo(
    () =>
      clampDagstartSelection(
        [...preselectedIds, ...suggested.map((t) => t.id)],
        tasksById,
        maxSlots,
        extraDeadlineSlots
      ),
    [suggested, preselectedIds, tasksById, maxSlots, extraDeadlineSlots]
  );

  const [selected, setSelected] = useState<string[]>(() => defaultSelected);

  const hadSuggestions = useRef(suggested.length > 0);

  useEffect(() => {
    if (!hadSuggestions.current && suggested.length > 0) {
      setSelected(defaultSelected);
    }
    hadSuggestions.current = suggested.length > 0;
  }, [suggested, defaultSelected]);

  useEffect(() => {
    setSelected((prev) => {
      const next = clampDagstartSelection(
        [...prev, ...preselectedIds.filter((id) => !prev.includes(id))],
        tasksById,
        maxSlots,
        extraDeadlineSlots
      );
      return next.length === prev.length &&
        next.every((id, index) => id === prev[index])
        ? prev
        : next;
    });
  }, [preselectedIds, tasksById, maxSlots, extraDeadlineSlots]);

  const toggle = (id: string) => {
    const task = suggested.find((t) => t.id === id);
    if (!task) return;

    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);

      const analysis = analyzeDagstartKeep(
        task,
        s,
        maxSlots,
        extraDeadlineSlots
      );
      if (analysis.kind === "allow") return [...s, id];
      if (analysis.kind === "reject") {
        toast("Alle focusplekken zijn al gevuld.");
        return s;
      }
      onRequestDeadlineOverflow?.(task, () => {
        setSelected((cur) => {
          if (cur.includes(id)) return cur;
          const retry = analyzeDagstartKeep(
            task,
            cur,
            maxSlots,
            extraDeadlineSlots
          );
          if (retry.kind !== "allow") return cur;
          return [...cur, id];
        });
      });
      return s;
    });
  };

  const total = suggested
    .filter((t) => selected.includes(t.id))
    .reduce((sum, t) => sum + t.minutes, 0);

  if (suggested.length === 0 && onAddTask) {
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <NewTaskFlow
          variant="compact"
          mode="panel"
          fillContainer
          saving={addBusy}
          onSave={async (payload) => {
            await onAddTask(payload);
          }}
          className="min-h-0 min-w-0 flex-1 shadow-none"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="shrink-0">
        <div className="ds-eyebrow">Voor jou</div>
        <h2 className="ds-title">Dit stelt Structuro voor.</h2>
        <p className="ds-sub">
          {meta ? `Past bij ${meta.label.toLowerCase()} energie. ` : ""}
          Klik weg wat niet past. Max {maxSlots}{" "}
          {maxSlots === 1 ? "taak" : "taken"}.
        </p>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          margin: "24px 0 16px",
        }}
      >
        {suggested.map((t) => {
          const active = selected.includes(t.id);
          const addAnalysis = analyzeDagstartKeep(
            t,
            selected,
            maxSlots,
            extraDeadlineSlots
          );
          const canAdd =
            active ||
            addAnalysis.kind === "allow" ||
            addAnalysis.kind === "overflow";
          const e =
            DAGSTART_ENERGIES.find((x) => x.id === t.energy) ??
            DAGSTART_ENERGIES[1];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (!active && addAnalysis.kind === "reject") {
                  toast("Alle focusplekken zijn al gevuld.");
                  return;
                }
                if (!canAdd && !active) return;
                toggle(t.id);
              }}
              style={{
                all: "unset",
                cursor: canAdd || active ? "pointer" : "not-allowed",
                boxSizing: "border-box",
                padding: "12px 14px",
                borderRadius: 14,
                background: active ? "var(--st-blue-haze)" : "transparent",
                border: `1px solid ${
                  active ? "rgba(59,107,247,0.30)" : "var(--st-line)"
                }`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                transition: "all 200ms",
                opacity: !active && addAnalysis.kind === "reject" ? 0.45 : 1,
              }}
              aria-pressed={active}
              aria-disabled={!active && addAnalysis.kind === "reject"}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: active ? "var(--st-blue)" : "transparent",
                  border: active ? "none" : "1.5px solid var(--st-muted-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
                aria-hidden
              >
                {active ? (
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path
                      d="M2 5L4 7L8 3"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </span>
              <Battery level={e.level} color={e.color} size={18} />
              <span
                style={{
                  flex: 1,
                  fontSize: 14.5,
                  color: active ? "var(--st-ink)" : "var(--st-muted)",
                  textDecoration: active ? "none" : "line-through",
                  textDecorationColor: "rgba(138,146,166,0.4)",
                  fontWeight: active ? 500 : 400,
                  textAlign: "left",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.title}
              </span>
              {t.deadline ? (
                <span
                  style={{
                    fontSize: 11,
                    color: t.overdue
                      ? "var(--st-red-deep, #B91C1C)"
                      : "var(--st-muted-2)",
                  }}
                >
                  {t.deadline}
                </span>
              ) : null}
              <span
                style={{
                  fontFamily: "var(--st-mono)",
                  fontSize: 11,
                  color: "var(--st-muted-2)",
                }}
              >
                {t.minutes}m
              </span>
            </button>
          );
        })}
      </div>

      <div className="shrink-0">
        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--st-muted-2)",
            marginBottom: 20,
          }}
        >
          {selected.length === 0
            ? "Niks geselecteerd."
            : `${selected.length}/${slotCapacity} taken, ${total} min`}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="ds-link"
            onClick={onSwitchToSwipe}
          >
            liever swipen
          </button>
          <button
            type="button"
            className="ds-link primary"
            aria-disabled={selected.length === 0}
            onClick={() =>
              selected.length > 0 &&
              onAccept(
                clampDagstartSelection(
                  selected,
                  tasksById,
                  maxSlots,
                  extraDeadlineSlots
                )
              )
            }
          >
            Start mijn dag →
          </button>
        </div>
      </div>
    </div>
  );
}
