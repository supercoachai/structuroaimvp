"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import NewTaskFlow from "@/components/newTask/NewTaskFlow";
import type { NewTaskFlowPayload } from "@/lib/newTask/newTaskFlowTypes";
import {
  analyzeDagstartKeep,
  clampDagstartSelection,
  dagstartSlotCapacity,
} from "@/lib/dagstart/dagstartPickLimits";
import { toast } from "@/components/Toast";
import { fireDagstartCompleteConfetti } from "@/lib/dagstartConfetti";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { useI18n } from "@/lib/i18n/I18nContext";
import { captureActivationFunnelEvent } from "@/lib/posthog/track";
import Battery from "./Battery";
import {
  DAGSTART_ENERGIES,
  type DagstartTaskCard,
} from "./types";

type StepSwipeProps = {
  tasks: DagstartTaskCard[];
  maxSlots: number;
  extraDeadlineSlots: number;
  preselectedIds?: string[];
  onDone: (keptIds: string[]) => void;
  onAddTask?: (payload: NewTaskFlowPayload) => void | Promise<void>;
  onSwitchToSuggested?: () => void;
  onRequestDeadlineOverflow?: (
    task: DagstartTaskCard,
    onConfirm?: () => void
  ) => void;
  addBusy?: boolean;
};

