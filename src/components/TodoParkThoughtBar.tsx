"use client";

import { useState, useEffect } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { useTaskContext } from "@/context/TaskContext";
import { useUser } from "@/hooks/useUser";
import { insertParkedThought, countActiveParkedThoughts } from "@/lib/supabase/parkedThoughtsDb";
import { toast } from "@/components/Toast";
import { track } from "@/shared/track";

/**
 * Vaste balk boven de tabnav op de startpagina (/): typ een gedachte en parkeer (Supabase of lokale taak).
 */
export default function TodoParkThoughtBar() {
  const { addTask } = useTaskContext();
  const { user } = useUser();
  const [value, setValue] = useState("");
  const [parkedCount, setParkedCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    countActiveParkedThoughts(user.id)
      .then(setParkedCount)
      .catch(() => setParkedCount(0));
  }, [user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    try {
      if (user?.id) {
        if (parkedCount >= 10) {
          toast("Je hebt al 10 geparkeerde gedachten. Zet er eerst een paar om naar taken.");
          return;
        }
        await insertParkedThought(user.id, text);
        setParkedCount((c) => c + 1);
        if (parkedCount + 1 >= 9) {
          toast("Bijna vol (9/10). Na je sessie: omzetten naar taken.");
        } else {
          toast("Gedachte geparkeerd!");
        }
      } else {
        await addTask({
          title: text,
          duration: null,
          priority: null,
          done: false,
          started: false,
          dueAt: null,
          reminders: [],
          repeat: "none",
          impact: "🧠",
          source: "parked_thought",
          energyLevel: "low",
          estimatedDuration: null,
        });
        toast("Gedachte geparkeerd!");
      }
      setValue("");
      track("park_thought_from_todo", { length: text.length });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "max_reached") {
        toast("Maximum 10 gedachten bereikt. Zet ze om naar taken.");
        return;
      }
      toast("Fout bij parkeren: " + (msg || "Onbekend"));
    }
  };

  return (
    <div
      className="shrink-0 border-t bg-[var(--structuro-bg)] px-4 pt-2.5"
      style={{ borderColor: "var(--structuro-border)" }}
    >
      <form onSubmit={submit} className="mx-auto w-full max-w-lg pb-1">
        <label htmlFor="todo-park-thought" className="sr-only">
          Parkeer een gedachte
        </label>
        <div className="flex items-center gap-2.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <SparklesIcon className="h-[15px] w-[15px] shrink-0 text-[#94A3B8]" aria-hidden />
          <input
            id="todo-park-thought"
            name="park-thought"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Parkeer een gedachte…"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-[var(--structuro-text)] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0"
            autoComplete="off"
            enterKeyHint="done"
          />
        </div>
      </form>
    </div>
  );
}
