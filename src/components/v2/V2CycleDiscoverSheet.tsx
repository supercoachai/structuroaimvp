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

import { V2SettingsToggle } from "./V2SettingsUi";

const SWIPE_OPEN_PX = 36;
const SWIPE_CLOSE_PX = 56;

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

/**
 * Soft bottom hint voor guest-onboarding.
 * Tik of swipe-omhoog opent de uitgebreide cyclus-uitleg.
 */
export function V2CycleDiscoverHint({
  onOpen,
}: {
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const startY = useRef<number | null>(null);

  const onPointerDown = (e: ReactPointerEvent) => {
    startY.current = e.clientY;
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const start = startY.current;
    startY.current = null;
    if (start == null) return;
    if (start - e.clientY >= SWIPE_OPEN_PX) {
      onOpen();
    }
  };

  return (
    <button
      type="button"
      className="v2-cycle-discover-hint"
      onClick={onOpen}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        startY.current = null;
      }}
      aria-label={t("cycle.discoverHintAria")}
    >
      <span className="v2-cycle-discover-hint__handle" aria-hidden />
      <span className="v2-cycle-discover-hint__icon" aria-hidden>
        <CycleDiscoverIcon size={26} />
      </span>
      <span className="v2-cycle-discover-hint__label">
        <span className="v2-cycle-discover-hint__eyebrow">
          {t("cycle.discoverHintEyebrow")}
        </span>
        <span className="v2-cycle-discover-hint__text">
          {t("cycle.discoverHint")}
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
  onClose: () => void;
  onEnable: () => void;
  onNotNow: () => void;
};

/**
 * Uitgebreide discovery-sheet: inzicht + reminder, nooit sturing.
 * Swipe-omlaag of backdrop sluit zonder keuze; Nee dismiss’t discovery.
 */
export default function V2CycleDiscoverSheet({
  open,
  onClose,
  onEnable,
  onNotNow,
}: V2CycleDiscoverSheetProps) {
  const { t } = useI18n();
  const titleId = useId();
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [previewOn, setPreviewOn] = useState(false);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setPreviewOn(false);
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

  const endDrag = useCallback(
    (clientY: number) => {
      const start = dragStartY.current;
      dragStartY.current = null;
      if (start == null) return;
      const delta = clientY - start;
      setDragY(0);
      if (delta >= SWIPE_CLOSE_PX) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  const footer: ReactNode = (
    <p className="v2-cycle-discover-sheet__footer">
      {t("cycle.discoverSettingsBefore")}
      <Link
        href="/v2/settings?section=cyclus"
        className="v2-cycle-discover-sheet__footer-link"
        onClick={onClose}
      >
        {t("cycle.discoverSettingsLink")}
      </Link>
      {t("cycle.discoverSettingsAfter")}
    </p>
  );

  return (
    <div className="v2-info-sheet v2-cycle-discover-sheet" role="presentation">
      <button
        type="button"
        className="v2-info-sheet__backdrop"
        aria-label={t("cycle.discoverCloseAria")}
        onClick={onClose}
      />
      <div
        id="v2-cycle-discover-sheet"
        className="v2-info-sheet__panel v2-cycle-discover-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button, a, [role='switch']")) {
            return;
          }
          dragStartY.current = e.clientY;
        }}
        onPointerMove={(e) => {
          if (dragStartY.current == null) return;
          const delta = Math.max(0, e.clientY - dragStartY.current);
          setDragY(delta);
        }}
        onPointerUp={(e) => endDrag(e.clientY)}
        onPointerCancel={() => {
          dragStartY.current = null;
          setDragY(0);
        }}
      >
        <button
          type="button"
          className="v2-cycle-discover-sheet__grab"
          aria-label={t("cycle.discoverCloseAria")}
          onClick={onClose}
        >
          <span className="v2-cycle-discover-hint__handle" aria-hidden />
        </button>

        <div className="v2-cycle-discover-sheet__head">
          <span className="v2-cycle-discover-sheet__head-icon" aria-hidden>
            <CycleDiscoverIcon size={30} />
          </span>
          <div className="v2-cycle-discover-sheet__head-copy">
            <p className="v2-cycle-discover-sheet__eyebrow">
              {t("cycle.discoverEyebrow")}
            </p>
            <h2 id={titleId} className="v2-cycle-discover-sheet__title">
              {t("cycle.discoverTitle")}
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

        <p className="v2-cycle-discover-sheet__body">{t("cycle.discoverBody")}</p>

        <div className="v2-cycle-discover-sheet__toggle-card">
          <div className="v2-cycle-discover-sheet__toggle-copy">
            <p className="v2-cycle-discover-sheet__toggle-title">
              {t("cycle.discoverToggleLabel")}
            </p>
            <p className="v2-cycle-discover-sheet__toggle-status">
              {previewOn
                ? t("cycle.discoverToggleOn")
                : t("cycle.discoverToggleOff")}
            </p>
          </div>
          <V2SettingsToggle
            checked={previewOn}
            onChange={() => setPreviewOn((v) => !v)}
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

        <div className="v2-cycle-discover-sheet__actions">
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
            onClick={onEnable}
          >
            {t("cycle.discoverEnable")}
          </button>
        </div>

        {footer}
      </div>
    </div>
  );
}
