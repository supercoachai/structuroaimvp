"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useI18n } from "@/lib/i18n";

import {
  trackV2ShutdownInviteDismissed,
  trackV2ShutdownInviteShown,
} from "./v2Analytics";
import { useV2Go } from "./v2nav";
import { V2_TASKS_CHANGED_EVENT } from "./v2Tasks";
import {
  dismissV2ShutdownInvite,
  msUntilV2ShutdownEvening,
  resolveV2ShutdownInvite,
  type V2ShutdownInviteReason,
} from "./v2ShutdownInvite";
import { useV2 } from "./V2Context";

export default function V2ShutdownInviteCloud({
  fallback = null,
}: {
  fallback?: ReactNode;
}) {
  const { t } = useI18n();
  const go = useV2Go();
  const { state, ready } = useV2();
  const [reason, setReason] = useState<V2ShutdownInviteReason | null>(null);
  const shownRef = useRef<V2ShutdownInviteReason | null>(null);

  useEffect(() => {
    if (!ready) return;

    const refresh = () => {
      setReason(resolveV2ShutdownInvite(state));
    };
    refresh();
    window.addEventListener(V2_TASKS_CHANGED_EVENT, refresh);
    const untilEvening = msUntilV2ShutdownEvening();
    const eveningTimer =
      untilEvening == null
        ? undefined
        : window.setTimeout(refresh, untilEvening + 50);

    return () => {
      window.removeEventListener(V2_TASKS_CHANGED_EVENT, refresh);
      if (eveningTimer != null) window.clearTimeout(eveningTimer);
    };
  }, [ready, state]);

  useEffect(() => {
    if (!reason || shownRef.current === reason) return;
    shownRef.current = reason;
    trackV2ShutdownInviteShown({ reason });
  }, [reason]);

  if (!ready || !reason || reason === "all_done") return fallback ?? null;

  return (
    <div className="v2-evening-cloud-slot">
      <section className="v2-fade v2-evening-cloud" aria-live="polite">
        <div className="v2-evening-cloud__body">
          <span className="v2-evening-cloud__moon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M16.4 13.2A6.2 6.2 0 0 1 10.8 5.4 6.4 6.4 0 1 0 16.4 13.2Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="v2-evening-cloud__text">{t("v2.shutdownInviteEvening")}</p>
          <div className="v2-evening-cloud__actions">
            <button
              type="button"
              className="v2-evening-cloud__cta"
              onClick={() => go("/shutdown")}
            >
              {t("v2.shutdownInviteYes")}
            </button>
            <button
              type="button"
              className="v2-evening-cloud__later"
              onClick={() => {
                dismissV2ShutdownInvite(reason);
                trackV2ShutdownInviteDismissed({ reason });
                shownRef.current = null;
                setReason(null);
              }}
            >
              {t("v2.shutdownInviteNotYet")}
            </button>
          </div>
        </div>
        <span className="v2-evening-cloud__tail" aria-hidden />
      </section>
    </div>
  );
}
