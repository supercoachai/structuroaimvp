import type { Metadata } from "next";
import type { ReactNode } from "react";

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
    <div className="v2-root fixed inset-0 z-[120] min-h-[100dvh] overflow-y-auto overscroll-y-contain">
      <V2Provider>{children}</V2Provider>
    </div>
  );
}
