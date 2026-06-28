/** Pointer swipe drempels voor dagstart-taakkaarten (StepSwipe). */

export const SWIPE_DRAG_ACTIVATION_MOUSE_PX = 10;
export const SWIPE_DRAG_ACTIVATION_TOUCH_PX = 6;
export const SWIPE_COMMIT_THRESHOLD = 90;
export const SWIPE_INTENT_PX = 30;

export type SwipePointerType = "mouse" | "touch" | "pen";

export function swipeActivationPx(pointerType: SwipePointerType): number {
  return pointerType === "mouse"
    ? SWIPE_DRAG_ACTIVATION_MOUSE_PX
    : SWIPE_DRAG_ACTIVATION_TOUCH_PX;
}

/** Knoppen hebben eigen click-handlers; niet als swipe starten. */
export function shouldIgnoreSwipePointerDown(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return true;
  const el = target as { closest?: (selector: string) => unknown };
  if (typeof el.closest !== "function") return true;
  return Boolean(el.closest("button"));
}

export type SwipeDragPhase = {
  x: number;
  active: boolean;
  startX: number;
  pointerType: SwipePointerType;
};

export function applySwipePointerMove(
  drag: SwipeDragPhase,
  clientX: number,
  buttons: number
): { next: SwipeDragPhase; dragX: number; isDragging: boolean } | "reset" {
  if (drag.pointerType === "mouse" && buttons === 0) return "reset";
  const x = clientX - drag.startX;
  if (!drag.active) {
    if (Math.abs(x) < swipeActivationPx(drag.pointerType)) {
      return { next: drag, dragX: 0, isDragging: false };
    }
    return {
      next: { ...drag, active: true, x },
      dragX: x,
      isDragging: true,
    };
  }
  return {
    next: { ...drag, x },
    dragX: x,
    isDragging: true,
  };
}

export function resolveSwipeCommit(
  x: number,
  keepDisabled: boolean
): "keep" | "skip" | "snap" | "blocked" {
  if (x > SWIPE_COMMIT_THRESHOLD) return keepDisabled ? "blocked" : "keep";
  if (x < -SWIPE_COMMIT_THRESHOLD) return "skip";
  return "snap";
}
