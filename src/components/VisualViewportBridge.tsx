"use client";

import { useEffect } from "react";
import { syncKeyboardInsetCssVar } from "@/lib/keyboardInset";

/**
 * Houdt --keyboard-inset-bottom synchroon met visualViewport (o.a. mobiel toetsenbord).
 */
export function VisualViewportBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let raf = 0;
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        syncKeyboardInsetCssVar();
      });
    };

    schedule();
    window.addEventListener("resize", schedule, { passive: true });
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", schedule, { passive: true });
      vv.addEventListener("scroll", schedule, { passive: true });
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      if (vv) {
        vv.removeEventListener("resize", schedule);
        vv.removeEventListener("scroll", schedule);
      }
      document.documentElement.style.removeProperty("--keyboard-inset-bottom");
    };
  }, []);

  return null;
}