export default function StepSwipe({
  tasks,
  maxSlots,
  extraDeadlineSlots,
  preselectedIds = [],
  onDone,
  onAddTask,
  onSwitchToSuggested,
  onRequestDeadlineOverflow,
  addBusy = false,
}: StepSwipeProps) {
  const { t } = useI18n();
  const hadInitialTasks = useRef(tasks.length > 0);
  const swipeExhaustedTrackedRef = useRef(false);
  const [queue, setQueue] = useState<DagstartTaskCard[]>(() =>
    tasks.filter((t) => !preselectedIds.includes(t.id))
  );
  const [kept, setKept] = useState<string[]>(() => [...preselectedIds]);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => new Set());
  const [addOpen, setAddOpen] = useState(() => tasks.length === 0);

  const slotCapacity = dagstartSlotCapacity(maxSlots, extraDeadlineSlots);
  const tasksById = useMemo(
    () => new Map(tasks.map((t) => [t.id, t])),
    [tasks]
  );

  useEffect(() => {
    setKept((prev) => {
      const next = clampDagstartSelection(
        prev,
        tasksById,
        maxSlots,
        extraDeadlineSlots
      );
      return next.length === prev.length &&
        next.every((id, index) => id === prev[index])
        ? prev
        : next;
    });
  }, [tasksById, maxSlots, extraDeadlineSlots]);

  useEffect(() => {
    setKept((prev) => {
      const merged = clampDagstartSelection(
        [...prev, ...preselectedIds.filter((id) => !prev.includes(id))],
        tasksById,
        maxSlots,
        extraDeadlineSlots
      );
      return merged.length === prev.length &&
        merged.every((id, index) => id === prev[index])
        ? prev
        : merged;
    });
  }, [preselectedIds, tasksById, maxSlots, extraDeadlineSlots]);

  useEffect(() => {
    setQueue((prev) => {
      const known = new Set([
        ...prev.map((t) => t.id),
        ...kept,
        ...skippedIds,
      ]);
      const incoming = tasks.filter((t) => !known.has(t.id));
      if (incoming.length === 0) return prev;
      return [...prev, ...incoming];
    });
  }, [tasks, kept, skippedIds]);

  const decide = (id: string, action: "keep" | "skip") => {
    if (action === "skip") {
      setSkippedIds((prev) => new Set(prev).add(id));
      setQueue((q) => q.filter((t) => t.id !== id));
      return;
    }
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    setKept((currentKept) => {
      if (currentKept.includes(id)) return currentKept;

      const analysis = analyzeDagstartKeep(
        task,
        currentKept,
        maxSlots,
        extraDeadlineSlots
      );
      if (analysis.kind === "allow") {
        setQueue((q) => q.filter((t) => t.id !== id));
        return [...currentKept, id];
      }
      if (analysis.kind === "reject") {
        toast("Alle focusplekken zijn al gevuld.");
        return currentKept;
      }
      onRequestDeadlineOverflow?.(task, () => {
        setKept((latest) => {
          if (latest.includes(id)) return latest;
          const retry = analyzeDagstartKeep(
            task,
            latest,
            maxSlots,
            extraDeadlineSlots
          );
          if (retry.kind !== "allow") return latest;
          setQueue((q) => q.filter((t) => t.id !== id));
          return [...latest, id];
        });
      });
      return currentKept;
    });
  };

  const handleReviewAgain = () => {
    const skipped = tasks.filter((t) => skippedIds.has(t.id));
    setQueue(skipped);
    setSkippedIds(new Set());
    setAddOpen(false);
  };

  const keptTasks = kept
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is DagstartTaskCard => Boolean(t));
  const totalMin = keptTasks.reduce((s, t) => s + t.minutes, 0);

  const topQueueTask = queue[0] ?? null;
  const topKeepAnalysis = topQueueTask
    ? analyzeDagstartKeep(
        topQueueTask,
        kept,
        maxSlots,
        extraDeadlineSlots
      )
    : null;
  const selectionComplete =
    kept.length >= slotCapacity ||
    (kept.length >= maxSlots &&
      topKeepAnalysis?.kind === "reject" &&
      queue.length > 0);

  const finishPendingRef = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const stableMainHeightRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (selectionComplete) return;
    const el = mainRef.current;
    if (!el) return;
    stableMainHeightRef.current = el.offsetHeight;
  });

  const finishSwipe = () => {
    if (finishPendingRef.current) return;

    const ids = clampDagstartSelection(
      kept,
      tasksById,
      maxSlots,
      extraDeadlineSlots
    );
    const celebrate =
      selectionComplete || (queue.length === 0 && kept.length > 0);

    if (celebrate) {
      finishPendingRef.current = true;
      fireDagstartCompleteConfetti();
      window.setTimeout(() => {
        onDone(ids);
        finishPendingRef.current = false;
      }, 480);
      return;
    }

    onDone(ids);
  };

  const showAddFlow =
    Boolean(onAddTask) && (tasks.length === 0 || addOpen);
  const swipeExhausted =
    queue.length === 0 &&
    hadInitialTasks.current &&
    tasks.length > 0 &&
    skippedIds.size > 0;

  if (queue.length === 0) {
    if (showAddFlow) {
      const emptyTaskPool = tasks.length === 0;
      return (
        <div className={`flex w-full flex-col${emptyTaskPool ? "" : " min-h-0 flex-1 overflow-hidden"}`}>
          <NewTaskFlow
            variant="compact"
            mode="panel"
            fillContainer={!emptyTaskPool}
            saving={addBusy}
            onClose={emptyTaskPool ? undefined : () => setAddOpen(false)}
            showClose={!emptyTaskPool}
            onSave={async (payload) => {
              await onAddTask?.(payload);
              setAddOpen(false);
            }}
            className={
              emptyTaskPool ? "w-full shadow-none" : "min-h-0 min-w-0 flex-1 shadow-none"
            }
          />
        </div>
      );
    }

    if (swipeExhausted) {
      if (!swipeExhaustedTrackedRef.current) {
        swipeExhaustedTrackedRef.current = true;
        captureActivationFunnelEvent(ANALYTICS_EVENTS.dagstart_swipe_exhausted, {
          tasks_available: tasks.length,
          source: "dagstart_flow",
        });
      }
      return (
        <div style={{ width: "100%", textAlign: "center", paddingTop: 24 }}>
          <h2 className="ds-title" style={{ marginBottom: 14 }}>
            {t("dayStart.stackExhaustedTitle")}
          </h2>
          <p className="ds-sub" style={{ marginBottom: 10 }}>
            {t("dayStart.stackExhaustedSub")}
          </p>
          <p
            className="ds-sub"
            style={{ marginBottom: 24, fontSize: 13, color: "var(--st-muted)" }}
          >
            {t("dayStart.stackExhaustedSwipeHint")}
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxWidth: 320,
              margin: "0 auto",
            }}
          >
            <button
              type="button"
              className="st-btn-primary w-full border-0"
              style={{ height: 44, fontSize: 14 }}
              onClick={handleReviewAgain}
            >
              {t("dayStart.stackReviewAgain")}
            </button>
            {onSwitchToSuggested ? (
              <button
                type="button"
                className="st-btn-ghost w-full"
                style={{ height: 44, fontSize: 14 }}
                onClick={onSwitchToSuggested}
              >
                {t("dayStart.stackSwitchSuggested")}
              </button>
            ) : null}
            {onAddTask ? (
              <button
                type="button"
                className="st-btn-ghost w-full"
                style={{ height: 44, fontSize: 14 }}
                onClick={() => setAddOpen(true)}
              >
                {t("dayStart.stackAddAnyway")}
              </button>
            ) : null}
            <button
              type="button"
              className="ds-link"
              onClick={finishSwipe}
            >
              {t("dayStart.stackDoneWithout")}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ width: "100%", textAlign: "center", paddingTop: 40 }}>
        <h2 className="ds-title" style={{ marginBottom: 14 }}>
          Alle kaarten gehad.
        </h2>
        <p className="ds-sub" style={{ marginBottom: 24 }}>
          {kept.length === 0
            ? "Niks gekozen, ook prima."
            : `${kept.length} taken klaar voor vandaag.`}
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="ds-link primary"
            onClick={finishSwipe}
          >
            Klaar →
          </button>
          {onAddTask && kept.length === 0 ? (
            <button
              type="button"
              className="ds-link"
              onClick={() => setAddOpen(true)}
            >
              + Toch iets toevoegen
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="ds-swipe-step">
      <div
        ref={mainRef}
        className={`ds-swipe-main${selectionComplete ? " ds-swipe-main--complete" : ""}`}
        style={
          selectionComplete && stableMainHeightRef.current
            ? { minHeight: stableMainHeightRef.current }
            : undefined
        }
      >
      {!selectionComplete ? (
        <>
          <div className="ds-eyebrow">Stel samen</div>
          <h2 className="ds-title">Veeg of tik per taak.</h2>
          {maxSlots > 0 ? (
            <p className="ds-sub">
              Max {maxSlots} {maxSlots === 1 ? "taak" : "taken"} bij{" "}
              {energyLabel(maxSlots)} energie. Veeg de kaart of gebruik de knoppen.
            </p>
          ) : null}
        </>
      ) : null}

      {selectionComplete ? (
        <div className="ds-swipe-complete">
          <div className="ds-check-circle" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12L10 17L19 7"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="ds-swipe-complete-title">Focus compleet voor vandaag.</p>
        </div>
      ) : (
        <div className="ds-swipe-deck">
          {queue.slice(0, 3).map((t, idx) => {
            const isTop = idx === 0;
            const analysis = analyzeDagstartKeep(
              t,
              kept,
              maxSlots,
              extraDeadlineSlots
            );
            const keepBlocked =
              analysis.kind === "reject" ||
              (analysis.kind === "overflow" && !onRequestDeadlineOverflow);
            return (
              <SwipeCard
                key={t.id}
                task={t}
                depth={idx}
                isTop={isTop}
                keepDisabled={isTop && keepBlocked && !t.deadline}
                onDecide={(action) => decide(t.id, action)}
              />
            );
          })}
        </div>
      )}

      </div>

      <div className="ds-swipe-dock">
        <span>
          <strong style={{ color: "var(--st-ink)", fontWeight: 600 }}>
            {kept.length}/{slotCapacity}
          </strong>
          {" · vandaag"}
        </span>
        <span style={{ fontFamily: "var(--st-mono)", fontSize: 12 }}>
          {totalMin} min totaal
        </span>
        <button
          type="button"
          className="ds-link primary"
          onClick={finishSwipe}
          style={{ padding: "4px 12px" }}
        >
          {selectionComplete ? "klaar ✓" : "klaar →"}
        </button>
      </div>
    </div>
  );
}

