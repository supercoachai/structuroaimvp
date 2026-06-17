import type { ReactNode } from "react";

/** Volledig scherm boven app-shell; Story Layer achtergrond van child bepaalt kleur. */
export default function StartLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120] min-h-[100dvh] overflow-y-auto overscroll-y-contain">
      {children}
    </div>
  );
}
