import type { Metadata } from "next";
import { Suspense } from "react";

import InstallV2Client from "@/components/v2/InstallV2Client";
import StructuroLogoLoading from "@/components/structuro/StructuroLogoLoading";

export const metadata: Metadata = {
  title: "Structuro | Zet op beginscherm",
  description: "Voeg Structuro toe aan je beginscherm voor één-tik openen.",
  robots: { index: false, follow: false },
};

/** Canonieke install-route (livePaths.install). Legacy /v2/install redirect hierheen. */
export default function WelkomInstallPage() {
  return (
    <Suspense fallback={<StructuroLogoLoading />}>
      <InstallV2Client />
    </Suspense>
  );
}
