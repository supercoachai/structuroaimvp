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
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[#F4F6FB] pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-8">
        <header className="mb-4 flex w-full flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
            <span className="text-xl" aria-hidden>
              {"\u{1F305}"}
            </span>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--structuro-text)]">
            Dagstart
          </h1>
          <p className="structuro-page-subtitle mx-auto mt-1 text-[var(--structuro-sub)]">
            Neem even de tijd om je dag te overzien.
          </p>
        </header>

        <div className="flex w-full flex-col gap-4">
          <DayStartCheckIn onComplete={onComplete} firstTimeOnboarding={false} />
          <p className="mx-auto max-w-md text-center text-xs italic text-gray-400">
            &ldquo;{quoteRef.current}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
