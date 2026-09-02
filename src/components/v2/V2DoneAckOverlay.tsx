"use client";

import { useEffect, useState } from "react";

import { triggerHaptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";

import { V2_DONE_ACK_HAPTIC_MS, v2PrefersReducedMotion } from "./v2DoneAck";
import type { V2DoneTallyTick } from "./v2DoneTally";

export function V2DoneTallyStats({
  week,
  total,
  groupLabel,
}: {
  week: number;
  total: number;
  groupLabel?: string;
}) {
  const { t } = useI18n();
  return (
    <span className="v2-done-tally-group">
      {groupLabel ? (
        <span className="v2-done-tally-group__label">{groupLabel}</span>
      ) : null}
      <span className="v2-done-tally">
        <span className="v2-done-tally__item">
          <span className="v2-done-tally__n">{week}</span>
          <span className="v2-done-tally__label">{t("v2.doneAckWeek")}</span>
        </span>
        <span className="v2-done-tally__item">
          <span className="v2-done-tally__n">{total}</span>
          <span className="v2-done-tally__label">{t("v2.doneAckTotal")}</span>
        </span>
      </span>
    </span>
  );
}

export default function V2DoneAckOverlay({
  title,
  tick,
  quote,
  actionLabel,
  onAction,
}: {
  title: string;
  tick: V2DoneTallyTick;
  quote: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const { t } = useI18n();
  const reduced = v2PrefersReducedMotion();
  const [anim, setAnim] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const id = window.requestAnimationFrame(() => setAnim(true));
    triggerHaptic(V2_DONE_ACK_HAPTIC_MS, { respectReducedMotion: true });
    return () => window.cancelAnimationFrame(id);
  }, [reduced]);

  const aria = t("v2.doneAckOverlayAria", {
    title,
    week: String(tick.weekTo),
    total: String(tick.totalTo),
  });
  const ack = quote.trim() || t("v2.doneAckNote");

  return (
    <div
      className={`v2-done-overlay${anim ? " is-anim" : ""}`}
      role="dialog"
      aria-label={aria}
      aria-describedby={ack ? "v2-done-overlay-quote" : undefined}
      aria-modal="true"
    >
      <div className="v2-done-overlay__body">
        <span className="v2-done-overlay__check" aria-hidden>
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path
              className="v2-done-overlay__tick"
              d="M4.5 12.6l5 5.2L19.5 6.6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h1 className="v2-done-overlay__title">{title}</h1>
        <p className="v2-done-overlay__klaar">{t("v2.doneAck")}</p>
        <div className="v2-done-overlay__rule" aria-hidden />
        <V2DoneTallyStats week={tick.weekTo} total={tick.totalTo} />
        {ack ? (
          <p id="v2-done-overlay-quote" className="v2-done-overlay__ack">
            {ack}
          </p>
        ) : null}
      </div>
      <div className="v2-done-overlay__foot">
        <button type="button" className="v2-done-overlay__action" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
