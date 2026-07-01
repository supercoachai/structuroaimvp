import type { Metadata } from "next";

import LoginV2Client from "@/components/v2/LoginV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Inloggen",
  description: "Magic-link-eerst inloggen. Geen wachtwoord nodig.",
  robots: { index: false, follow: false },
};

export default function V2LoginPage() {
  return <LoginV2Client />;
}
