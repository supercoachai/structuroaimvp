"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

type DagstartEmptySelectionHintProps = {
  onAddQuickTask: (title: string) => void | Promise<void>;
  onDismiss: () => void;
  busy?: boolean;
};

/** Wegklikbare suggestie als dagstart zonder taakselectie wordt afgerond. */
export default function DagstartEmptySelectionHint({
  onAddQuickTask,
  onDismiss,
  busy = false,
}: DagstartEmptySelectionHintProps) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed || submitting || busy) return;
    setSubmitting(true);
    try {
      await onAddQuickTask(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="mx-auto mb-4 w-full max-w-md rounded-2xl border border-[#E8E4F0] bg-white/95 p-4 shadow-sm"
      role="region"
      aria-label="Suggestie voor een kleine taak"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[#2D2640]">
          Eén ding van 2 minuten?
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 text-[#8B8499] hover:bg-[#F5F3FA]"
          aria-label="Sluiten"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bijv. koffie zetten"
          className="min-w-0 flex-1 rounded-xl border border-[#E8E4F0] px-3 py-2 text-sm text-[#2D2640] outline-none focus:border-[#7C6BC4]"
          maxLength={120}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAdd();
          }}
        />
        <button
          type="button"
          disabled={!title.trim() || submitting || busy}
          onClick={() => void handleAdd()}
          className="shrink-0 rounded-xl bg-[#7C6BC4] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Toevoegen
        </button>
      </div>
    </div>
  );
}
