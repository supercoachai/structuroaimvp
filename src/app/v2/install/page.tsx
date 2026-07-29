import type { Metadata } from "next";
import { Suspense } from "react";

import InstallV2Client from "@/components/v2/InstallV2Client";
import StructuroLogoLoading from "@/components/structuro/StructuroLogoLoading";

export const metadata: Metadata = {
  title: "Structuro v2 | Zet op beginscherm",
  description: "Voeg Structuro toe aan je beginscherm voor één-tik openen.",
  robots: { index: false, follow: false },
};

export default function V2InstallPage() {
  return (
    <Suspense fallback={<StructuroLogoLoading />}>
      <InstallV2Client />
    </Suspense>
  );
}
