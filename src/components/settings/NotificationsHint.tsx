"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";

type NotificationsHintProps = {
  permission: NotificationPermission | "unsupported";
  needsHomescreen: boolean;
  installLinkHref?: string;
  defaultHint?: "consent" | "settings";
  /** Optioneel: v2 accent i.p.v. v1-blauw op de homescreen-link. */
  linkClassName?: string;
  linkStyle?: CSSProperties;
};

export function NotificationsHint({
  permission,
  needsHomescreen,
  installLinkHref = "/welkom/install?from=consent",
  defaultHint = "consent",
  linkClassName = "font-semibold text-blue-600 underline-offset-2 hover:underline",
  linkStyle,
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
          className={linkClassName}
          style={linkStyle}
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
