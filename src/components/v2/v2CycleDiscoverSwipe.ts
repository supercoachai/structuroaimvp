/** Drempels voor cyclus discovery peek/sheet (px). */
export const CYCLE_DISCOVER_SWIPE_OPEN_PX = 36;
export const CYCLE_DISCOVER_SWIPE_CLOSE_PX = 56;
/** Minimale beweging om een tap van een drag te onderscheiden. */
export const CYCLE_DISCOVER_DRAG_SLOP_PX = 8;

/**
 * Swipe omhoog op de peek: deltaY = clientY - startY (negatief = omhoog).
 */
export function shouldOpenCycleDiscoverFromSwipe(
  deltaY: number,
  thresholdPx = CYCLE_DISCOVER_SWIPE_OPEN_PX,
): boolean {
  return -deltaY >= thresholdPx;
}

/**
 * Swipe omlaag op de open sheet: deltaY = clientY - startY (positief = omlaag).
 */
export function shouldCloseCycleDiscoverFromSwipe(
  deltaY: number,
  thresholdPx = CYCLE_DISCOVER_SWIPE_CLOSE_PX,
): boolean {
  return deltaY >= thresholdPx;
}

export function isCycleDiscoverDragSlopExceeded(
  deltaY: number,
  slopPx = CYCLE_DISCOVER_DRAG_SLOP_PX,
): boolean {
  return Math.abs(deltaY) >= slopPx;
}
