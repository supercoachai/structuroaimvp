"use client";

import { useI18n } from "@/lib/i18n";

export type CarryTaskRow = {
  id: string;
  title: string;
};

type DagafsluitingStepCarryProps = {
  tasks: CarryTaskRow[];
  carryIds: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
};

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 10 10" aria-hidden>
      <path
        d="M2 5L4 7L8 3"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DagafsluitingStepCarry({
  tasks,
  carryIds,
  onToggle,
  onNext,
}: DagafsluitingStepCarryProps) {
  const { t } = useI18n();
  const carryCount = carryIds.length;

  const hint =
    carryCount === 0
      ? t("dayShutdown.carryHintEmpty")
      : carryCount === 1
        ? t("dayShutdown.carryHintOne")
        : t("dayShutdown.carryHintMany", { n: String(carryCount) });

  return (
    <div className="dagafsluiting-eod-step w-full max-w-[380px]">
      <div className="mb-8 w-full text-center sm:mb-9">
        <p className="dagafsluiting-eod-eyebrow">{t("dayShutdown.stepCarryEyebrow")}</p>
        <h1 className="dagafsluiting-eod-title mb-8">{t("dayShutdown.stepCarryTitle")}</h1>
        <p className="dagafsluiting-eod-subtitle text-center text-balance">
          {t("dayShutdown.stepCarrySubtitle")}
        </p>
      </div>

      {tasks.length === 0 ? (
        <p className="mb-8 text-center text-sm text-[var(--st-muted-2)]">
          {t("dayShutdown.allDoneToday")}
        </p>
      ) : (
        <ul className="mb-8 flex flex-col gap-2">
          {tasks.map((task, i) => {
            const active = carryIds.includes(task.id);
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onToggle(task.id)}
                  className="dagafsluiting-eod-list-item flex w-full items-center gap-3.5 rounded-[14px] border px-4 py-3.5 text-left transition-all duration-200"
                  style={{
                    animationDelay: `${120 + i * 90}ms`,
                    background: active ? "var(--st-blue-haze)" : "transparent",
                    borderColor: active ? "rgba(59,107,247,0.30)" : "var(--st-line)",
                  }}
                >
                  <span
                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full transition-all duration-200"
                    style={{
                      background: active ? "var(--st-blue)" : "transparent",
                      border: active ? "none" : "1.5px solid var(--st-muted-2)",
                    }}
                    aria-hidden
                  >
                    {active ? <CheckIcon /> : null}
                  </span>
                  <span
                    className="min-w-0 flex-1 text-[15px] leading-snug tracking-tight transition-all duration-200"
                    style={{
                      fontWeight: active ? 500 : 400,
                      color: active ? "var(--st-ink)" : "var(--st-muted)",
                      ...(active
                        ? { textDecorationLine: "none" }
                        : {
                            textDecorationLine: "line-through",
                            textDecorationStyle: "solid",
                            textDecorationColor: "rgba(138,146,166,0.4)",
                          }),
                    }}
                  >
                    {task.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mb-6 min-h-[18px] text-center text-[13px] text-[var(--st-muted-2)]">{hint}</p>

      <div className="text-center">
        <button
          type="button"
          onClick={onNext}
          className="dagafsluiting-eod-link rounded-full px-4 py-2.5 text-sm text-[var(--st-muted)] transition-colors hover:text-[var(--st-ink)]"
        >
          {t("dayShutdown.continue")}
        </button>
      </div>
    </div>
  );
}
