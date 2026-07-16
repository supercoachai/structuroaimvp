import type { Metadata } from "next";

import ShutdownV2Client from "@/components/v2/ShutdownV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Dagafsluiting",
  description: "Sluit je dag rustig af. Wat af is, wat mag wachten, en optioneel een avond-dump.",
  robots: { index: false, follow: false },
};

export default function V2ShutdownPage() {
  return <ShutdownV2Client />;
}
