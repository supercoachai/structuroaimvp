import type { Metadata } from "next";
import type { ReactNode } from "react";

import { V2LayoutOverlays } from "@/components/v2/V2LayoutOverlays";
import { V2Provider } from "@/components/v2/V2Context";
import { V2VisitTracker } from "@/components/v2/V2VisitTracker";
import "@/components/v2/structuro-tokens.css";

export const metadata: Metadata = {
  title: "Structuro",
  description: "Rustig beginnen: maximaal drie dingen voor vandaag.",
  robots: { index: false, follow: false },
};

/**
 * Bare layout voor /v2: organic productiepad tot cutover naar v1-routes.
 * Geen app-shell. PostHog pageviews via root AppProviders + cookieless /v2.
 * V2Provider draagt naam/energie/ding/why (localStorage).
 * Frisse start + day-1 hook leven hier tot ze op de v1-plaats landen.
 */
export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <div className="v2-root fixed inset-0 z-[120] flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden overscroll-none">
      <V2Provider>
        <V2VisitTracker />
        <V2LayoutOverlays />
        <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
      </V2Provider>
    </div>
  );
}
