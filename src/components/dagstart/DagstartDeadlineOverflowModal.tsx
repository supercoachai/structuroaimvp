"use client";

import {
  formatOverdueDateForCopy,
  getDeadlineOverflowVariant,
} from "@/lib/dagstart/deadlineToday";
import { useI18n } from "@/lib/i18n";

type DagstartDeadlineOverflowModalProps = {
  taskTitle: string;
  dueAt: string | null | undefined;
  busy?: boolean;
  onPostpone: () => void;
  onAddAnyway: () => void;
};

export default function DagstartDeadlineOverflowModal({
  taskTitle,
  dueAt,
  busy = false,
  onPostpone,
  onAddAnyway,
}: DagstartDeadlineOverflowModalProps) {
  const { t, locale } = useI18n();
  const variant = getDeadlineOverflowVariant(dueAt);
  const body =
    variant === "overdue"
      ? t("dayStart.deadlineOverflowOverdue", {
          title: taskTitle,
          date: formatOverdueDateForCopy(
            dueAt,
            locale === "en" ? "en" : "nl"
          ),
        })
      : t("dayStart.deadlineOverflowToday", { title: taskTitle });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deadline-overflow-title"
      className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-900/35 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center"
    >
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white text-left shadow-xl">
        <div className="px-6 pb-2 pt-5">
          <h2
            id="deadline-overflow-title"
            className="text-base font-semibold leading-snug text-slate-900"
          >
            {body}
          </h2>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onPostpone}
            disabled={busy}
            className="w-full rounded-xl bg-[var(--st-blue)] py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("dayStart.deadlineOverflowPostpone")}
          </button>
          <button
            type="button"
            onClick={onAddAnyway}
            disabled={busy}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("dayStart.deadlineOverflowAddAnyway")}
          </button>
        </div>
      </div>
    </div>
  );
}
