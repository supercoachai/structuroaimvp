"use client";

import type { SatisfactionLevel } from "@/components/dagafsluiting/DagafsluitingSatisfactionCards";
import { SHUTDOWN_MOODS } from "@/lib/dagafsluiting/shutdownMoods";
import { useI18n } from "@/lib/i18n";

type DagafsluitingStepMoodProps = {
  mood: SatisfactionLevel | null;
  onPick: (level: SatisfactionLevel) => void;
};

export default function DagafsluitingStepMood({
  mood,
  onPick,
}: DagafsluitingStepMoodProps) {
  const { t } = useI18n();

  return (
    <div className="dagafsluiting-eod-step w-full max-w-[480px]">
      <div className="mb-10 text-center sm:mb-11">
        <p className="dagafsluiting-eod-eyebrow">{t("dayShutdown.stepMoodEyebrow")}</p>
        <h1 className="dagafsluiting-eod-title">{t("dayShutdown.satisfactionTitle")}</h1>
      </div>

      <div className="dagafsluiting-eod-mood-grid mx-auto grid w-full max-w-[480px] grid-cols-3 gap-3 sm:gap-3.5">
        {SHUTDOWN_MOODS.map((m, i) => {
          const active = mood === m.id;
          const dim = mood != null && !active;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              onClick={() => onPick(m.id)}
              className="dagafsluiting-eod-list-item flex aspect-square flex-col items-center justify-center gap-3 rounded-3xl border transition-all duration-300 active:scale-[0.98]"
              style={{
                animationDelay: `${120 + i * 90}ms`,
                background: active ? m.haze : "#FFFFFF",
                borderColor: active ? m.color : "var(--st-line)",
                opacity: dim ? 0.35 : 1,
                transform: active ? "translateY(-3px) scale(1.02)" : "none",
                boxShadow: active
                  ? `0 14px 30px -10px ${m.color}40, 0 0 0 6px ${m.haze}`
                  : "0 1px 2px rgba(14,23,48,0.04)",
              }}
            >
              <span
                className="h-11 w-11 rounded-full transition-transform duration-300"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${m.color}, ${m.color}80 60%, ${m.color}40 100%)`,
                  boxShadow: `inset 0 -6px 12px ${m.color}30`,
                  transform: active ? "scale(1.1)" : "scale(1)",
                }}
                aria-hidden
              />
              <span
                className="text-lg font-medium tracking-tight transition-colors duration-200"
                style={{ color: active ? m.color : "var(--st-ink)" }}
              >
                {t(`dayShutdown.${m.labelKey}`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
