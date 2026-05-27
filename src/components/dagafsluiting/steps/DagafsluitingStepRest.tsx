"use client";

import { getShutdownMoodMeta } from "@/lib/dagafsluiting/shutdownMoods";
import type { SatisfactionLevel } from "@/components/dagafsluiting/DagafsluitingSatisfactionCards";
import { useI18n } from "@/lib/i18n";

type DagafsluitingStepRestProps = {
  mood: SatisfactionLevel | null;
  saving?: boolean;
  saveError?: string | null;
  onRetry?: () => void;
};

export default function DagafsluitingStepRest({
  mood,
  saving = false,
  saveError,
  onRetry,
}: DagafsluitingStepRestProps) {
  const { t } = useI18n();
  const meta = getShutdownMoodMeta(mood);
  const color = meta?.color ?? "#3B6BF7";
  const adjective = meta ? t(`dayShutdown.${meta.adjectiveKey}`) : t("dayShutdown.moodAdjCalm");

  return (
    <div className="dagafsluiting-eod-step flex w-full max-w-[380px] flex-col items-center pt-2">
      <div
        className="dagafsluiting-eod-orb relative mb-10 flex h-[min(240px,42vw)] w-[min(240px,42vw)] items-center justify-center sm:mb-12"
        aria-hidden
      >
        <div
          className="dagafsluiting-eod-orb-ring absolute inset-0 rounded-full"
          style={{ border: `1px solid ${color}28` }}
        />
        <div
          className="dagafsluiting-eod-orb-ring dagafsluiting-eod-orb-ring--delay absolute inset-[30px] rounded-full"
          style={{ border: `1px solid ${color}40` }}
        />
        <div
          className="dagafsluiting-eod-orb-core h-[min(130px,24vw)] w-[min(130px,24vw)] rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${color}50, ${color}18 55%, transparent 75%)`,
          }}
        />
      </div>

      <h1 className="mb-2.5 text-center text-[clamp(1.35rem,5vw,1.75rem)] font-medium leading-tight tracking-tight text-[var(--st-ink)]">
        {t("dayShutdown.stepRestTitle")}
      </h1>

      <p
        className="dagafsluiting-eod-rest-line m-0 text-center text-base text-[var(--st-muted)]"
        style={{ animationDelay: "300ms" }}
      >
        {t("dayShutdown.stepRestFelt")}{" "}
        <span style={{ color, fontWeight: 500 }}>{adjective}</span>.
      </p>

      {saving ? (
        <p className="mt-6 text-center text-xs text-[var(--st-muted-2)]">
          {t("dayShutdown.submitting")}
        </p>
      ) : null}

      {saveError ? (
        <div className="mt-4 text-center" role="alert">
          <p className="text-sm text-[var(--st-red-deep)]">{saveError}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-full px-4 py-2 text-sm text-[var(--st-muted)] transition-colors hover:text-[var(--st-ink)]"
            >
              {t("common.tryAgain")}
            </button>
          ) : null}
        </div>
      ) : null}

      <p
        className="dagafsluiting-eod-goodnight mt-[clamp(3rem,12vh,6rem)] text-[13px] font-medium uppercase tracking-[0.15em] text-[var(--st-muted-2)]"
        style={{ animationDelay: "1200ms" }}
      >
        {t("dayShutdown.goodNight")}
      </p>
    </div>
  );
}
