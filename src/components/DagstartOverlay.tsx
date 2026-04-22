"use client";

import { useRef } from "react";
import DayStartCheckIn from "@/components/DayStartCheckIn";
import { getNextUniqueQuote } from "@/lib/adhdQuotes";

type DagstartOverlayProps = {
  onComplete: () => void;
};

/**
 * Fullscreen dagstart-flow bovenop home (geen aparte /dagstart-route).
 */
export default function DagstartOverlay({ onComplete }: DagstartOverlayProps) {
  const quoteRef = useRef(getNextUniqueQuote());

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-[#F4F6FB] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex w-full shrink-0 flex-col items-center px-4 pb-3 text-center">
        <div className="mb-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
          <span className="text-xl" aria-hidden>
            {"\u{1F305}"}
          </span>
        </div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--structuro-text)]">
          Dagstart
        </h1>
        <p className="structuro-page-subtitle mx-auto mt-1 max-w-md text-[var(--structuro-sub)]">
          Neem even de tijd om je dag te overzien.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col gap-4 pt-1">
          <DayStartCheckIn onComplete={onComplete} firstTimeOnboarding={false} />
          <p className="mx-auto max-w-md pb-1 text-center text-xs italic text-gray-400">
            &ldquo;{quoteRef.current}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