type SwipeCardProps = {
  task: DagstartTaskCard;
  depth: number;
  isTop: boolean;
  keepDisabled?: boolean;
  onDecide: (action: "keep" | "skip") => void;
};

function energyLabel(maxSlots: number): string {
  if (maxSlots === 1) return "lage";
  if (maxSlots === 2) return "normale";
  return "hoge";
}

function SwipeCard({
  task,
  depth,
  isTop,
  keepDisabled = false,
  onDecide,
}: SwipeCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{ x: number; active: boolean }>({
    x: 0,
    active: false,
  });
  const startX = useRef(0);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isTop) return;
    startX.current = e.clientX;
    setDrag({ x: 0, active: true });
    try {
      ref.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.active) setDrag({ x: e.clientX - startX.current, active: true });
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.active) return;
    const threshold = 90;
    if (drag.x > threshold) {
      if (keepDisabled) {
        setDrag({ x: 0, active: false });
        return;
      }
      setDrag({ x: 500, active: false });
      setTimeout(() => onDecide("keep"), 220);
    } else if (drag.x < -threshold) {
      setDrag({ x: -500, active: false });
      setTimeout(() => onDecide("skip"), 220);
    } else {
      setDrag({ x: 0, active: false });
    }
    try {
      ref.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const e =
    DAGSTART_ENERGIES.find((x) => x.id === task.energy) ?? DAGSTART_ENERGIES[1];
  const intent: "keep" | "skip" | null =
    drag.x > 30 ? "keep" : drag.x < -30 ? "skip" : null;
  const rot = drag.x / 20;
  const baseY = depth * 6;
  const baseScale = 1 - depth * 0.04;

  return (
    <div
      ref={ref}
      className={`ds-swipe-card${isTop ? " is-top" : ""}`}
      style={{
        transform: `translate(${isTop ? drag.x : 0}px, ${baseY}px) scale(${baseScale}) rotate(${
          isTop ? rot : 0
        }deg)`,
        opacity: isTop ? 1 : 1 - depth * 0.12,
        transition: drag.active
          ? "none"
          : "transform 280ms cubic-bezier(0.2,0.9,0.25,1), opacity 200ms",
        zIndex: 10 - depth,
        pointerEvents: isTop ? "auto" : "none",
      }}
    >
      {isTop && intent ? (
        <div className="ds-swipe-intent" data-intent={intent}>
          {intent === "keep" ? "Vandaag" : "Niet nu"}
        </div>
      ) : null}

      <div
        className="ds-swipe-card-drag"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className="ds-swipe-card-top">
          <Battery level={e.level} color={e.color} size={20} />
          <span className="ds-swipe-duration">{task.minutes} min</span>
        </div>

        <h3 className="ds-swipe-title">{task.title}</h3>

        {task.deadline ? (
          <div
            className="ds-swipe-deadline"
            data-overdue={task.overdue ? "true" : undefined}
          >
            {task.deadline}
          </div>
        ) : null}
      </div>

      {isTop ? (
        <div className="ds-swipe-actions">
          <button
            type="button"
            className="ds-swipe-action skip"
            aria-label="Niet nu"
            onClick={() => {
              setDrag({ x: -500, active: false });
              setTimeout(() => onDecide("skip"), 220);
            }}
          >
            ← niet nu
          </button>
          <button
            type="button"
            className="ds-swipe-action keep"
            aria-label="Vandaag"
            disabled={keepDisabled}
            style={keepDisabled ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
            onClick={() => {
              if (keepDisabled) return;
              setDrag({ x: 500, active: false });
              setTimeout(() => onDecide("keep"), 220);
            }}
          >
            vandaag →
          </button>
        </div>
      ) : null}
    </div>
  );
}
