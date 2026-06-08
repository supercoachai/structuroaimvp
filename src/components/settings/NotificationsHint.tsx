"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type NotificationsHintProps = {
  permission: NotificationPermission | "unsupported";
  needsHomescreen: boolean;
  installLinkHref?: string;
  defaultHint?: "consent" | "settings";
};

export function NotificationsHint({
  permission,
  needsHomescreen,
  installLinkHref = "/welkom/install?from=consent",
  defaultHint = "consent",
}: NotificationsHintProps) {
  const { t } = useI18n();

  if (permission === "denied") {
    return <>{t("settings.notificationsDenied")}</>;
  }

  if (needsHomescreen) {
    return (
      <>
        {t("settings.notificationsNeedsHomescreenHint")}{" "}
        <Link
          href={installLinkHref}
          className="font-semibold text-blue-600 underline-offset-2 hover:underline"
        >
          {t("settings.notificationsHomescreenLink")}
        </Link>
      </>
    );
  }

  if (permission === "unsupported") {
    return <>{t("settings.notificationsUnsupported")}</>;
  }

  return (
    <>
      {t(
        defaultHint === "settings"
          ? "settings.notificationsHint"
          : "consentSetup.notificationsHint"
      )}
    </>
  );
}
