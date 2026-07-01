import type { Metadata } from "next";

import RegisterV2Client from "@/components/v2/RegisterV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Account",
  description: "Begin licht. Een account mag later, zonder wachtwoord.",
  robots: { index: false, follow: false },
};

export default function V2RegisterPage() {
  return <RegisterV2Client />;
}
