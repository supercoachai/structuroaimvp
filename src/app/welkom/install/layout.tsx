import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Structuro | Zet op beginscherm",
  description: "Voeg Structuro toe aan je beginscherm voor één-tik openen.",
  robots: { index: false, follow: false },
};

export default function WelkomInstallLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
