import type { Metadata } from "next";

import LoginV2Client from "@/components/v2/LoginV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Inloggen",
  description: "Welkom terug. Inloggen met Google of e-mail.",
  robots: { index: false, follow: false },
};

export default function V2LoginPage() {
  return <LoginV2Client />;
}
