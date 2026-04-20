"use client";

import { useState } from "react";
import type { Task } from "@/context/TaskContext";
import type { VoorzorgsmodusOption } from "@/lib/voorzorgsmodus";

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
  const [loading, setLoading] = useState(false);

  const handle = (option: VoorzorgsmodusOption) => {
    setLoading(true);
    onResolve(option);
  };

  const taskWord = deadlineTasks.length === 1 ? "deadline-taak" : "deadline-taken";

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
            Je hebt veel vandaag
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {deadlineTasks.length} {taskWord}, maar je energie laat{" "}
            {capacity > 0 ? `max ${capacity}` : "eigenlijk geen"} toe.
          </p>
        </div>

        <div className="mb-1.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Deadline-taken vandaag
          </p>
          <ul className="space-y-1.5 mb-5">
            {deadlineTasks.slice(0, 5).map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2"
              >
                <span className="text-red-400 text-xs">&#9679;</span>
                <span className="truncate">{t.title}</span>
              </li>
            ))}
            {deadlineTasks.length > 5 && (
              <li className="text-xs text-slate-400 px-3">
                +{deadlineTasks.length - 5} meer
              </li>
            )}
          </ul>
        </div>

        <p className="text-sm font-medium text-slate-700 mb-3">
          Wat wil je doen?
        </p>

        <div className="space-y-2.5 mb-5">
          <button
            type="button"
            onClick={() => handle("push")}
            disabled={loading}
            className="w-full p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-left transition-colors disabled:opacity-50"
          >
            <p className="font-semibold text-slate-900 text-sm">
              Doe ze allemaal
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Je werkt beter onder druk
            </p>
          </button>

          <button
            type="button"
            onClick={() => handle("prioriteer")}
            disabled={loading}
            className="w-full p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-left transition-colors disabled:opacity-50"
          >
            <p className="font-semibold text-slate-900 text-sm">
              Kies de {capacity} belangrijkste
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              De rest parkeer je voor morgen
            </p>
          </button>

          <button
            type="button"
            onClick={() => handle("schuif_uit")}
            disabled={loading}
            className="w-full p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-left transition-colors disabled:opacity-50"
          >
            <p className="font-semibold text-slate-900 text-sm">
              Schuif {excess} uit naar morgen
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Minder druk, vol bewustzijn
            </p>
          </button>
        </div>

        <div className="p-3.5 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
          <p className="text-xs text-slate-700 leading-relaxed">
            Je hoeft niet alles tegelijk te doen. Kies wat voor jou goed voelt.
          </p>
        </div>

        {loading && (
          <p className="mt-3 text-xs text-slate-400 text-center">
            Even verwerken...
          </p>
        )}
      </div>
    </div>
  );
}
