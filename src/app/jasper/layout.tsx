import type { ReactNode } from "react";

/** Volledig scherm boven app-shell; child bepaalt de achtergrondkleur. */
export default function JasperLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120] min-h-[100dvh] overflow-y-auto overscroll-y-contain">
      {children}
    </div>
  );
}
