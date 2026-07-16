"use client";

import { useCallback, useEffect, useState } from "react";

import {
  trackV2ReturnPermissionAccepted,
  trackV2ReturnPermissionDismissed,
  trackV2ReturnPermissionShown,
} from "./v2Analytics";
import {
  consumeReturnPermissionPending,
  dismissReturnPermissionPrompt,
  shouldOfferReturnPermission,
} from "./v2ReturnPermission";
import {
  enableV2ReturnReminder,
  requestV2NotificationPermission,
  scheduleV2ReturnNotification,
  supportsBrowserNotification,
} from "./v2ReturnReminder";
import { trackV2ReturnReminderOptIn } from "./v2Analytics";

export function V2ReturnPermissionPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!consumeReturnPermissionPending()) return;
    if (!shouldOfferReturnPermission()) return;
    setVisible(true);
    trackV2ReturnPermissionShown({});
  }, []);

  const dismiss = useCallback(() => {
    trackV2ReturnPermissionDismissed({});
    dismissReturnPermissionPrompt();
    setVisible(false);
  }, []);

  const accept = useCallback(async () => {
    const variant = enableV2ReturnReminder();
    trackV2ReturnReminderOptIn({ variant });
    trackV2ReturnPermissionAccepted({ variant });
    if (variant === "notification" && supportsBrowserNotification()) {
      await requestV2NotificationPermission();
      scheduleV2ReturnNotification();
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="v2-return-permission-title"
      className="v2-fade"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 190,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16,
        backgroundColor: "rgba(45, 45, 45, 0.28)",
      }}
    >
      <div
        className="w-full max-w-[480px] rounded-[20px] p-5"
        style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
      >
        <p
          id="v2-return-permission-title"
          className="text-[15px] leading-snug"
          style={{ color: "var(--text)" }}
        >
          Morgenochtend een zachte herinnering? Alleen als je dat wilt.
        </p>
        <p className="mt-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
          Geen schuld, geen streaks. Altijd uit te zetten in instellingen.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={() => void accept()}>
            Ja, graag
          </button>
          <button type="button" className="v2-link text-[14px]" onClick={dismiss}>
            Niet nu
          </button>
        </div>
      </div>
    </div>
  );
}
