import type { Metadata } from "next";
import { Suspense } from "react";

import StopAbonnementV2Client from "@/components/v2/StopAbonnementV2Client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Structuro | Abonnement stoppen",
  robots: { index: false, follow: false },
};

export default function StopAbonnementPage() {
  return (
    <Suspense fallback={null}>
      <StopAbonnementV2Client />
    </Suspense>
  );
}
