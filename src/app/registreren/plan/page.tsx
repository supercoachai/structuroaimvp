import type { Metadata } from "next";
import RegistrerenPlanClient from "@/components/registreren/RegistrerenPlanClient";

export const metadata: Metadata = {
  title: "Abonnement | Structuro",
  description: "Behoud je ritme. Ga verder met Structuro na je proefperiode.",
};

export default function RegistrerenPlanPage() {
  return <RegistrerenPlanClient />;
}
