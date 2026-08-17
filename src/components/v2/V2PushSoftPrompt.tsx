"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { isPrivacySetupCompleted } from "@/lib/privacySetup";
import { detectPushSupport } from "@/lib/pushNotificationSupport";
import {
  isPushSoftPromptDone,
  isPushSoftPromptPathBlocked,
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
import { profileHasAppAccessOrGrace } from "@/lib/subscriptionAccess";
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
    let cancelled = false;

    void (async () => {
      if (isPushSoftPromptPathBlocked(pathname) || isPushSoftPromptDone()) {
        return;
      }

      const privacyOk = isPrivacySetupCompleted();
      if (!privacyOk) return;

      const state = detectPushSupport();
      if (
        state.permission === "granted" ||
        state.permission === "unsupported"
      ) {
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user?.id) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "subscription_status, subscription_current_period_end, created_at, last_dagstart_date, signup_source, app_trial_override_until"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled || !profile) return;

      const hasAppAccess = profileHasAppAccessOrGrace({
        email: user.email ?? null,
        subscription_status:
          typeof profile.subscription_status === "string"
            ? profile.subscription_status
            : null,
        subscription_current_period_end:
          profile.subscription_current_period_end != null
            ? String(profile.subscription_current_period_end)
            : null,
        created_at:
          profile.created_at != null ? String(profile.created_at) : null,
        last_dagstart_date:
          profile.last_dagstart_date != null
            ? String(profile.last_dagstart_date).slice(0, 10)
            : null,
        signup_source:
          typeof profile.signup_source === "string"
            ? profile.signup_source
            : null,
        app_trial_override_until:
          profile.app_trial_override_until != null
            ? String(profile.app_trial_override_until)
            : null,
      });

      if (
        !shouldShowPushSoftPrompt({
          privacySetupCompleted: privacyOk,
          permission: state.permission,
          pathname,
          hasAppAccess,
        })
      ) {
        return;
      }

      if (cancelled) return;
      setNeedsHomescreen(state.needsHomescreen);
      setVisible(true);
      trackPushSoftPromptShown();
    })();

    return () => {
      cancelled = true;
    };
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
