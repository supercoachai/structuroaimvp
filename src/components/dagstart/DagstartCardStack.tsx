"use client";

import { useLayoutEffect, useRef, useState, useCallback, useEffect } from 'react';
import DeadlineLabel from '@/components/structuro/DeadlineLabel';
import NewTaskFlow from '@/components/newTask/NewTaskFlow';
import type { NewTaskFlowPayload } from '@/lib/newTask/newTaskFlowTypes';
import { ST_ENERGY_DOT, appEnergyToSt, type StEnergyId } from '@/lib/structuro/energyTokens';
import { getDagstartCardDeadline } from '@/lib/taskDeadlineDisplay';

export type DagstartCardTask = {
  id: string;
  title: string;
  minutes: number;
  energy: StEnergyId;
  tone?: string;
  deadline?: string | null;
  overdue?: boolean;
};

type DagstartCardStackProps = {
  queue: DagstartCardTask[];
  onDecide: (id: string, action: 'keep' | 'skip') => void;
  emptyTitle: string;
  emptyHint: string;
  skipLabel: string;
  keepLabel: string;
  asksLabel: string;
  energyAskLabels: Record<'laag' | 'gem' | 'hoog', string>;
  swipeSkipHint: string;
  swipeKeepHint: string;
  swipeExhausted?: boolean;
  allSelected?: boolean;
  allSelectedTitle?: string;
  allSelectedSub?: string;
  exhaustedTitle?: string;
  exhaustedSub?: string;
  reviewAgainLabel?: string;
  addAnywayLabel?: string;
  onReviewAgain?: () => void;
  addOpen?: boolean;
  onAddAnywayClick?: () => void;
  onAddSave?: (payload: NewTaskFlowPayload) => void | Promise<void>;
  onAddClose?: () => void;
  addBusy?: boolean;
  className?: string;
};

