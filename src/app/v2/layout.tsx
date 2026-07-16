import type { Metadata } from "next";
import type { ReactNode } from "react";

import { FrisseStartOverlay, V2VisitTracker } from "@/components/v2/FrisseStartOverlay";
import { V2ReturnReminderScheduler } from "@/components/v2/V2ReturnScheduler";
import { V2ReturnPermissionPrompt } from "@/components/v2/V2ReturnPermissionPrompt";
import { V2Provider } from "@/components/v2/V2Context";
import "@/components/v2/structuro-tokens.css";

export const metadata: Metadata = {
  title: "Structuro v2 (testomgeving)",
  description: "Rustige v2-testomgeving: een ding tegelijk.",
  robots: { index: false, follow: false },
};

/**
 * Bare layout voor de /v2-testomgeving: geen app-shell, geen overlays.
 * Staat boven alles met een eigen scroll-container, net als /jasper.
 * De V2Provider draagt naam/energie/ding/why door de hele reis (localStorage).
 */
export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <div className="v2-root fixed inset-0 z-[120] flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden overscroll-none">
      <V2Provider>
        <V2VisitTracker />
        <V2ReturnReminderScheduler />
        <FrisseStartOverlay />
        <V2ReturnPermissionPrompt />
        <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
      </V2Provider>
    </div>
  );
}
