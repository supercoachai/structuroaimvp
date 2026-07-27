import type { ReactNode } from "react";

import "@/components/v2/structuro-tokens.css";

/**
 * Consent is een bare post-auth stap buiten /v2.
 * Tokens + .v2-root zodat V2Chrome / v2Styles de Variant F look krijgen
 * zonder de volledige V2Provider/app-shell.
 */
export default function ConsentLayout({ children }: { children: ReactNode }) {
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
