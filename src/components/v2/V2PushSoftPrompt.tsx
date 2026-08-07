"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { isPrivacySetupCompleted } from "@/lib/privacySetup";
import { detectPushSupport } from "@/lib/pushNotificationSupport";
import {
  markPushSoftPromptDone,
  shouldShowPushSoftPrompt,
} from "@/lib/pushSoftPrompt";
import {
  trackPushNeedsHomescreen,
  trackPushOptInClicked,
  trackPushOptInDenied,
  trackPushOptInSkipped,
  trackPushOptInSuccess,
  trackPushSoftPromptShown,
} from "@/lib/pushOptInEvents";
import { registerPushSubscription } from "@/utils/pushNotifications";

const INSTALL_FROM_CONSENT = "/welkom/install?from=consent";

export function V2PushSoftPrompt() {
  const { t } = useI18n();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [needsHomescreen, setNeedsHomescreen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const state = detectPushSupport();
    if (
      !shouldShowPushSoftPrompt({
        privacySetupCompleted: isPrivacySetupCompleted(),
        permission: state.permission,
        pathname,
      })
    ) {
      return;
    }
    setNeedsHomescreen(state.needsHomescreen);
    setVisible(true);
    trackPushSoftPromptShown();
  }, [pathname]);

  const dismiss = useCallback(() => {
    trackPushOptInSkipped("soft_prompt");
    markPushSoftPromptDone();
    setVisible(false);
  }, []);

  const accept = useCallback(async () => {
    if (busy) return;

    if (needsHomescreen) {
      trackPushNeedsHomescreen("soft_prompt");
      markPushSoftPromptDone();
      setVisible(false);
      router.push(INSTALL_FROM_CONSENT);
      return;
    }

    trackPushOptInClicked("soft_prompt");
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        markPushSoftPromptDone();
        setVisible(false);
        return;
      }

      const sub = await registerPushSubscription(user.id);
      const permission =
        typeof window !== "undefined" && "Notification" in window
          ? Notification.permission
          : "default";

      if (sub) {
        trackPushOptInSuccess("soft_prompt");
      } else if (permission === "denied") {
        trackPushOptInDenied("soft_prompt");
      }

      markPushSoftPromptDone();
      setVisible(false);
    } catch {
      markPushSoftPromptDone();
      setVisible(false);
    } finally {
      setBusy(false);
    }
  }, [busy, needsHomescreen, router]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="v2-push-soft-prompt-title"
      className="v2-fade"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 185,
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
          id="v2-push-soft-prompt-title"
          className="text-[15px] leading-snug"
          style={{ color: "var(--text)" }}
        >
          {t("consentSetup.softPromptTitle")}
        </p>
        <p className="mt-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
          {t("consentSetup.softPromptBody")}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => void accept()}
          >
            {needsHomescreen
              ? t("consentSetup.softPromptInstall")
              : t("consentSetup.softPromptAccept")}
          </button>
          <button
            type="button"
            className="v2-link text-[14px]"
            disabled={busy}
            onClick={dismiss}
          >
            {t("consentSetup.softPromptDismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
