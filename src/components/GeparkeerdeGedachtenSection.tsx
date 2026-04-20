"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { useTaskContext } from "@/context/TaskContext";
import {
  fetchParkedThoughts,
  deleteParkedThought,
  convertThoughtToTask,
  type ParkedThought,
} from "@/lib/supabase/parkedThoughtsDb";
import { toast } from "./Toast";

const MAX_THOUGHTS = 10;

export default function GeparkeerdeGedachtenSection() {
  const { user } = useUser();
  const { tasks, addTask } = useTaskContext();
  const [thoughts, setThoughts] = useState<ParkedThought[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);

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

  const handleDelete = async (thought: ParkedThought) => {
    try {
      await deleteParkedThought(thought.id);
      setThoughts((prev) => prev.filter((t) => t.id !== thought.id));
      toast("Gedachte verwijderd");
    } catch {
      toast("Kon gedachte niet verwijderen");
    }
  };

  const handleConvert = async (thought: ParkedThought) => {
    if (!user?.id) return;
    setConvertingId(thought.id);
    try {
      const created = await addTask({
        title: thought.content,
        done: false,
        started: false,
        priority: null,
        dueAt: null,
        duration: 15,
        source: "regular",
        reminders: [],
        repeat: "none",
        impact: "🧠",
        energyLevel: "medium",
        estimatedDuration: null,
        microSteps: [],
        notToday: false,
      });
      await convertThoughtToTask(thought.id, created.id);
      setThoughts((prev) => prev.filter((t) => t.id !== thought.id));
      toast("Omgezet naar taak");
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

  return (
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
          const isParkedThought = "content" in item;
          const id = item.id;
          const text = isParkedThought
            ? (item as ParkedThought).content
            : (item as any).title;
          const isConverting = convertingId === id;

          return (
            <li
              key={id}
              className="group flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
            >
              <span className="text-slate-300 mt-0.5 text-sm">💭</span>
              <p className="flex-1 text-sm text-slate-700 leading-snug min-w-0 break-words">
                {text}
              </p>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {isSupabase && isParkedThought && (
                  <button
                    type="button"
                    onClick={() => handleConvert(item as ParkedThought)}
                    disabled={isConverting}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40"
                  >
                    {isConverting ? "..." : "Maak taak"}
                  </button>
                )}
                {isSupabase && isParkedThought && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item as ParkedThought)}
                    className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
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
  );
}
