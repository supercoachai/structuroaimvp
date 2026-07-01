import type { Metadata } from "next";

import DagstartV2Client from "@/components/v2/DagstartV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Dagstart",
  description: "Energie kiezen en een ding pakken. Rustig en zonder minuten.",
  robots: { index: false, follow: false },
};

export default function V2DagstartPage() {
  return <DagstartV2Client />;
}