export default function DagstartCardStack({
  queue,
  onDecide,
  emptyTitle,
  emptyHint,
  skipLabel,
  keepLabel,
  asksLabel,
  energyAskLabels,
  swipeSkipHint,
  swipeKeepHint,
  swipeExhausted = false,
  allSelected = false,
  allSelectedTitle,
  allSelectedSub,
  exhaustedTitle,
  exhaustedSub,
  reviewAgainLabel,
  addAnywayLabel,
  onReviewAgain,
  addOpen = false,
  onAddAnywayClick,
  onAddSave,
  onAddClose,
  addBusy = false,
  className = '',
}: DagstartCardStackProps) {
  const [displayQueue, setDisplayQueue] = useState(queue);
  const queueSig = queue.map((q) => q.id).join('\0');

  useEffect(() => {
    setDisplayQueue((prev) => {
      if (prev.length === 0) return queue;
      const prevFront = prev[0]?.id;
      const propFront = queue[0]?.id;
      if (prevFront && propFront === prevFront) return queue;
      if (prevFront && !queue.some((q) => q.id === prevFront)) return queue;
      if (prevFront && propFront !== prevFront) return prev;
      return queue;
    });
  }, [queue, queueSig]);

  const handleSwipeDecide = useCallback(
    (id: string, action: 'keep' | 'skip') => {
      setDisplayQueue((prev) => (prev[0]?.id === id ? prev.slice(1) : prev));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => onDecide(id, action));
      });
    },
    [onDecide]
  );

  const topTask = displayQueue[0] ?? null;
  const shadowCount = Math.min(2, Math.max(0, displayQueue.length - 1));

  if (allSelected) {
    return (
      <div className={`relative flex min-h-0 w-full flex-1 flex-col justify-center py-1 sm:py-2 ${className}`.trim()}>
        <AllTasksSelectedCard
          title={allSelectedTitle ?? ''}
          sub={allSelectedSub ?? ''}
        />
      </div>
    );
  }

  if (swipeExhausted) {
    return (
      <div className={`relative flex min-h-0 w-full flex-1 flex-col justify-center overflow-hidden py-1 sm:py-2 ${className}`.trim()}>
        <SwipeExhaustedCard
          title={exhaustedTitle ?? ''}
          sub={exhaustedSub ?? ''}
          reviewAgainLabel={reviewAgainLabel ?? ''}
          addAnywayLabel={addAnywayLabel ?? ''}
          onReviewAgain={onReviewAgain}
          addOpen={addOpen}
          onAddAnywayClick={onAddAnywayClick}
          onAddSave={onAddSave}
          onAddClose={onAddClose}
          addBusy={addBusy}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex min-h-0 w-full flex-1 flex-col items-center justify-center py-1 sm:py-2 ${className}`.trim()}
    >
      {!topTask ? (
        <div
          className="flex w-full max-w-sm flex-col items-center justify-center gap-1.5 rounded-[20px] border-[1.5px] border-dashed px-4 py-6 sm:px-5 sm:py-8"
          style={{
            borderColor: 'var(--st-line-strong)',
            color: 'var(--st-muted)',
          }}
        >
          <div className="text-xs font-medium sm:text-sm">{emptyTitle}</div>
          <div className="text-[10px] sm:text-xs">{emptyHint}</div>
        </div>
      ) : (
        <>
          <SwipeDeckStack
            topTask={topTask}
            shadowCount={shadowCount}
            onDecide={(action) => handleSwipeDecide(topTask.id, action)}
            skipLabel={skipLabel}
            keepLabel={keepLabel}
            asksLabel={asksLabel}
            energyAskLabels={energyAskLabels}
          />
          <div className="mt-1.5 flex shrink-0 justify-center gap-2 text-[10px] uppercase tracking-widest text-[var(--st-muted-2)] sm:mt-2 sm:gap-3.5 sm:text-xs">
            <span>← {swipeSkipHint}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{swipeKeepHint} →</span>
          </div>
        </>
      )}
    </div>
  );
}

function AllTasksSelectedCard({ title, sub }: { title: string; sub: string }) {
  return (
    <div
      className="flex w-full flex-col items-center rounded-[20px] px-6 py-10 text-center"
      style={{
        background: '#ECFDF5',
        boxShadow:
          '0 0 0 0.5px rgba(14,23,48,0.10), 0 1px 0 rgba(255,255,255,0.65) inset, 0 10px 28px -8px rgba(14,23,48,0.12)',
      }}
    >
      <div
        className="mb-4 flex items-center justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          background: 'rgba(34, 197, 94, 0.15)',
        }}
        aria-hidden
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 12.5L10 16.5L18 8"
            stroke="var(--st-green)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3
        style={{
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: '-0.015em',
          color: 'var(--st-ink)',
          marginBottom: 6,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: 'var(--st-muted)',
          lineHeight: 1.45,
        }}
      >
        {sub}
      </p>
    </div>
  );
}

function SwipeExhaustedCard({
  title,
  sub,
  reviewAgainLabel,
  addAnywayLabel,
  onReviewAgain,
  addOpen,
  onAddAnywayClick,
  onAddSave,
  onAddClose,
  addBusy,
}: {
  title: string;
  sub: string;
  reviewAgainLabel: string;
  addAnywayLabel: string;
  onReviewAgain?: () => void;
  addOpen: boolean;
  onAddAnywayClick?: () => void;
  onAddSave?: (payload: NewTaskFlowPayload) => void | Promise<void>;
  onAddClose?: () => void;
  addBusy: boolean;
}) {
  return (
    <div
      className="flex w-full flex-col rounded-[20px] px-5 py-5"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%)',
        boxShadow:
          '0 0 0 0.5px rgba(14,23,48,0.10), 0 1px 0 rgba(255,255,255,0.65) inset, 0 10px 28px -8px rgba(14,23,48,0.12)',
      }}
    >
      <h3
        style={{
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: '-0.015em',
          color: 'var(--st-ink)',
          marginBottom: 6,
          textAlign: 'center',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: 'var(--st-muted)',
          lineHeight: 1.45,
          marginBottom: 20,
          textAlign: 'center',
        }}
      >
        {sub}
      </p>

      {addOpen ? (
        <div className="max-h-[min(520px,62dvh)] min-h-[360px] overflow-hidden">
          <NewTaskFlow
            variant="compact"
            mode="panel"
            saving={addBusy}
            onClose={onAddClose}
            onSave={async (payload) => {
              await onAddSave?.(payload);
            }}
            className="h-full shadow-none"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => onReviewAgain?.()}
            className="st-btn-primary w-full border-0"
            style={{ height: 44, fontSize: 14 }}
          >
            {reviewAgainLabel}
          </button>
          <button
            type="button"
            onClick={() => onAddAnywayClick?.()}
            className="st-btn-ghost"
            style={{ height: 44, fontSize: 14 }}
          >
            {addAnywayLabel}
          </button>
        </div>
      )}
    </div>
  );
}

const CARD_RADIUS = 16;
const SWIPE_EXIT_MS = 300;
const SWIPE_THRESHOLD = 90;
const INTENT_SHOW = 36;
const INTENT_HIDE = 20;

function applyCardTransform(el: HTMLElement, x: number, y: number) {
  el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${x / 18}deg)`;
}

function StackLayerCard({
  depth,
  height,
  promote,
}: {
  depth: 2 | 3;
  height: number;
  promote: boolean;
}) {
  const isCard2 = depth === 2;
  const restingTop = isCard2 ? 14 : 26;
  const restingScaleX = isCard2 ? 0.94 : 0.88;
  const restingOpacity = isCard2 ? 0.5 : 0.25;

  const top = isCard2 && promote ? 0 : restingTop;
  const scaleX = isCard2 && promote ? 1 : restingScaleX;
  const opacity = isCard2 && promote ? 1 : restingOpacity;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bg-white shadow-sm"
      style={{
        height,
        top,
        zIndex: isCard2 ? 2 : 1,
        borderRadius: CARD_RADIUS,
        opacity,
        transform: `scaleX(${scaleX})`,
        transformOrigin: 'center top',
        transition:
          promote && isCard2
            ? 'top 200ms ease-out, transform 200ms ease-out, opacity 200ms ease-out'
            : isCard2
              ? 'top 160ms ease-out, transform 160ms ease-out, opacity 160ms ease-out'
              : 'none',
      }}
    />
  );
}

