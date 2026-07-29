"use client";

import type { ReactNode } from "react";

import { V2LayoutOverlays } from "@/components/v2/V2LayoutOverlays";
import { V2Provider } from "@/components/v2/V2Context";
import { V2VisitTracker } from "@/components/v2/V2VisitTracker";
import V2ClaimOnAuth from "@/components/v2/V2ClaimOnAuth";
import V2LocaleSync from "@/components/v2/V2LocaleSync";

/**
 * App-shell voor canonieke URL's (was /v2/*). Zelfde stack als oude v2/layout.
 */
export default function V2LiveShell({ children }: { children: ReactNode }) {
  return (
    <div className="v2-root fixed inset-0 z-[120] flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden overscroll-none">
      <V2Provider>
        <V2LocaleSync />
        <V2VisitTracker />
        <V2ClaimOnAuth />
        <V2LayoutOverlays />
        <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
      </V2Provider>
    </div>
  );
}
