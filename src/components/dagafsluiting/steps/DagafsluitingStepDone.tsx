"use client";

import { useI18n } from "@/lib/i18n";

export type DoneTaskRow = {
  id: string;
  title: string;
  completedAt: string;
  minutes: number | null;
};

type DagafsluitingStepDoneProps = {
  tasks: DoneTaskRow[];
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

export default function DagafsluitingStepDone({
  tasks,
  onNext,
}: DagafsluitingStepDoneProps) {
  const { t } = useI18n();

  return (
    <div className="dagafsluiting-eod-step w-full max-w-[380px]">
      <div className="mb-8 text-center sm:mb-9">
        <p className="dagafsluiting-eod-eyebrow">{t("dayShutdown.stepDoneEyebrow")}</p>
        <h1 className="dagafsluiting-eod-title">{t("dayShutdown.stepDoneTitle")}</h1>
      </div>

      {tasks.length === 0 ? (
        <p className="mb-10 text-center text-sm leading-relaxed text-[var(--st-muted)]">
          {t("dayShutdown.noCompleted")}
        </p>
      ) : (
        <ul className="mb-10 flex flex-col gap-0.5">
          {tasks.map((task, i) => (
            <li
              key={task.id}
              className="dagafsluiting-eod-list-item flex items-center gap-3.5 border-b border-[var(--st-line)] px-1 py-3 last:border-b-0"
              style={{
                animationDelay: `${120 + i * 80}ms`,
              }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--st-green)] shadow-[0_1px_2px_rgba(34,197,94,0.25)]"
                aria-hidden
              >
                <CheckIcon />
              </span>
              <span className="min-w-0 flex-1 text-[15px] leading-snug tracking-tight text-[var(--st-ink)]">
                {task.title}
              </span>
              {task.completedAt ? (
                <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--st-muted-2)]">
                  {task.completedAt}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

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
