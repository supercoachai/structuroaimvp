"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useConsent } from "@/lib/posthog/ConsentContext";
import { markPrivacySetupCompleted } from "@/lib/privacySetup";
import { detectPushSupport } from "@/lib/pushNotificationSupport";
import {
  trackPushNeedsHomescreen,
  trackPushOptInClicked,
  trackPushOptInDenied,
  trackPushOptInSkipped,
  trackPushOptInSuccess,
} from "@/lib/pushOptInEvents";
import { markPushSoftPromptDone } from "@/lib/pushSoftPrompt";
import { registerPushSubscription } from "@/utils/pushNotifications";
import { toast } from "@/components/Toast";
import { V2Header, V2Page } from "@/components/v2/V2Chrome";
import {
  V2SettingsRow,
  V2SettingsSection,
  V2SettingsToggle,
} from "@/components/v2/V2SettingsUi";
import { v2Styles } from "@/components/v2/theme";
import { resolveLiveHomePathClient } from "@/lib/v2/v2LabAccess";

const INSTALL_FROM_CONSENT = "/welkom/install?from=consent";

export default function PrivacySetupClient() {
  const { t } = useI18n();
  const router = useRouter();
  const { consent, grant, deny } = useConsent();
  const [pushChecked, setPushChecked] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">("default");
  const [needsHomescreen, setNeedsHomescreen] = useState(false);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    const state = detectPushSupport();
    setNotificationPermission(state.permission);
    setNeedsHomescreen(state.needsHomescreen);
    setPushChecked(true);
  }, []);

  const finishToHome = () => {
    if (consent === "unknown") deny();
    markPrivacySetupCompleted();
    // Geen dubbele soft-prompt direct na consent (skip of succes).
    markPushSoftPromptDone();
    router.replace(resolveLiveHomePathClient());
  };

  const handleSkip = () => {
    if (busy) return;
    trackPushOptInSkipped("consent");
    setBusy(true);
    finishToHome();
  };

  const handlePrimary = async () => {
    if (busy) return;

    if (needsHomescreen) {
      trackPushNeedsHomescreen("consent");
      router.push(INSTALL_FROM_CONSENT);
      return;
    }

    if (notificationPermission === "unsupported") {
      toast.error(t("settings.notificationsUnsupported"));
      return;
    }

    if (notificationPermission === "denied") {
      trackPushOptInDenied("consent");
      toast.error(t("settings.notificationsDenied"));
      return;
    }

    if (notificationPermission === "granted") {
      setBusy(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) {
          const sub = await registerPushSubscription(user.id);
          if (sub) trackPushOptInSuccess("consent");
        }
      } catch {
        /* subscription refresh best-effort */
      }
      finishToHome();
      return;
    }

    trackPushOptInClicked("consent");
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        toast(t("settings.notificationsNeedLogin"));
        setBusy(false);
        return;
      }

      const sub = await registerPushSubscription(user.id);
      const currentPermission =
        typeof window !== "undefined" && "Notification" in window
          ? Notification.permission
          : "default";
      setNotificationPermission(currentPermission);

      if (sub) {
        trackPushOptInSuccess("consent");
        toast.success(t("settings.notificationsEnabled"));
        finishToHome();
        return;
      }

      if (currentPermission === "denied") {
        trackPushOptInDenied("consent");
        toast.error(t("settings.notificationsDenied"));
        setBusy(false);
        return;
      }

      toast.error(t("settings.notificationsNoSubscription"));
      setBusy(false);
    } catch (err) {
      toast.error(t("settings.notificationsEnableFail", { detail: String(err) }));
      setBusy(false);
    }
  };

  const primaryLabel = !pushChecked
    ? t("consentSetup.enableBusy")
    : needsHomescreen
      ? t("consentSetup.installCta")
      : notificationPermission === "granted"
        ? t("consentSetup.continueWhenGrantedCta")
        : t("consentSetup.enableCta");

  return (
    <V2Page>
      <V2Header />

      <div style={{ ...v2Styles.flowShell, gap: 16 }}>
        <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={v2Styles.title}>{t("consentSetup.title")}</h1>
          <p style={v2Styles.body}>{t("consentSetup.subtitle")}</p>
        </header>

        <div style={v2Styles.anchorCard}>
          <p style={{ ...v2Styles.body, color: "var(--text)", margin: 0 }}>
            {t("consentSetup.remindersIntro")}
          </p>
          {needsHomescreen ? (
            <p
              style={{
                ...v2Styles.body,
                color: "var(--text-muted)",
                margin: "8px 0 0",
                fontSize: 14,
              }}
            >
              {t("settings.notificationsNeedsHomescreenHint")}{" "}
              <Link
                href={INSTALL_FROM_CONSENT}
                className="v2-textlink"
                style={{
                  color: "var(--accent)",
                  fontWeight: 600,
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
                onClick={() => trackPushNeedsHomescreen("consent")}
              >
                {t("settings.notificationsHomescreenLink")}
              </Link>
            </p>
          ) : null}
          {notificationPermission === "denied" ? (
            <p
              style={{
                ...v2Styles.body,
                color: "var(--text-muted)",
                margin: "8px 0 0",
                fontSize: 14,
              }}
            >
              {t("settings.notificationsDenied")}
            </p>
          ) : null}
        </div>

        <div style={v2Styles.actions}>
          <button
            type="button"
            className="v2-cta"
            onClick={() => void handlePrimary()}
            disabled={busy}
            style={{
              ...v2Styles.cta,
              opacity: busy ? 0.6 : 1,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? t("consentSetup.enableBusy") : primaryLabel}
          </button>
          <button
            type="button"
            className="v2-link"
            onClick={handleSkip}
            disabled={busy}
            style={{
              background: "none",
              border: "none",
              padding: "8px 0",
              fontSize: 14,
              color: "var(--text-muted)",
              cursor: busy ? "not-allowed" : "pointer",
              textAlign: "center",
            }}
          >
            {t("consentSetup.skipCta")}
          </button>
        </div>

        <V2SettingsSection
          title={`${t("settings.sectionPrivacy")} (${t("consentSetup.analyticsOptional")})`}
        >
          <V2SettingsRow
            label={t("settings.analyticsTitle")}
            hint={t("settings.analyticsHint")}
            last
          >
            <V2SettingsToggle
              checked={consent === "granted"}
              onChange={() => {
                if (consent === "granted") deny();
                else grant();
              }}
              ariaLabel={t("settings.analyticsTitle")}
            />
          </V2SettingsRow>
        </V2SettingsSection>

        <p
          style={{
            ...v2Styles.body,
            fontSize: 13,
            textAlign: "center",
            margin: 0,
          }}
        >
          {t("consentSetup.footer")}{" "}
          <Link
            href="/privacy"
            className="v2-textlink"
            style={{
              color: "var(--accent)",
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            {t("settings.legalPrivacy")}
          </Link>
        </p>
      </div>
    </V2Page>
  );
}
