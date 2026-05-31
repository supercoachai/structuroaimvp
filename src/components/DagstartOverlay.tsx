"use client";

import { useEffect } from "react";
import DagstartFlow from "@/components/dagstart/design/DagstartFlow";

type DagstartOverlayProps = {
  onComplete: () => void;
  onPhaseChange?: (phase: "energy" | "tasks" | null) => void;
};

/** Dagstart in de app-shell tussen header en tab-nav (geen fullscreen fixed overlay). */
export default function DagstartOverlay({ onComplete, onPhaseChange }: DagstartOverlayProps) {
  useEffect(() => {
    onPhaseChange?.("energy");
    return () => onPhaseChange?.(null);
  }, [onPhaseChange]);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#F0F2F8]">
      <DagstartFlow onComplete={onComplete} />
    </div>
  );
}
