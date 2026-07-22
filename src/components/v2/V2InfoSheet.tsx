"use client";

import { useEffect, useId, type ReactNode } from "react";

export type V2InfoSheetIconKind =
  | "meaning"
  | "plan"
  | "private"
  | "brain"
  | "pause"
  | "clock";

export type V2InfoSheetRow = {
  key: string;
  icon: V2InfoSheetIconKind;
  title: string;
  body: string;
};

function SheetIcon({ kind }: { kind: V2InfoSheetIconKind }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 18 18",
    fill: "none",
    "aria-hidden": true as const,
  };

  if (kind === "brain") {
    return (
      <svg {...common}>
        <path
          d="M7 3.5a2.2 2.2 0 0 0-2.1 2.8A2.3 2.3 0 0 0 3.5 8.4c0 1.3.9 2.3 2.1 2.5v1.6c0 .8.6 1.5 1.4 1.5h.5M11 3.5a2.2 2.2 0 0 1 2.1 2.8A2.3 2.3 0 0 1 14.5 8.4c0 1.3-.9 2.3-2.1 2.5v1.6c0 .8-.6 1.5-1.4 1.5h-.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M9 3.2v11.6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "pause") {
    return (
      <svg {...common}>
        <rect x="5" y="4" width="2.4" height="10" rx="1" fill="currentColor" />
        <rect x="10.6" y="4" width="2.4" height="10" rx="1" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "clock") {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M9 5.5V9l2.4 1.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === "meaning") {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M6.2 9.2c.6-1.4 1.6-2.2 2.8-2.2s2.2.8 2.8 2.2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "plan") {
    return (
      <svg {...common}>
        <rect
          x="3.5"
          y="4"
          width="11"
          height="10"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M6 2.8v2.4M12 2.8v2.4M3.5 7.5h11"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect
        x="5"
        y="8"
        width="8"
        height="6.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M6.5 8V6.2a2.5 2.5 0 0 1 5 0V8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

type V2InfoSheetProps = {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  rows: V2InfoSheetRow[];
  /** Optioneel blok tussen titel en rijen (bijv. fasebalk). */
  children?: ReactNode;
  gotItLabel?: string;
  closeAria?: string;
  panelId?: string;
  /** warm = cyclus-terracotta; accent = sage (default). */
  tone?: "accent" | "warm";
};

/**
 * Gedeelde info bottom-sheet (cyclus-stijl): eyebrow, serif titel, icon-rijen, Begrepen.
 */
export default function V2InfoSheet({
  open,
  onClose,
  eyebrow,
  title,
  rows,
  children,
  gotItLabel = "Begrepen",
  closeAria = "Sluiten",
  panelId = "v2-info-sheet",
  tone = "accent",
}: V2InfoSheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
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

  if (!open) return null;

  return (
    <div className="v2-info-sheet" role="presentation">
      <button
        type="button"
        className="v2-info-sheet__backdrop"
        aria-label={closeAria}
        onClick={onClose}
      />
      <div
        id={panelId}
        className="v2-info-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <p className="v2-info-sheet__eyebrow">{eyebrow}</p>
        <h2 id={titleId} className="v2-info-sheet__title">
          {title}
        </h2>

        {children}

        <ul className="v2-info-sheet__rows">
          {rows.map((row) => (
            <li key={row.key} className="v2-info-sheet__row">
              <span
                className={`v2-info-sheet__row-icon v2-info-sheet__row-icon--${tone}`}
                aria-hidden
              >
                <SheetIcon kind={row.icon} />
              </span>
              <div className="v2-info-sheet__row-copy">
                <strong>{row.title}</strong>
                <p>{row.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <button type="button" className="btn-primary w-full" onClick={onClose}>
          {gotItLabel}
        </button>
      </div>
    </div>
  );
}
