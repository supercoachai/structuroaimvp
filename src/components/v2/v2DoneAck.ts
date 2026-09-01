/** Kort blijven staan na afronden. Geen confetti, geen score. */

export const V2_DONE_ACK_LINGER_MS = 2200;
export const V2_DONE_ACK_FADE_MS = 400;
export const V2_DONE_ACK_FOCUS_MS = 2400;
/** Zonder animatie nog even de teller laten zien. */
export const V2_DONE_ACK_REDUCED_MS = 900;
/** Vertraging vóór het cijfer +1 doet. */
export const V2_DONE_ACK_TICK_MS = 380;
/** Eén korte tik bij verschijnen van het afrondscherm. */
export const V2_DONE_ACK_HAPTIC_MS = 18;

export function v2PrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Tijd dat de afgevinkte rij / overlay zichtbaar blijft. */
export function v2DoneAckLingerMs(): number {
  return v2PrefersReducedMotion() ? V2_DONE_ACK_REDUCED_MS : V2_DONE_ACK_LINGER_MS;
}

export function v2DoneAckFadeMs(): number {
  return v2PrefersReducedMotion() ? 0 : V2_DONE_ACK_FADE_MS;
}

/** Beat op focus ná "Ik ben klaar", vóór de taak van het scherm gaat. */
export function v2DoneAckFocusMs(): number {
  return v2PrefersReducedMotion() ? V2_DONE_ACK_REDUCED_MS : V2_DONE_ACK_FOCUS_MS;
}
