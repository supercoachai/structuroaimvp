export type MobileInstallPlatform = "ios" | "android";

/** localStorage: gebruiker heeft de homescreen-hint al gezien/geskipt. */
export const PWA_INSTALL_HINT_DISMISSED_KEY =
  "structuro_pwa_install_hint_dismissed";

/** Canonieke install-route na app-toegang (gift, override, event, Stripe). */
export const PWA_INSTALL_FROM_APP_PATH = "/welkom/install?from=app";

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function isCoarsePointerMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export function detectMobileInstallPlatform(): MobileInstallPlatform | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

export function hasDismissedPwaInstallHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PWA_INSTALL_HINT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPwaInstallHintDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PWA_INSTALL_HINT_DISMISSED_KEY, "1");
  } catch {
    /* privémodus */
  }
}

/**
 * Toon homescreen-hint op mobiel, niet als PWA al open staat of eerder
 * overgeslagen/afgerond.
 */
export function shouldShowPwaInstallHint(): boolean {
  if (!isCoarsePointerMobile()) return false;
  if (isStandalonePwa()) return false;
  if (hasDismissedPwaInstallHint()) return false;
  return detectMobileInstallPlatform() !== null;
}

/**
 * Na app-toegang (Stripe success, gift/comp, event-trial, override):
 * install-hint op mobiel, anders home.
 */
export function resolveLoggedInInstallContinuePath(): string {
  if (shouldShowPwaInstallHint()) {
    return PWA_INSTALL_FROM_APP_PATH;
  }
  return "/";
}

/** @deprecated alias: zelfde pad als resolveLoggedInInstallContinuePath */
export function resolvePostCheckoutContinuePath(): string {
  return resolveLoggedInInstallContinuePath();
}