function SwipeDeckStack({
  topTask,
  shadowCount,
  onDecide,
  skipLabel,
  keepLabel,
  asksLabel,
  energyAskLabels,
}: {
  topTask: DagstartCardTask;
  shadowCount: number;
  onDecide: (action: 'keep' | 'skip') => void;
  skipLabel: string;
  keepLabel: string;
  asksLabel: string;
  energyAskLabels: Record<'laag' | 'gem' | 'hoog', string>;
}) {
  const activeRef = useRef<HTMLDivElement>(null);
  const stableHeightRef = useRef(0);
  const outgoingTaskRef = useRef<DagstartCardTask | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const swipe = useDeckCardSwipe(onDecide, topTask.id, {
    onExitStart: (taskId) => {
      if (topTask.id === taskId) outgoingTaskRef.current = topTask;
    },
    onExitEnd: () => {
      outgoingTaskRef.current = null;
    },
  });

  const displayTask =
    swipe.exiting && outgoingTaskRef.current ? outgoingTaskRef.current : topTask;

  useLayoutEffect(() => {
    const el = activeRef.current;
    if (!el) return;

    const measure = () => {
      const next = el.offsetHeight;
      if (next <= 0) return;
      if (Math.abs(next - stableHeightRef.current) < 2) return;
      stableHeightRef.current = next;
      setCardHeight(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [displayTask.id]);

  const stackHeight = cardHeight > 0 ? cardHeight : stableHeightRef.current || 120;

  return (
    <div
      className="relative w-full max-w-sm overflow-visible"
      style={{ paddingBottom: shadowCount >= 2 ? 26 : shadowCount >= 1 ? 14 : 0 }}
    >
      {shadowCount >= 2 ? (
        <StackLayerCard depth={3} height={stackHeight} promote={swipe.stackPromote} />
      ) : null}
      {shadowCount >= 1 ? (
        <StackLayerCard depth={2} height={stackHeight} promote={swipe.stackPromote} />
      ) : null}
      <DeckCard
        ref={activeRef}
        task={displayTask}
        swipe={swipe}
        skipLabel={skipLabel}
        keepLabel={keepLabel}
        asksLabel={asksLabel}
        energyAskLabels={energyAskLabels}
      />
    </div>
  );
}

function DeckCard({
  task,
  swipe,
  skipLabel,
  keepLabel,
  asksLabel,
  energyAskLabels,
  ref,
}: {
  task: DagstartCardTask;
  swipe: ReturnType<typeof useDeckCardSwipe>;
  skipLabel: string;
  keepLabel: string;
  asksLabel: string;
  energyAskLabels: Record<'laag' | 'gem' | 'hoog', string>;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const energyKey = appEnergyToSt(task.energy);
  const toneColor = ST_ENERGY_DOT[energyKey].color;
  const toneBg = ST_ENERGY_DOT[energyKey].bg;
  const energyAskText =
    energyKey === 'laag' || energyKey === 'gem' || energyKey === 'hoog'
      ? energyAskLabels[energyKey]
      : energyAskLabels.gem;
  const { cardRef, intent, exiting, stackPromote, isDragging, onPointerDown, onPointerMove, onPointerUp, finish } =
    swipe;

  const setRefs = (node: HTMLDivElement | null) => {
    cardRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <div
      ref={setRefs}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative z-10 w-full shrink-0 flex-col overflow-hidden rounded-[16px] p-3.5 sm:p-4"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%)',
        boxShadow:
          '0 0 0 0.5px rgba(14,23,48,0.10), 0 1px 0 rgba(255,255,255,0.65) inset, 0 6px 18px -6px rgba(14,23,48,0.12)',
        cursor: exiting ? 'default' : isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        pointerEvents: exiting ? 'none' : 'auto',
        transformOrigin: 'center top',
      }}
    >
      {intent ? (
        <div
          style={{
            position: 'absolute',
            top: 14,
            ...(intent === 'keep' ? { left: 14 } : { right: 14 }),
            padding: '5px 11px',
            borderRadius: 999,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'white',
            background: intent === 'keep' ? 'var(--st-green)' : 'var(--st-muted)',
            transform: `rotate(${intent === 'keep' ? -6 : 6}deg)`,
            boxShadow: '0 4px 10px -2px rgba(14,23,48,0.20)',
          }}
        >
          {intent === 'keep' ? keepLabel : skipLabel}
        </div>
      ) : null}

      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span
          className="uppercase"
          style={{
            fontSize: 10,
            color: 'var(--st-muted)',
            letterSpacing: '0.16em',
            fontWeight: 700,
          }}
        >
          {task.tone || 'Taak'}
        </span>
        <div className="flex items-center gap-1.5">
          {task.deadline ? (
            <DeadlineLabel deadline={task.deadline} overdue={task.overdue} compact showCalendarIcon />
          ) : null}
          <span
            className="st-mono"
            style={{
              fontSize: 12,
              color: 'var(--st-ink-soft)',
              padding: '3px 9px',
              borderRadius: 999,
              background: 'var(--st-surface-2)',
              border: '1px solid var(--st-line)',
            }}
          >
            {task.minutes} min
          </span>
        </div>
      </div>

      <h2 className="mb-2 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-[var(--st-ink)] sm:text-base">
        {task.title}
      </h2>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
          style={{
            background: toneBg,
            color: toneColor,
            fontSize: 11.5,
            fontWeight: 600,
          }}
          aria-label={`${asksLabel} ${energyAskText}`}
        >
          <span
            style={{ width: 7, height: 7, borderRadius: '50%', background: toneColor }}
            aria-hidden
          />
          {energyAskText}
        </span>
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            finish('skip');
          }}
          disabled={exiting}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[11px] border bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            height: 36,
            background: 'var(--st-surface-2)',
            borderColor: 'var(--st-line)',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--st-muted)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
            <path
              d="M11 3L3 11M3 3L11 11"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          {skipLabel}
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            finish('keep');
          }}
          disabled={exiting}
          className="st-btn-primary st-btn-success flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-0 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ height: 36, padding: 0, fontSize: 13 }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
            <path
              d="M3 7L6 10L11 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {keepLabel}
        </button>
      </div>
    </div>
  );
}

