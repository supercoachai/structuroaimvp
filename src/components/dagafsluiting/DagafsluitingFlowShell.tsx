"use client";

import type { ReactNode } from "react";

type DagafsluitingFlowShellProps = {
  step: number;
  onBack?: () => void;
  stageAlign?: "center" | "start";
  children: ReactNode;
};

export default function DagafsluitingFlowShell({
  step,
  onBack,
  stageAlign = "center",
  children,
}: DagafsluitingFlowShellProps) {
  const showBack = step > 0 && step < 3;

  return (
    <div className="dagafsluiting-eod-app flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div
        className="dagafsluiting-eod-backrow flex h-8 shrink-0 items-center px-6 transition-opacity duration-200"
        style={{
          opacity: showBack ? 1 : 0,
          pointerEvents: showBack ? "auto" : "none",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-2 py-1 text-[13px] text-[var(--st-muted-2)] transition-colors hover:text-[var(--st-ink)]"
          aria-label="Terug"
        >
          ←
        </button>
      </div>

      <div className="dagafsluiting-eod-content flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-5 py-6 sm:px-6 sm:py-8">
        <div
          className={`dagafsluiting-eod-stage flex w-full min-h-0 flex-1 flex-col ${
            stageAlign === "start" ? "items-center justify-start" : "items-center justify-center"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
