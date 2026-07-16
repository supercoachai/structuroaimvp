import type { Metadata } from "next";
import { Suspense } from "react";

import FocusV2Client from "@/components/v2/FocusV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Focus",
  description: "Een ding, een rustige timer. Stoppen kan altijd.",
  robots: { index: false, follow: false },
};

export default function V2FocusPage() {
  return (
    <Suspense>
      <FocusV2Client />
    </Suspense>
  );
}
