"use client";

import { useState } from "react";
import type { Task } from "@/context/TaskContext";
import type { VoorzorgsmodusOption } from "@/lib/voorzorgsmodus";
import { useI18n } from "@/lib/i18n";

interface VoorzorgsmodusModalProps {
  deadlineTasks: Task[];
  capacity: number;
  excess: number;
  onResolve: (option: VoorzorgsmodusOption) => void;
}

export default function VoorzorgsmodusModal({
  deadlineTasks,
  capacity,
  excess,
  onResolve,
}: VoorzorgsmodusModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const handle = (option: VoorzorgsmodusOption) => {
    setLoading(true);
    onResolve(option);
  };

  const taskWord =
    deadlineTasks.length === 1
      ? t("voorzorgs.taskWord1")
      : t("voorzorgs.taskWordN");
  const capPhrase =
    capacity > 0
      ? t("voorzorgs.capMax", { n: String(capacity) })
      : t("voorzorgs.capNone");
  const intro = t("voorzorgs.intro", {
    count: String(deadlineTasks.length),
    taskWord,
    capPhrase,
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full p-6 sm:p-7"
        role="dialog"
        aria-labelledby="voorzorgsmodus-title"
      >
        <div className="mb-5">
          <h2
            id="voorzorgsmodus-title"
            className="text-lg font-semibold text-slate-900 mb-1.5"
          >
            {t("voorzorgs.title")}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">{intro}</p>
        </div>

        <div className="mb-1.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            {t("voorzorgs.listTitle")}
          </p>
          <ul className="space-y-1.5 mb-5">
            {deadlineTasks.slice(0, 5).map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2"
              >
                <span className="text-red-400 text-xs">&#9679;</span>
                <span className="truncate">{task.title}</span>
              </li>
            ))}
            {deadlineTasks.length > 5 && (
              <li className="text-xs text-slate-400 px-3">
                {t("voorzorgs.listMore", {
                  n: String(deadlineTasks.length - 5),
                })}
              </li>
            )}
          </ul>
        </div>

        <p className="text-sm font-medium text-slate-700 mb-3">
          {t("voorzorgs.whatNow")}
        </p>

        <div className="space-y-2.5 mb-5">
          <button
            type="button"
            onClick={() => handle("push")}
            disabled={loading}
            className="w-full p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-left transition-colors disabled:opacity-50"
          >
            <p className="font-semibold text-slate-900 text-sm">
              {t("voorzorgs.optAllTitle")}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("voorzorgs.optAllSub")}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handle("prioriteer")}
            disabled={loading}
            className="w-full p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-left transition-colors disabled:opacity-50"
          >
            <p className="font-semibold text-slate-900 text-sm">
              {t("voorzorgs.optPickTitle", { n: String(capacity) })}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("voorzorgs.optPickSub")}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handle("schuif_uit")}
            disabled={loading}
            className="w-full p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-left transition-colors disabled:opacity-50"
          >
            <p className="font-semibold text-slate-900 text-sm">
              {t("voorzorgs.optShiftTitle", { n: String(excess) })}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("voorzorgs.optShiftSub")}
            </p>
          </button>
        </div>

        <div className="p-3.5 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
          <p className="text-xs text-slate-700 leading-relaxed">
            {t("voorzorgs.hint")}
          </p>
        </div>

        {loading && (
          <p className="mt-3 text-xs text-slate-400 text-center">
            {t("voorzorgs.processing")}
          </p>
        )}
      </div>
    </div>
  );
}
