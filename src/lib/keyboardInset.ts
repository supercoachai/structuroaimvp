/**
 * Ruimte onderaan die door het virtuele toetsenbord of browser-chrome wordt
 * afgesneden (layout viewport vs. visual viewport). Gebruikt voor --keyboard-inset-bottom.
 */
export function getKeyboardInsetBottomPx(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  const inset = window.innerHeight - vv.offsetTop - vv.height;
  return Math.max(0, Math.round(inset));
}

export function syncKeyboardInsetCssVar(root: HTMLElement = document.documentElement): void {
  root.style.setProperty("--keyboard-inset-bottom", `${getKeyboardInsetBottomPx()}px`);
}
