import type { Metadata } from "next";
import RegistrerenPlanClient from "@/components/registreren/RegistrerenPlanClient";

export const metadata: Metadata = {
  title: "Kies je abonnement | Structuro",
  description: "Kies maandelijks of jaarlijks en start met Structuro.",
};

export default function RegistrerenPlanPage() {
  return <RegistrerenPlanClient />;
}
