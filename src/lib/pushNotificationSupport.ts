import {
  detectMobileInstallPlatform,
  isStandalonePwa,
} from "@/lib/pwaInstallHint";

export type PushSupportState = {
  /** Browser heeft Notification + service worker + PushManager. */
  apisAvailable: boolean;
  permission: NotificationPermission | "unsupported";
  /** iPhone/iPad in Safari-tab: eerst toevoegen aan beginscherm. */
  needsHomescreen: boolean;
};

export function isIosSafariNeedsHomescreenForPush(): boolean {
  if (typeof window === "undefined") return false;
  if (detectMobileInstallPlatform() !== "ios") return false;
  return !isStandalonePwa();
}

export function detectPushSupport(): PushSupportState {
  if (typeof window === "undefined") {
    return {
      apisAvailable: false,
      permission: "unsupported",
      needsHomescreen: false,
    };
  }

  const needsHomescreen = isIosSafariNeedsHomescreenForPush();
  const apisAvailable =
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  if (!apisAvailable) {
    return {
      apisAvailable: false,
      permission: "unsupported",
      needsHomescreen,
    };
  }

  return {
    apisAvailable: true,
    permission: Notification.permission,
    needsHomescreen,
  };
}
