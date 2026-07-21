import type { Metadata } from "next";

import SettingsV2Client from "@/components/v2/SettingsV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Instellingen",
  description: "Rustige voorkeuren: reminders, cyclus, data.",
  robots: { index: false, follow: false },
};

export default function V2SettingsPage() {
  return <SettingsV2Client />;
}
