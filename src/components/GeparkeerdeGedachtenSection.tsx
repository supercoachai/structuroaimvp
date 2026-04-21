"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { useTaskContext, type Task } from "@/context/TaskContext";
import {
  fetchParkedThoughts,
  deleteParkedThought,
  convertThoughtToTask,
  type ParkedThought,
} from "@/lib/supabase/parkedThoughtsDb";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";
import { toast } from "./Toast";

const MAX_THOUGHTS = 10;

type ConvertModal =
  | null
  | { mode: "supabase"; thought: ParkedThought }
  | { mode: "local"; task: Task };

function dueAtFromDateInput(yyyyMmDd: string): string | null {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return null;
  const d = new Date(`${yyyyMmDd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function GeparkeerdeGedachtenSection() {
  const { user } = useUser();
  const { tasks, addTask, updateTask, fetchTasks, deleteTask } = useTaskContext();
  const [thoughts, setThoughts] = useState<ParkedThought[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertModal, setConvertModal] = useState<ConvertModal>(null);
  const [dueDate, setDueDate] = useState(() => getCalendarDateAmsterdam());
  const [durationMin, setDurationMin] = useState(15);
  const [energyLevel, setEnergyLevel] = useState<"low" | "medium" | "high">("medium");

  const localThoughts = tasks.filter((t) => t.source === "parked_thought" && !t.done);

  const isSupabase = Boolean(user?.id);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchParkedThoughts(user.id);
      setThoughts(data);
    } catch {
      setThoughts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (convertModal) {
      setDueDate(getCalendarDateAmsterdam());
      setDurationMin(15);
      setEnergyLevel("medium");
    }
  }, [convertModal]);

  const handleDelete = async (thought: ParkedThought) => {
    try {
      await deleteParkedThought(thought.id);
      setThoughts((prev) => prev.filter((t) => t.id !== thought.id));
      toast("Gedachte verwijderd");
    } catch {
      toast("Kon gedachte niet verwijderen");
    }
  };

  const runConvert = async () => {
    if (!convertModal) return;
    const dur = Math.max(1, Math.min(480, Number(durationMin) || 15));
    const dueAt = dueAtFromDateInput(dueDate);

    if (convertModal.mode === "supabase") {
      if (!user?.id) return;
      const thought = convertModal.thought;
      setConvertingId(thought.id);
      try {
        const created = await addTask({
          title: thought.content,
          done: false,
          started: false,
          priority: null,
          dueAt,
          duration: dur,
          source: "regular",
          reminders: [],
          repeat: "none",
          impact: "🧠",
          energyLevel,
          estimatedDuration: dur,
          microSteps: [],
          notToday: false,
        });
        await convertThoughtToTask(thought.id, created.id);
        setThoughts((prev) => prev.filter((t) => t.id !== thought.id));
        await fetchTasks();
        toast("Taak staat bij Alle open taken");
        setConvertModal(null);
      } catch {
        toast("Kon niet omzetten");
      } finally {
        setConvertingId(null);
      }
      return;
    }

    const task = convertModal.task;
    setConvertingId(task.id);
    try {
      await updateTask(task.id, {
        source: "regular",
        dueAt,
        duration: dur,
        estimatedDuration: dur,
        energyLevel,
      });
      await fetchTasks();
      toast("Taak staat bij Alle open taken");
      setConvertModal(null);
    } catch {
      toast("Kon niet omzetten");
    } finally {
      setConvertingId(null);
    }
  };

  const items = isSupabase ? thoughts : localThoughts;
  const percent = isSupabase ? Math.round((thoughts.length / MAX_THOUGHTS) * 100) : 0;

  if (loading && isSupabase) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-400 animate-pulse">Gedachten laden...</p>
      </div>
    );
  }

  if (items.length === 0) return null;

  const modalTitle =
    convertModal?.mode === "supabase"
      ? convertModal.thought.content
      : convertModal?.mode === "local"
        ? convertModal.task.title
        : "";

  return (
    <>
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          Geparkeerde gedachten
        </h3>
        {isSupabase && (
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
            {thoughts.length}/{MAX_THOUGHTS}
          </span>
        )}
      </div>

      {isSupabase && (
        <div className="px-5 pb-3">
          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percent >= 90 ? "bg-amber-400" : "bg-blue-500"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      <ul className="divide-y divide-gray-50">
        {items.map((item) => {
          const isSupabaseRow = "content" in item;
          const id = item.id;
          const text = isSupabaseRow
            ? (item as ParkedThought).content
            : (item as Task).title;
          const isConverting = convertingId === id;
          const localTask = !isSupabaseRow ? (item as Task) : null;

          return (
            <li
              key={id}
              className="group flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
            >
              <span className="text-slate-300 mt-0.5 text-sm">💭</span>
              <p className="flex-1 text-sm text-slate-700 leading-snug min-w-0 break-words">
                {text}
              </p>
              <div className="flex shrink-0 flex-wrap items-center justify-end sm:opacity-100">
                {(isSupabaseRow || localTask) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isSupabaseRow) {
                        setConvertModal({ mode: "supabase", thought: item as ParkedThought });
                      } else if (localTask) {
                        setConvertModal({ mode: "local", task: localTask });
                      }
                    }}
                    disabled={isConverting}
                    className="text-xs text-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isConverting ? "…" : "Maak taak"}
                  </button>
                )}
                {isSupabaseRow && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item as ParkedThought)}
                    className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                  >
                    Weg
                  </button>
                )}
                {!isSupabase && localTask && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Deze gedachte verwijderen?")) return;
                      try {
                        await deleteTask(localTask.id);
                        toast("Verwijderd");
                        await fetchTasks();
                      } catch {
                        toast("Kon niet verwijderen");
                      }
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                  >
                    Weg
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {isSupabase && thoughts.length >= 9 && (
        <div className="mx-5 mb-4 mt-2 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
          <p className="text-xs text-slate-700 font-medium">
            Bijna vol. Zet gedachten om naar taken om ruimte vrij te maken.
          </p>
        </div>
      )}
    </div>

    {convertModal ? (
      <div
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-4 pt-4 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+var(--keyboard-inset-bottom,0px)))] sm:items-center"
        role="presentation"
        onClick={() => setConvertModal(null)}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
          role="dialog"
          aria-labelledby="convert-thought-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="convert-thought-title" className="text-lg font-semibold text-gray-900">
            Omzetten naar taak
          </h3>
          <p className="mt-2 line-clamp-4 text-sm text-gray-600">{modalTitle}</p>

          <label className="mt-4 block text-sm font-semibold text-gray-700" htmlFor="park-convert-due">
            Deadline (datum)
          </label>
          <input
            id="park-convert-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />

          <label className="mt-4 block text-sm font-semibold text-gray-700" htmlFor="park-convert-dur">
            Geschatte duur (minuten)
          </label>
          <input
            id="park-convert-dur"
            type="number"
            min={1}
            max={480}
            value={durationMin}
            onChange={(e) => setDurationMin(parseInt(e.target.value, 10) || 15)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />

          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-700">Energie</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["low", "medium", "high"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setEnergyLevel(lvl)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    energyLevel === lvl
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {lvl === "low"
                    ? "Laag"
                    : lvl === "medium"
                      ? "Normaal"
                      : "Intensief"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => setConvertModal(null)}
              className="order-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-200 sm:order-1"
            >
              Annuleren
            </button>
            <button
              type="button"
              disabled={Boolean(convertingId)}
              onClick={() => void runConvert()}
              className="order-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 sm:order-2"
            >
              {convertingId ? "Bezig…" : "Omzetten naar taak"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
