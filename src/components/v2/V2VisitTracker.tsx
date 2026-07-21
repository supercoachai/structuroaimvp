"use client";

import { useEffect } from "react";

import { trackV2SessionStart } from "./v2Analytics";
import { recordV2Visit, shouldShowFrisseStart } from "./v2Visit";

/** Licht: alleen session start + visit; geen overlay UI. */
export function V2VisitTracker() {
  useEffect(() => {
    trackV2SessionStart();
    if (!shouldShowFrisseStart()) {
      recordV2Visit();
    }
  }, []);
  return null;
}
