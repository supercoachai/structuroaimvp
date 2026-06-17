import type { ReactNode } from "react";

export default function TikTokLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120] min-h-[100dvh] overflow-y-auto overscroll-y-contain">
      {children}
    </div>
  );
}
