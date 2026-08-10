"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { useV2, type V2State } from "./V2Context";

/** Reset de v2-scrollcontainer naar boven (instant, reduced-motion-veilig). */
export function scrollV2ToTop() {
  if (typeof window === "undefined") return;
  const scrollTargets = [
    document.querySelector<HTMLElement>(".v2-root main[style*='overflow']"),
    document.querySelector<HTMLElement>(".v2-root main"),
    document.querySelector<HTMLElement>(".v2-root"),
  ];
  for (const el of scrollTargets) {
    if (!el) continue;
    el.scrollTop = 0;
    el.scrollLeft = 0;
  }
  window.scrollTo(0, 0);
}

/** Verwijder hangende focus zodat een knop na navigatie geen valse focus-ring houdt. */
function blurActiveElement() {
  if (typeof document === "undefined") return;
  const el = document.activeElement;
  if (el instanceof HTMLElement) el.blur();
}

export type V2GoOptions = {
  /**
   * Hard navigatie (full page load). Nodig na middleware-gates die eerst
   * redirectten: Next 15.5 soft-nav kan een stale redirect uit prefetch
   * hergebruiken (vercel/next.js#88937), waardoor knoppen "dood" lijken.
   */
  hard?: boolean;
};

/**
 * Betrouwbare v2-navigatie: past optioneel lokale state aan en navigeert daarna
 * in een volgende frame. Het uitstellen van router.push tot na de state-commit
 * voorkomt dat de synchrone re-render van de V2Provider de eerste navigatie
 * annuleert (oorzaak van "reageert pas op de tweede klik").
 */
export function useV2Go() {
  const router = useRouter();
  const { update } = useV2();

  return useCallback(
    (url: string, patch?: Partial<V2State>, opts?: V2GoOptions) => {
      if (patch) update(patch);
      blurActiveElement();
      if (opts?.hard) {
        if (typeof window !== "undefined") {
          window.location.assign(url);
        }
        return;
      }
      const push = () => router.push(url);
      if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
        window.requestAnimationFrame(push);
      } else {
        push();
      }
    },
    [router, update],
  );
}
