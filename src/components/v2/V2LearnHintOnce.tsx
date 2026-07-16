"use client";

import { useEffect, useState } from "react";

import {
  hasSeenV2LearnHint,
  markV2LearnHintSeen,
  V2_LEARN_HINT_COPY,
  type V2LearnHintFeature,
} from "./v2LearnHints";

type V2LearnHintOnceProps = {
  feature: V2LearnHintFeature;
  className?: string;
};

/** Eén keer per feature: inklapbare uitleg, daarna nooit meer. */
export function V2LearnHintOnce({ feature, className }: V2LearnHintOnceProps) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setVisible(!hasSeenV2LearnHint(feature));
  }, [feature]);

  if (!visible) return null;

  const copy = V2_LEARN_HINT_COPY[feature];

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) markV2LearnHintSeen(feature);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="v2-link text-[13px]"
        style={{ padding: "4px 0" }}
      >
        {open ? "Minder uitleg" : copy.label}
      </button>
      {open ? (
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {copy.body}
        </p>
      ) : null}
    </div>
  );
}
