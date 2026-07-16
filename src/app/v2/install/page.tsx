import type { Metadata } from "next";
import { Suspense } from "react";

import InstallV2Client from "@/components/v2/InstallV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Zet op beginscherm",
  description: "Voeg Structuro toe aan je beginscherm voor één-tik openen.",
  robots: { index: false, follow: false },
};

function InstallFallback() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
      }}
    >
      …
    </main>
  );
}

export default function V2InstallPage() {
  return (
    <Suspense fallback={<InstallFallback />}>
      <InstallV2Client />
    </Suspense>
  );
}
