"use client";

import { useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@/lib/i18n";
import type { CyclePhase } from "@/lib/cycle/types";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

const STORAGE_KEY_PREFIX = "structuro_cycle_hint_dismissed_";

function dismissKey(date: string): string {
  return `${STORAGE_KEY_PREFIX}${date}`;
}

function readDismissed(date: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(dismissKey(date)) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(date: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(dismissKey(date), "1");
  } catch {
    /* ignore */
  }
}

export type CyclePhaseHintProps = {
  phase: CyclePhase | null;
};

export default function CyclePhaseHint({ phase }: CyclePhaseHintProps) {
  const { t } = useI18n();
  const today = useMemo(() => getCalendarDateAmsterdam(), []);
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(today));

  if (!phase || phase === "unknown") return null;
  if (dismissed) return null;

  const text =
    phase === "menstrual"
      ? t("cycle.hintMenstrual")
      : phase === "follicular"
        ? t("cycle.hintFollicular")
        : phase === "ovulation"
          ? t("cycle.hintOvulation")
          : t("cycle.hintLuteal");

  return (
    <div
      role="note"
      aria-live="polite"
      className="relative mt-4 flex w-full max-w-md items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/90 px-4 py-3 text-left text-sm leading-relaxed text-slate-700 shadow-sm"
    >
      <p className="flex-1 pr-6">{text}</p>
      <button
        type="button"
        onClick={() => {
          writeDismissed(today);
          setDismissed(true);
        }}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
        aria-label={t("cycle.hintDismissAria")}
      >
        <XMarkIcon className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
