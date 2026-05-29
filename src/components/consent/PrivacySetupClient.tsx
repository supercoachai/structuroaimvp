"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useConsent } from "@/lib/posthog/ConsentContext";
import { markPrivacySetupCompleted } from "@/lib/privacySetup";
import {
  registerPushSubscription,
  unregisterPushSubscription,
} from "@/utils/pushNotifications";
import { toast } from "@/components/Toast";
import {
  SettingsRow,
  SettingsSection,
  SettingsToggle,
} from "@/components/settings/SettingsUi";

export default function PrivacySetupClient() {
  const { t } = useI18n();
  const router = useRouter();
  const { consent, grant, deny } = useConsent();
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">("unsupported");
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    if (!supported) {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  const notificationsOn = notificationPermission === "granted";
  const notificationsToggleDisabled =
    notificationBusy ||
    notificationPermission === "unsupported" ||
    notificationPermission === "denied";

  const handleEnableNotifications = async () => {
    if (notificationBusy) return;
    if (notificationPermission === "unsupported") {
      toast(t("settings.notificationsUnsupported"));
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
      if (sub) toast(t("settings.notificationsEnabled"));
      else if (currentPermission === "denied") {
        toast(t("settings.notificationsDenied"));
      } else {
        toast(t("settings.notificationsNoSubscription"));
      }
    } catch (err) {
      toast(t("settings.notificationsEnableFail", { detail: String(err) }));
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
    if (notificationsOn) void handleDisableNotifications();
    else void handleEnableNotifications();
  };

  const handleContinue = () => {
    if (finishing) return;
    setFinishing(true);
    if (consent === "unknown") deny();
    markPrivacySetupCompleted();
    router.replace("/");
  };

  return (
    <div className="flex min-h-[100dvh] w-full items-start justify-center overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("consentSetup.title")}
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">
            {t("consentSetup.subtitle")}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm leading-relaxed text-slate-700">
          {t("consentSetup.remindersIntro")}
        </div>

        <SettingsSection title={t("settings.sectionPrivacy")}>
          <SettingsRow
            label={t("settings.analyticsTitle")}
            hint={t("settings.analyticsHint")}
          >
            <SettingsToggle
              checked={consent === "granted"}
              onChange={() => {
                if (consent === "granted") deny();
                else grant();
              }}
              ariaLabel={t("settings.analyticsTitle")}
            />
          </SettingsRow>

          <SettingsRow
            label={t("settings.notificationsTitle")}
            hint={
              notificationPermission === "denied"
                ? t("settings.notificationsDenied")
                : notificationPermission === "unsupported"
                  ? t("settings.notificationsUnsupported")
                  : t("consentSetup.notificationsHint")
            }
          >
            <SettingsToggle
              checked={notificationsOn}
              onChange={handleNotificationToggle}
              disabled={notificationsToggleDisabled}
              busy={notificationBusy}
              ariaLabel={t("settings.notificationsTitle")}
            />
          </SettingsRow>
        </SettingsSection>

        <button
          type="button"
          onClick={handleContinue}
          disabled={finishing}
          className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {finishing ? t("consentSetup.continueBusy") : t("consentSetup.continueCta")}
        </button>

        <p className="text-center text-xs leading-relaxed text-slate-500">
          {t("consentSetup.footer")}{" "}
          <Link href="/privacy" className="text-blue-600 underline-offset-2 hover:underline">
            {t("settings.legalPrivacy")}
          </Link>
        </p>
      </div>
    </div>
  );
}
