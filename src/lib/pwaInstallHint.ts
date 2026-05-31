export type MobileInstallPlatform = "ios" | "android";

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

/** Toon homescreen-hint na checkout op mobiel, niet als PWA al open staat. */
export function shouldShowPwaInstallHint(): boolean {
  if (!isCoarsePointerMobile()) return false;
  if (isStandalonePwa()) return false;
  return detectMobileInstallPlatform() !== null;
}
