import type { Metadata } from "next";
import RegistrerenAccountClient from "@/components/registreren/RegistrerenAccountClient";

export const metadata: Metadata = {
  title: "Account aanmaken | Structuro",
  description:
    "Maak je Structuro-account aan en start je gratis proefperiode.",
};

export default function RegistrerenPage() {
  return <RegistrerenAccountClient />;
}
