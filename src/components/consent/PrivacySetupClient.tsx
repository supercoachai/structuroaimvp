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
  registerPushSubscription,
  unregisterPushSubscription,
} from "@/utils/pushNotifications";
import { toast } from "@/components/Toast";
import { NotificationsHint } from "@/components/settings/NotificationsHint";
import { V2Header, V2Page } from "@/components/v2/V2Chrome";
import {
  V2SettingsRow,
  V2SettingsSection,
  V2SettingsToggle,
} from "@/components/v2/V2SettingsUi";
import { v2Styles } from "@/components/v2/theme";

export default function PrivacySetupClient() {
  const { t } = useI18n();
  const router = useRouter();
  const { consent, grant, deny } = useConsent();
  const [pushChecked, setPushChecked] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">("default");
  const [needsHomescreen, setNeedsHomescreen] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useLayoutEffect(() => {
    const state = detectPushSupport();
    setNotificationPermission(state.permission);
    setNeedsHomescreen(state.needsHomescreen);
    setPushChecked(true);
  }, []);

  const notificationsOn = notificationPermission === "granted";
  const notificationsToggleDisabled = notificationBusy;

  const handleEnableNotifications = async () => {
    if (notificationBusy) return;
    if (needsHomescreen) {
      toast.error(t("settings.notificationsNeedsHomescreenToast"));
      return;
    }
    if (notificationPermission === "unsupported") {
      toast.error(t("settings.notificationsUnsupported"));
      return;
    }
    setNotificationBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        toast(t("settings.notificationsNeedLogin"));
        return;
      }
      const sub = await registerPushSubscription(user.id);
      const currentPermission =
        typeof window !== "undefined" && "Notification" in window
          ? Notification.permission
          : "default";
      setNotificationPermission(currentPermission);
      if (sub) toast.success(t("settings.notificationsEnabled"));
      else if (currentPermission === "denied") {
        toast.error(t("settings.notificationsDenied"));
      } else {
        toast.error(t("settings.notificationsNoSubscription"));
      }
    } catch (err) {
      toast.error(t("settings.notificationsEnableFail", { detail: String(err) }));
    } finally {
      setNotificationBusy(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (notificationBusy) return;
    setNotificationBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        toast(t("settings.notificationsNeedLogin"));
        return;
      }
      await unregisterPushSubscription(user.id);
      setNotificationPermission("default");
      toast(t("settings.notificationsDisabled"));
    } catch (err) {
      toast(t("settings.notificationsDisableFail", { detail: String(err) }));
    } finally {
      setNotificationBusy(false);
    }
  };

  const handleNotificationToggle = () => {
    if (notificationBusy) return;
    if (needsHomescreen) {
      toast.error(t("settings.notificationsNeedsHomescreenToast"));
      return;
    }
    if (notificationPermission === "denied") {
      toast.error(t("settings.notificationsDenied"));
      return;
    }
    if (notificationsOn) void handleDisableNotifications();
    else void handleEnableNotifications();
  };

  const handleContinue = () => {
    if (finishing) return;
    setFinishing(true);
    if (consent === "unknown") deny();
    markPrivacySetupCompleted();
    router.replace("/v2/home");
  };

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
        </div>

        <V2SettingsSection title={t("settings.sectionPrivacy")}>
          <V2SettingsRow
            label={t("settings.analyticsTitle")}
            hint={t("settings.analyticsHint")}
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

          <V2SettingsRow
            label={t("settings.notificationsTitle")}
            hint={
              pushChecked ? (
                <NotificationsHint
                  permission={notificationPermission}
                  needsHomescreen={needsHomescreen}
                  linkClassName="font-semibold underline-offset-2 hover:underline"
                  linkStyle={{ color: "var(--accent)" }}
                />
              ) : (
                " "
              )
            }
            last
          >
            <V2SettingsToggle
              checked={notificationsOn}
              onChange={handleNotificationToggle}
              disabled={notificationsToggleDisabled}
              ariaLabel={t("settings.notificationsTitle")}
            />
          </V2SettingsRow>
        </V2SettingsSection>

        <div style={v2Styles.actions}>
          <button
            type="button"
            className="v2-cta"
            onClick={handleContinue}
            disabled={finishing}
            style={{
              ...v2Styles.cta,
              opacity: finishing ? 0.6 : 1,
              cursor: finishing ? "not-allowed" : "pointer",
            }}
          >
            {finishing ? t("consentSetup.continueBusy") : t("consentSetup.continueCta")}
          </button>
        </div>

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
