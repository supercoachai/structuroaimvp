"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  SWIPE_INTENT_PX,
  applySwipePointerMove,
  resolveSwipeCommit,
  shouldIgnoreSwipePointerDown,
  type SwipeDragPhase,
  type SwipePointerType,
} from "@/lib/dagstart/swipeCardGesture";

import { v2Styles } from "./theme";
import {
  v2SuggestionEnergyLabel,
  v2ThingCounter,
  v2ThingTitle,
} from "./v2Things";
import type { V2Energy, V2Suggestion } from "./V2Context";

const EXIT_MS = 220;

type V2SwipeDeckProps = {
  suggestions: V2Suggestion[];
  maxSlots: number;
  /** Al gekozen titels (bijv. na custom toevoegen). */
  initialKept?: string[];
  onDone: (kept: string[]) => void;
  onCustom: () => void;
  onSkipAll: () => void;
};

/**
 * Zelf-swipen in Variant F: één kaart tegelijk, swipe óf klik (desktop).
 * Rechts = bewaren, links = overslaan. Geen confetti, geen --st- tokens.
 */
export default function V2SwipeDeck({
  suggestions,
  maxSlots,
  initialKept = [],
  onDone,
  onCustom,
  onSkipAll,
}: V2SwipeDeckProps) {
  const [queue, setQueue] = useState<V2Suggestion[]>(() =>
    suggestions.filter((s) => !initialKept.includes(s.title)),
  );
  const [kept, setKept] = useState<string[]>(() => initialKept.slice(0, maxSlots));
  const [skipped, setSkipped] = useState<V2Suggestion[]>([]);
  const finishedRef = useRef(false);
  const initialKeptKey = initialKept.join("\u0001");

  useEffect(() => {
    finishedRef.current = false;
    const seed = initialKept.slice(0, maxSlots);
    setKept(seed);
    setQueue(suggestions.filter((s) => !seed.includes(s.title)));
    setSkipped([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialKeptKey dekt inhoud
  }, [suggestions, maxSlots, initialKeptKey]);

  const top = queue[0] ?? null;
  const remainingSlots = Math.max(0, maxSlots - kept.length);
  const full = kept.length >= maxSlots;
  const counter = v2ThingCounter(kept.length, maxSlots);

  const finishWith = useCallback(
    (titles: string[]) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onDone(titles.slice(0, maxSlots));
    },
    [maxSlots, onDone],
  );

  const decide = useCallback(
    (title: string, action: "keep" | "skip") => {
      setQueue((q) => {
        const idx = q.findIndex((c) => c.title === title);
        if (idx < 0) return q;
        const card = q[idx];
        const rest = [...q.slice(0, idx), ...q.slice(idx + 1)];

        if (action === "skip") {
          setSkipped((prev) =>
            prev.some((p) => p.title === card.title) ? prev : [...prev, card],
          );
          return rest;
        }

        setKept((current) => {
          if (current.includes(title) || current.length >= maxSlots) return current;
          const next = [...current, title];
          if (next.length >= maxSlots) {
            window.setTimeout(() => finishWith(next), EXIT_MS + 40);
          }
          return next;
        });
        return rest;
      });
    },
    [finishWith, maxSlots],
  );

  const reviewSkipped = () => {
    setQueue(skipped);
    setSkipped([]);
  };

  if (!top) {
    return (
      <>
        <h1 style={v2Styles.title}>Alle kaarten gehad.</h1>
        <p style={v2Styles.body}>
          {kept.length === 0
            ? "Niks gekozen, ook prima."
            : kept.length === 1
              ? "Dit ding staat klaar."
              : `${kept.length} dingen staan klaar.`}
        </p>
        {kept.length > 0 ? (
          <ul
            style={{
              margin: "0 0 8px",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {kept.map((t) => (
              <li key={t} className="v2-choice" style={{ cursor: "default", minHeight: 48 }}>
                {t}
              </li>
            ))}
          </ul>
        ) : null}
        <div style={v2Styles.softActions}>
          {kept.length > 0 ? (
            <button type="button" className="btn-primary w-full" onClick={() => finishWith(kept)}>
              Dit kies ik
            </button>
          ) : null}
          {skipped.length > 0 ? (
            <button type="button" className="btn-ghost w-full" onClick={reviewSkipped}>
              Overgeslagen nog eens bekijken
            </button>
          ) : null}
          <button type="button" className="v2-link" onClick={onCustom}>
            Iets anders
          </button>
          <button type="button" className="v2-link" onClick={onSkipAll}>
            Niks kiezen, ook goed
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 style={v2Styles.title}>{v2ThingTitle(maxSlots)}</h1>
      <p style={v2Styles.body}>
        Swipe of klik. Rechts bewaren, links overslaan.
      </p>
      {counter ? (
        <p style={{ ...v2Styles.body, marginTop: -4, color: "var(--text-muted)" }}>
          {counter}
        </p>
      ) : null}

      <div className="v2-swipe-deck" aria-live="polite">
        {queue.length > 1 ? <div className="v2-swipe-deck__shadow" aria-hidden /> : null}
        <V2SwipeCard
          key={top.title}
          suggestion={top}
          keepDisabled={full}
          onDecide={(action) => decide(top.title, action)}
        />
        <p className="v2-swipe-deck__hints" aria-hidden>
          <span>← Overslaan</span>
          <span>Bewaren →</span>
        </p>
      </div>

      {remainingSlots === 0 ? (
        <p style={{ ...v2Styles.body, color: "var(--text-muted)", textAlign: "center" }}>
          Je plekken zijn vol. Bevestig hieronder of sla de rest over.
        </p>
      ) : null}

      <div style={v2Styles.softActions}>
        {kept.length > 0 ? (
          <button type="button" className="btn-primary w-full" onClick={() => finishWith(kept)}>
            Klaar met kiezen
          </button>
        ) : null}
        <button type="button" className="v2-link" onClick={onCustom}>
          Iets anders
        </button>
        <button type="button" className="v2-link" onClick={onSkipAll}>
          Niks kiezen, ook goed
        </button>
      </div>
    </>
  );
}

function V2SwipeCard({
  suggestion,
  keepDisabled,
  onDecide,
}: {
  suggestion: V2Suggestion;
  keepDisabled: boolean;
  onDecide: (action: "keep" | "skip") => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<SwipeDragPhase | null>(null);
  const lastXRef = useRef(0);
  const [intent, setIntent] = useState<"keep" | "skip" | null>(null);
  const [exiting, setExiting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const exitTimer = useRef<number | null>(null);

  useLayoutEffect(() => {
    return () => {
      if (exitTimer.current != null) window.clearTimeout(exitTimer.current);
    };
  }, []);

  const applyTransform = (x: number, opacity = 1) => {
    const el = cardRef.current;
    if (!el) return;
    const rot = Math.max(-10, Math.min(10, x / 18));
    el.style.transform = `translate3d(${x}px, 0, 0) rotate(${rot}deg)`;
    el.style.opacity = String(opacity);
  };

  const finish = (action: "keep" | "skip") => {
    if (exiting) return;
    if (action === "keep" && keepDisabled) return;
    setExiting(true);
    setIntent(action);
    dragRef.current = null;
    const el = cardRef.current;
    const x = action === "keep" ? 420 : -420;
    if (el) {
      el.style.transition = `transform ${EXIT_MS}ms ease-out, opacity ${EXIT_MS - 40}ms ease-out`;
      applyTransform(x, 0);
    }
    exitTimer.current = window.setTimeout(() => {
      exitTimer.current = null;
      onDecide(action);
    }, EXIT_MS);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (exiting) return;
    if (shouldIgnoreSwipePointerDown(e.target)) return;
    const pointerType = (e.pointerType || "mouse") as SwipePointerType;
    dragRef.current = {
      x: 0,
      active: false,
      startX: e.clientX,
      pointerType,
    };
    lastXRef.current = 0;
    setDragging(false);
    setIntent(null);
    const el = cardRef.current;
    if (el) {
      el.style.transition = "none";
      applyTransform(0);
    }
    try {
      cardRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || exiting) return;
    const result = applySwipePointerMove(dragRef.current, e.clientX, e.buttons);
    if (result === "reset") {
      dragRef.current = null;
      setIntent(null);
      setDragging(false);
      applyTransform(0);
      return;
    }
    dragRef.current = result.next;
    lastXRef.current = result.dragX;
    setDragging(result.isDragging);
    if (!result.isDragging) return;
    applyTransform(result.dragX);
    if (result.dragX > SWIPE_INTENT_PX) setIntent(keepDisabled ? null : "keep");
    else if (result.dragX < -SWIPE_INTENT_PX) setIntent("skip");
    else setIntent(null);
  };

  const onPointerUp = () => {
    if (!dragRef.current || exiting) return;
    const currentX = lastXRef.current;
    dragRef.current = null;
    lastXRef.current = 0;
    setDragging(false);
    const commit = resolveSwipeCommit(currentX, keepDisabled);
    if (commit === "keep" || commit === "skip") {
      finish(commit);
      return;
    }
    const el = cardRef.current;
    if (el) {
      el.style.transition = "transform 160ms ease-out, opacity 160ms ease-out";
      applyTransform(0, 1);
    }
    setIntent(null);
  };

  const energy = suggestion.energy as V2Energy;

  return (
    <div
      ref={cardRef}
      className="v2-swipe-card"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        cursor: exiting ? "default" : dragging ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
        pointerEvents: exiting ? "none" : "auto",
      }}
    >
      {intent ? (
        <span
          className={`v2-swipe-card__badge v2-swipe-card__badge--${intent}`}
          aria-hidden
        >
          {intent === "keep" ? "Bewaren" : "Overslaan"}
        </span>
      ) : null}

      <p className="v2-swipe-card__eyebrow">Voorstel</p>
      <h2 className="v2-serif v2-swipe-card__title">{suggestion.title}</h2>
      <span className="v2-meta">{v2SuggestionEnergyLabel(energy)}</span>

      <div className="v2-swipe-card__actions">
        <button
          type="button"
          className="btn-ghost"
          disabled={exiting}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            finish("skip");
          }}
        >
          Overslaan
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={exiting || keepDisabled}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            finish("keep");
          }}
        >
          Bewaren
        </button>
      </div>
    </div>
  );
}
