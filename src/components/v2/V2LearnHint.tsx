"use client";

import { useId, useState, type ReactNode } from "react";

type V2LearnHintProps = {
  children: ReactNode;
  /** Standaard: "Waarom zo?" */
  label?: string;
  className?: string;
};

/**
 * Inklapbare uitleg (default dicht). Max 2-3 zinnen, prikkelarm, geen college.
 */
export function V2LearnHint({
  children,
  label = "Waarom zo?",
  className = "",
}: V2LearnHintProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="v2-link text-[13px]"
        style={{ padding: "4px 0" }}
      >
        {open ? "Minder uitleg" : label}
      </button>
      {open ? (
        <p
          id={panelId}
          className="mt-2 text-[13px] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {children}
        </p>
      ) : null}
    </div>
  );
}
