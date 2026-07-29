import type { Metadata } from "next";

import RegisterV2Client from "@/components/v2/RegisterV2Client";

export const metadata: Metadata = {
  title: "Account aanmaken | Structuro",
  description:
    "Maak je Structuro-account aan en start je gratis proefperiode.",
};

/** Legacy URL: door naar v2-onboarding (account zit in die flow). */
export default function RegistrerenPage() {
  return <RegisterV2Client />;
}
