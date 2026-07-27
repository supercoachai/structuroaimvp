import type { ReactNode } from "react";

import "@/components/v2/structuro-tokens.css";

/**
 * Plan-paywall deelt v2 tokens/look met /abonnement,
 * zonder de volle V2Provider/app-shell.
 */
export default function RegistrerenPlanLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="v2-root"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}
