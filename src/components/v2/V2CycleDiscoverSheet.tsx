"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { useI18n } from "@/lib/i18n";

import V2CycleSetupFields, {
  readV2CycleSetupDefaults,
  type V2CycleSetupValues,
} from "./V2CycleSetupFields";
import { V2SettingsToggle } from "./V2SettingsUi";
import {
  CYCLE_DISCOVER_SWIPE_CLOSE_PX,
  CYCLE_DISCOVER_SWIPE_OPEN_PX,
  isCycleDiscoverDragSlopExceeded,
  shouldCloseCycleDiscoverFromSwipe,
  shouldOpenCycleDiscoverFromSwipe,
} from "./v2CycleDiscoverSwipe";
import { V2SheetPortal } from "./v2SheetPortal";

function CycleDiscoverIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="14" r="7.5" fill="#2d5a56" fillOpacity="0.88" />
      <circle
        cx="17.5"
        cy="14"
        r="7.5"
        fill="#a89bc8"
        fillOpacity="0.72"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1"
      />
    </svg>
  );
}

function Chevron({ direction }: { direction: "up" | "down" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={direction === "up" ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HowStep({
  n,
  before,
  em,
  after,
}: {
  n: number;
  before: string;
  em: string;
  after: string;
}) {
  return (
    <li className="v2-cycle-discover-sheet__how-item">
      <span className="v2-cycle-discover-sheet__how-n" aria-hidden>
        {n}
      </span>
      <span>
        {before}
        <strong>{em}</strong>
        {after}
      </span>
    </li>
  );
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "button, a, [role='switch'], input, label, .v2-cycle-setup__fields, .v2-cycle-datepicker",
    ),
  );
}

/**
 * Soft bottom hint voor guest-onboarding.
 * Tik of swipe-omhoog opent de uitgebreide cyclus-uitleg.
 * Blijft zichtbaar als cyclus aan staat (Aanpassen), tot Nee dismiss’t.
 * Niet op dagstart of landing-phone-mocks.
 */
export function V2CycleDiscoverHint({
  onOpen,
  optedIn = false,
}: {
  onOpen: () => void;
  optedIn?: boolean;
}) {
  const { t } = useI18n();
  const startY = useRef<number | null>(null);
  const moved = useRef(false);
  const [dragY, setDragY] = useState(0);

  const resetDrag = useCallback(() => {
    startY.current = null;
    setDragY(0);
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    startY.current = e.clientY;
    moved.current = false;
    setDragY(0);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const start = startY.current;
    if (start == null) return;
    const delta = e.clientY - start;
    if (isCycleDiscoverDragSlopExceeded(delta)) moved.current = true;
    // Alleen omhoog visueel meebewegen (hint tilt).
    setDragY(Math.min(0, delta));
  };

  const endDrag = (clientY: number) => {
    const start = startY.current;
    if (start == null) return;
    const delta = clientY - start;
    resetDrag();
    if (shouldOpenCycleDiscoverFromSwipe(delta, CYCLE_DISCOVER_SWIPE_OPEN_PX)) {
      onOpen();
    }
  };

  return (
    <button
      type="button"
      className="v2-cycle-discover-hint"
      onClick={(e) => {
        if (moved.current) {
          e.preventDefault();
          return;
        }
        onOpen();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e.clientY)}
      onPointerCancel={resetDrag}
      aria-label={
        optedIn ? t("cycle.discoverHintOnAria") : t("cycle.discoverHintAria")
      }
      style={
        dragY < 0
          ? { transform: `translateY(${dragY}px)`, transition: "none" }
          : undefined
      }
    >
      <span className="v2-cycle-discover-hint__handle" aria-hidden />
      <span className="v2-cycle-discover-hint__icon" aria-hidden>
        <CycleDiscoverIcon size={26} />
      </span>
      <span className="v2-cycle-discover-hint__label">
        <span className="v2-cycle-discover-hint__eyebrow">
          {optedIn
            ? t("cycle.discoverHintOnEyebrow")
            : t("cycle.discoverHintEyebrow")}
        </span>
        <span className="v2-cycle-discover-hint__text">
          {optedIn ? t("cycle.discoverHintOn") : t("cycle.discoverHint")}
        </span>
      </span>
      <span className="v2-cycle-discover-hint__chevron" aria-hidden>
        <Chevron direction="up" />
      </span>
    </button>
  );
}

type V2CycleDiscoverSheetProps = {
  open: boolean;
  enabled: boolean;
  onClose: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onNotNow: () => void;
  /** Bij Klaar / bevestigen: sla periode + lengtes op (geen stille dag-1). */
  onConfirmSetup: (values: V2CycleSetupValues) => void;
};

/**
 * Uitgebreide discovery-sheet: inzicht + reminder, nooit sturing.
 * Swipe-omlaag (handle/header) of backdrop sluit zonder keuze; Nee dismiss’t discovery.
 * Aan toont setup-velden; Klaar slaat start/lengte/menstruatie op.
 */
export default function V2CycleDiscoverSheet({
  open,
  enabled,
  onClose,
  onEnable,
  onDisable,
  onNotNow,
  onConfirmSetup,
}: V2CycleDiscoverSheetProps) {
  const { t } = useI18n();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragMoved = useRef(false);
  const dragFromGrab = useRef(false);
  const [dragY, setDragY] = useState(0);
  const [setupValues, setSetupValues] = useState<V2CycleSetupValues>(
    readV2CycleSetupDefaults,
  );

  useEffect(() => {
    if (open && enabled) {
      setSetupValues(readV2CycleSetupDefaults());
    }
  }, [open, enabled]);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      dragStartY.current = null;
      dragMoved.current = false;
      dragFromGrab.current = false;
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const beginDrag = useCallback(
    (e: ReactPointerEvent<HTMLElement>, fromGrab: boolean) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (isInteractiveTarget(e.target)) return;
      dragStartY.current = e.clientY;
      dragMoved.current = false;
      dragFromGrab.current = fromGrab;
      setDragY(0);
      try {
        panelRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartY.current;
    if (start == null) return;
    const delta = Math.max(0, e.clientY - start);
    if (isCycleDiscoverDragSlopExceeded(delta)) dragMoved.current = true;
    setDragY(delta);
  }, []);

  const endDrag = useCallback(
    (clientY: number) => {
      const start = dragStartY.current;
      dragStartY.current = null;
      if (start == null) return;
      const delta = clientY - start;
      const moved = dragMoved.current;
      const fromGrab = dragFromGrab.current;
      dragMoved.current = false;
      dragFromGrab.current = false;
      setDragY(0);
      if (shouldCloseCycleDiscoverFromSwipe(delta, CYCLE_DISCOVER_SWIPE_CLOSE_PX)) {
        onClose();
        return;
      }
      // Tap op de grab-handle (zonder drag) blijft sluiten; chevron is secundair.
      if (fromGrab && !moved) onClose();
    },
    [onClose],
  );

  const setEnabled = (on: boolean) => {
    if (on === enabled) return;
    if (on) onEnable();
    else onDisable();
  };

  if (!open) return null;

  const footer: ReactNode = (
    <p className="v2-cycle-discover-sheet__footer">
      {t("cycle.discoverSettingsBefore")}
      <Link
        href="/settings?section=cyclus"
        className="v2-cycle-discover-sheet__footer-link"
        onClick={onClose}
      >
        {t("cycle.discoverSettingsLink")}
      </Link>
      {t("cycle.discoverSettingsAfter")}
    </p>
  );

  return (
    <V2SheetPortal>
      <div className="v2-info-sheet v2-cycle-discover-sheet" role="presentation">
        <button
          type="button"
          className="v2-info-sheet__backdrop"
          aria-label={t("cycle.discoverCloseAria")}
          onClick={onClose}
        />
        <div
          ref={panelRef}
          id="v2-cycle-discover-sheet"
          className="v2-info-sheet__panel v2-cycle-discover-sheet__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={
            dragY > 0
              ? { transform: `translateY(${dragY}px)`, transition: "none" }
              : undefined
          }
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e.clientY)}
          onPointerCancel={() => {
            dragStartY.current = null;
            dragMoved.current = false;
            dragFromGrab.current = false;
            setDragY(0);
          }}
        >
          <div
            className="v2-cycle-discover-sheet__grab"
            data-sheet-drag
            role="button"
            tabIndex={0}
            aria-label={t("cycle.discoverCloseAria")}
            onPointerDown={(e) => beginDrag(e, true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClose();
              }
            }}
          >
            <span className="v2-cycle-discover-hint__handle" aria-hidden />
          </div>

          <div
            className={[
              "v2-cycle-discover-sheet__head",
              enabled ? "v2-cycle-discover-sheet__head--setup" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-sheet-drag
            onPointerDown={(e) => beginDrag(e, false)}
          >
            {enabled ? null : (
              <span className="v2-cycle-discover-sheet__head-icon" aria-hidden>
                <CycleDiscoverIcon size={30} />
              </span>
            )}
            <div className="v2-cycle-discover-sheet__head-copy">
              {enabled ? null : (
                <p className="v2-cycle-discover-sheet__eyebrow">
                  {t("cycle.discoverEyebrow")}
                </p>
              )}
              <h2 id={titleId} className="v2-cycle-discover-sheet__title">
                {enabled
                  ? t("cycle.discoverSetupTitle")
                  : t("cycle.discoverTitle")}
              </h2>
            </div>
            <button
              type="button"
              className="v2-cycle-discover-sheet__collapse"
              aria-label={t("cycle.discoverCloseAria")}
              onClick={onClose}
            >
              <Chevron direction="down" />
            </button>
          </div>

          <div
            className={[
              "v2-cycle-discover-sheet__scroll",
              enabled ? "v2-cycle-discover-sheet__scroll--setup" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {enabled ? (
              <section
                className="v2-cycle-discover-sheet__setup"
                aria-labelledby={titleId}
              >
                <V2CycleSetupFields
                  key={`setup-${open}-${enabled}`}
                  compact
                  onChange={setSetupValues}
                />
              </section>
            ) : (
              <>
                <p className="v2-cycle-discover-sheet__body">
                  {t("cycle.discoverBody")}
                </p>

                <div className="v2-cycle-discover-sheet__toggle-card">
                  <div className="v2-cycle-discover-sheet__toggle-copy">
                    <p className="v2-cycle-discover-sheet__toggle-title">
                      {t("cycle.discoverToggleLabel")}
                    </p>
                    <p className="v2-cycle-discover-sheet__toggle-status">
                      {t("cycle.discoverToggleOff")}
                    </p>
                  </div>
                  <V2SettingsToggle
                    checked={false}
                    onChange={() => setEnabled(true)}
                    ariaLabel={t("cycle.discoverToggleLabel")}
                  />
                </div>

                <section
                  className="v2-cycle-discover-sheet__why"
                  aria-labelledby={`${titleId}-why`}
                >
                  <h3
                    id={`${titleId}-why`}
                    className="v2-cycle-discover-sheet__why-title"
                  >
                    {t("cycle.discoverWhyTitle")}
                  </h3>
                  <p className="v2-cycle-discover-sheet__why-body">
                    {t("cycle.discoverWhyBody")}
                  </p>
                </section>

                <section
                  className="v2-cycle-discover-sheet__how"
                  aria-labelledby={`${titleId}-how`}
                >
                  <h3
                    id={`${titleId}-how`}
                    className="v2-cycle-discover-sheet__how-title"
                  >
                    {t("cycle.discoverHowTitle")}
                  </h3>
                  <ol className="v2-cycle-discover-sheet__how-list">
                    <HowStep
                      n={1}
                      before={t("cycle.discoverHow1Before")}
                      em={t("cycle.discoverHow1Em")}
                      after={t("cycle.discoverHow1After")}
                    />
                    <HowStep
                      n={2}
                      before={t("cycle.discoverHow2Before")}
                      em={t("cycle.discoverHow2Em")}
                      after={t("cycle.discoverHow2After")}
                    />
                    <HowStep
                      n={3}
                      before={t("cycle.discoverHow3Before")}
                      em={t("cycle.discoverHow3Em")}
                      after={t("cycle.discoverHow3After")}
                    />
                  </ol>
                </section>
              </>
            )}
          </div>

          <div className="v2-cycle-discover-sheet__foot">
            <div className="v2-cycle-discover-sheet__actions">
              {enabled ? (
                <>
                  <button
                    type="button"
                    className="btn-ghost v2-cycle-discover-sheet__cta-no"
                    onClick={() => {
                      onDisable();
                    }}
                  >
                    {t("cycle.discoverDisable")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary v2-cycle-discover-sheet__cta-yes"
                    onClick={() => {
                      onConfirmSetup(setupValues);
                      onClose();
                    }}
                  >
                    {t("cycle.discoverDone")}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-ghost v2-cycle-discover-sheet__cta-no"
                    onClick={onNotNow}
                  >
                    {t("cycle.discoverNotNow")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary v2-cycle-discover-sheet__cta-yes"
                    onClick={() => {
                      onEnable();
                    }}
                  >
                    {t("cycle.discoverEnable")}
                  </button>
                </>
              )}
            </div>
            {footer}
          </div>
        </div>
      </div>
    </V2SheetPortal>
  );
}