function useDeckCardSwipe(
  onDecide: (action: 'keep' | 'skip') => void,
  taskId: string,
  callbacks?: {
    onExitStart?: (taskId: string) => void;
    onExitEnd?: () => void;
  }
) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ x: 0, y: 0, active: false });
  const [intent, setIntent] = useState<'keep' | 'skip' | null>(null);
  const [phase, setPhase] = useState<'idle' | 'dragging' | 'exiting'>('idle');
  const [stackPromote, setStackPromote] = useState(false);
  const intentRef = useRef<'keep' | 'skip' | null>(null);
  const phaseRef = useRef<'idle' | 'dragging' | 'exiting'>('idle');
  const startRef = useRef({ x: 0, y: 0 });
  const exitTimerRef = useRef<number | null>(null);
  const promoteTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const justExitedRef = useRef(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  phaseRef.current = phase;

  const clearMotionTimers = () => {
    if (exitTimerRef.current != null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (promoteTimerRef.current != null) {
      window.clearTimeout(promoteTimerRef.current);
      promoteTimerRef.current = null;
    }
    if (snapTimerRef.current != null) {
      window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const scheduleStackDemote = () => {
    if (promoteTimerRef.current != null) {
      window.clearTimeout(promoteTimerRef.current);
    }
    promoteTimerRef.current = window.setTimeout(() => {
      promoteTimerRef.current = null;
      setStackPromote(false);
    }, 180);
  };

  const resetCardMotion = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
    el.style.willChange = '';
  };

  const resetSwipeState = (options?: { keepPromote?: boolean }) => {
    clearMotionTimers();
    dragRef.current = { x: 0, y: 0, active: false };
    intentRef.current = null;
    setIntent(null);
    setPhase('idle');
    phaseRef.current = 'idle';
    if (options?.keepPromote) {
      scheduleStackDemote();
    } else {
      setStackPromote(false);
    }
    resetCardMotion();
    callbacksRef.current?.onExitEnd?.();
  };

  useLayoutEffect(() => {
    if (justExitedRef.current) {
      justExitedRef.current = false;
      resetSwipeState({ keepPromote: true });
      return;
    }
    resetSwipeState();
  }, [taskId]);

  useLayoutEffect(() => {
    return () => clearMotionTimers();
  }, []);

  const scheduleTransform = (x: number, y: number) => {
    dragRef.current = { x, y, active: true };
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = cardRef.current;
      if (!el || phaseRef.current === 'exiting') return;
      el.style.willChange = 'transform';
      el.style.transition = 'none';
      applyCardTransform(el, x, y);
    });
  };

  const updateIntent = (x: number) => {
    const current = intentRef.current;
    let next: 'keep' | 'skip' | null = current;
    if (current === 'keep') {
      if (x < INTENT_HIDE) next = x < -INTENT_SHOW ? 'skip' : null;
    } else if (current === 'skip') {
      if (x > -INTENT_HIDE) next = x > INTENT_SHOW ? 'keep' : null;
    } else if (x > INTENT_SHOW) {
      next = 'keep';
    } else if (x < -INTENT_SHOW) {
      next = 'skip';
    }
    if (next !== intentRef.current) {
      intentRef.current = next;
      setIntent(next);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (phaseRef.current === 'exiting') return;
    if ((e.target as HTMLElement).closest('button')) return;
    clearMotionTimers();
    startRef.current = { x: e.clientX, y: e.clientY };
    dragRef.current = { x: 0, y: 0, active: true };
    setPhase('dragging');
    const el = cardRef.current;
    if (el) {
      el.style.willChange = 'transform';
      el.style.transition = 'none';
    }
    try {
      cardRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || phaseRef.current === 'exiting') return;
    const x = e.clientX - startRef.current.x;
    const y = (e.clientY - startRef.current.y) * 0.3;
    scheduleTransform(x, y);
    updateIntent(x);
  };

  const finish = (action: 'keep' | 'skip') => {
    if (phaseRef.current === 'exiting') return;
    clearMotionTimers();
    callbacksRef.current?.onExitStart?.(taskId);
    phaseRef.current = 'exiting';
    setPhase('exiting');
    setStackPromote(true);
    intentRef.current = null;
    setIntent(null);

    const el = cardRef.current;
    const x = action === 'keep' ? 480 : -480;
    dragRef.current = { x, y: 0, active: false };

    requestAnimationFrame(() => {
      if (!el) return;
      el.style.willChange = 'transform, opacity';
      el.style.transition = `transform ${SWIPE_EXIT_MS}ms ease-out, opacity ${SWIPE_EXIT_MS - 60}ms ease-out`;
      applyCardTransform(el, x, 0);
      el.style.opacity = '0';
    });

    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      justExitedRef.current = true;
      onDecide(action);
    }, SWIPE_EXIT_MS);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const current = dragRef.current;
    if (!current.active || phaseRef.current === 'exiting') return;
    if (current.x > SWIPE_THRESHOLD) finish('keep');
    else if (current.x < -SWIPE_THRESHOLD) finish('skip');
    else {
      const el = cardRef.current;
      dragRef.current = { x: 0, y: 0, active: false };
      intentRef.current = null;
      setIntent(null);
      setPhase('idle');
      if (el) {
        el.style.transition = 'transform 200ms ease-out';
        applyCardTransform(el, 0, 0);
        snapTimerRef.current = window.setTimeout(() => {
          snapTimerRef.current = null;
          if (phaseRef.current === 'idle') resetCardMotion();
        }, 210);
      }
    }
    try {
      cardRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return {
    cardRef,
    intent,
    exiting: phase === 'exiting',
    stackPromote,
    isDragging: phase === 'dragging',
    onPointerDown,
    onPointerMove,
    onPointerUp,
    finish,
  };
}

export function taskToDagstartCard(
  task: {
  id: string;
  title: string;
  duration?: number | null;
  estimatedDuration?: number | null;
  energyLevel?: string | null;
  dueAt?: string | null;
  impact?: string | null;
},
  locale: 'nl' | 'en' = 'nl'
): DagstartCardTask {
  const minutes = task.duration || task.estimatedDuration || 15;
  const deadlineMeta = getDagstartCardDeadline(task.dueAt, locale);
  const overdue = deadlineMeta?.overdue ?? false;
  const deadline = deadlineMeta?.label ?? null;
  const impact = String(task.impact || '').trim();
  let tone = 'Taak';
  if (impact === '🚀' || impact === '🔥') tone = 'Focus';
  else if (impact === '📝' || impact === '🧩') tone = 'Admin';
  else if (impact === '💪' || impact === '⚡') tone = 'Contact';

  return {
    id: task.id,
    title: task.title,
    minutes,
    energy: appEnergyToSt(task.energyLevel),
    tone,
    deadline,
    overdue,
  };
}
