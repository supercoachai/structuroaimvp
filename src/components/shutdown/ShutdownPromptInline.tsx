"use client";

import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { captureProductEvent } from "@/lib/posthog/track";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

type ShutdownPromptInlineProps = {
  onDismiss: () => void;
};

function dismissedKeyForToday(): string {
  return `structuro_shutdown_prompt_dismissed:${getCalendarDateAmsterdam()}`;
}

export function isShutdownPromptDismissedToday(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(dismissedKeyForToday()) === "1";
  } catch {
    return false;
  }
}

export function markShutdownPromptDismissedToday(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(dismissedKeyForToday(), "1");
  } catch {
    /* ignore */
  }
}

export default function ShutdownPromptInline({ onDismiss }: ShutdownPromptInlineProps) {
  const handleDismiss = () => {
    markShutdownPromptDismissedToday();
    onDismiss();
  };

  const handleClick = () => {
    captureProductEvent(ANALYTICS_EVENTS.shutdown_prompt_clicked, {
      source: "last_task_complete",
    });
    markShutdownPromptDismissedToday();
  };

  return (
    <div
      className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#E8E4F0] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      role="region"
      aria-label="Dag afsluiten"
    >
      <p className="text-sm text-[#2D2640]">
        Dat was je laatste taak van vandaag. 30 seconden afsluiten?
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/shutdown"
          onClick={handleClick}
          className="rounded-xl bg-[#7C6BC4] px-4 py-2 text-sm font-medium text-white"
        >
          Afsluiten
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-2 text-[#8B8499] hover:bg-[#F5F3FA]"
          aria-label="Sluiten"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
