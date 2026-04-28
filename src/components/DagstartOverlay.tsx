"use client";

import DayStartCheckIn from "@/components/DayStartCheckIn";
import { useI18n } from "@/lib/i18n";

type DagstartOverlayProps = {
  onComplete: () => void;
};

/**
 * Fullscreen dagstart-flow bovenop home (geen aparte /dagstart-route).
 */
export default function DagstartOverlay({ onComplete }: DagstartOverlayProps) {
  const { t } = useI18n();

  /** Ruimte voor de (gedimde) tab-balk onderaan, zodat de kaart er niet achter valt. */
  const bottomChromePad =
    "pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+5.25rem))]";

  return (
    <div
      className={`fixed inset-0 z-[100] flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-[#F4F6FB] pt-[max(0.75rem,env(safe-area-inset-top))] ${bottomChromePad}`}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4">
        <header className="mb-3 mt-4 flex w-full shrink-0 flex-col items-center px-2 pb-1 text-center sm:mb-4 sm:mt-6">
          <div className="mb-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
            <span className="text-xl" aria-hidden>
              {"\u{1F305}"}
            </span>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--structuro-text)]">
            {t('dagstart.title')}
          </h1>
          <p className="structuro-page-subtitle mx-auto mt-1 max-w-md text-[var(--structuro-sub)]">
            {t('dagstart.subtitle')}
          </p>
        </header>

        <div className="mx-auto flex w-full max-w-lg pb-4">
          <DayStartCheckIn onComplete={onComplete} firstTimeOnboarding={false} />
        </div>

      </div>
    </div>
  );
}
