"use client";

import DayStartCheckIn from "@/components/DayStartCheckIn";

type DagstartOverlayProps = {
  onComplete: () => void;
};

/**
 * Fullscreen dagstart-flow bovenop home (geen aparte /dagstart-route verplicht).
 * Geen dubbele app-header: merk + Dagstart staan in de kaart (DayStartCheckIn).
 */
export default function DagstartOverlay({ onComplete }: DagstartOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-[#F4F6FB] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+5.25rem))]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-4">
        <div className="mx-auto w-full max-w-lg min-h-0">
          <DayStartCheckIn onComplete={onComplete} firstTimeOnboarding={false} />
        </div>
      </div>
    </div>
  );
}
