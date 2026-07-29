import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Legacy /v2 layout: shell komt uit AppProviders (V2LiveShell) voor /v2 én canonieke paden.
 * Hier alleen metadata; geen tweede V2Provider.
 */
export const metadata: Metadata = {
  title: "Structuro",
  description: "Rustig beginnen: maximaal drie dingen voor vandaag.",
  robots: { index: false, follow: false },
};

export default function V2Layout({ children }: { children: ReactNode }) {
  return children;
}
