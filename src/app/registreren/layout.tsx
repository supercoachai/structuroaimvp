import type { ReactNode } from "react";

/** Voorkomt statische RSC-cache op Vercel (POST /registreren/* gaf 405). */
export const dynamic = "force-dynamic";

export default function RegistrerenLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120] min-h-[100dvh] overflow-y-auto overscroll-y-contain">
      {children}
    </div>
  );
}
