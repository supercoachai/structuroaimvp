"use client";

import type { ReactNode } from "react";

type DagstartPickModeCardsProps = {
  selfTitle: string;
  selfSub: string;
  structuroTitle: string;
  structuroSub: string;
  onPickSelf: () => void;
  onPickStructuro: () => void;
  busy?: boolean;
};

function IconHand() {
  return (
    <svg
      className="h-6 w-6 shrink-0 sm:h-7 sm:w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 11V6a2 2 0 0 0-4 0v5" />
      <path d="M14 10V4a2 2 0 0 0-4 0v6" />
      <path d="M10 9.5V5a2 2 0 0 0-4 0v9.5a6 6 0 0 0 6 6h1.5a4.5 4.5 0 0 0 4.5-4.5V11" />
    </svg>
  );
}

function IconMagic() {
  return (
    <svg
      className="h-6 w-6 shrink-0 sm:h-7 sm:w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function PickCard({
  title,
  sub,
  icon,
  onClick,
  disabled,
}: {
  title: string;
  sub: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-white px-2 py-4 text-center transition-colors hover:bg-[var(--st-surface-2)] disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2.5 sm:py-5"
      style={{ borderColor: "var(--st-line)" }}
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl sm:h-12 sm:w-12"
        style={{
          background: "var(--st-blue-haze)",
          color: "var(--st-blue)",
        }}
      >
        {icon}
      </span>
      <span className="text-sm font-semibold text-[var(--st-ink)] sm:text-base">{title}</span>
      <span className="text-[10px] leading-snug text-[var(--st-muted)] sm:text-xs">{sub}</span>
    </button>
  );
}

export default function DagstartPickModeCards({
  selfTitle,
  selfSub,
  structuroTitle,
  structuroSub,
  onPickSelf,
  onPickStructuro,
  busy = false,
}: DagstartPickModeCardsProps) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:gap-3">
      <PickCard
        title={selfTitle}
        sub={selfSub}
        icon={<IconHand />}
        onClick={onPickSelf}
        disabled={busy}
      />
      <PickCard
        title={structuroTitle}
        sub={structuroSub}
        icon={<IconMagic />}
        onClick={onPickStructuro}
        disabled={busy}
      />
    </div>
  );
}
