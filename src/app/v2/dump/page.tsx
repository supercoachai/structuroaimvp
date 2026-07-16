import type { Metadata } from "next";
import { Suspense } from "react";

import DumpV2Client from "@/components/v2/DumpV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Dumplijst",
  description: "Leg vast wat in je hoofd zit, zonder structuur of druk.",
  robots: { index: false, follow: false },
};

export default function V2DumpPage() {
  return (
    <Suspense>
      <DumpV2Client />
    </Suspense>
  );
}
