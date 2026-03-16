"use client";

import React, { useState } from "react";

export interface TaskScheduleEditorTask {
  id: string;
  title: string;
  dueAt?: string | null;
  reminders?: number[];
  repeat?: string;
  duration?: number | null;
  estimatedDuration?: number | null;
  energyLevel?: string;
}

interface TaskScheduleEditorProps {
  task: TaskScheduleEditorTask;
  onSave: (task: TaskScheduleEditorTask) => void;
  onClose: () => void;
}

export default function TaskScheduleEditor({ task, onSave, onClose }: TaskScheduleEditorProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [duration, setDuration] = useState<number | null>(task?.duration ?? task?.estimatedDuration ?? null);
  const [energyLevel, setEnergyLevel] = useState<string>(task?.energyLevel ?? "medium");

  const handleSave = () => {
    onSave({
      ...task,
      title: title.trim() || task.title,
      reminders: [],
      repeat: "none",
      duration: duration || null,
      estimatedDuration: duration || null,
      energyLevel: energyLevel || "medium",
    });
    onClose();
  };

  return (
    <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg p-6 sm:p-8 border border-gray-200/80">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Taak bewerken</h2>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
        >
          Sluiten
        </button>
      </div>

      <div className="space-y-5">
        {/* Titel */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titel</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Naam van de taak"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
          />
        </div>

        {/* Duur */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Duur (minuten)</label>
          <input
            type="number"
            min={1}
            max={480}
            value={duration ?? ""}
            onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value, 10) : null)}
            placeholder="Bijv. 15, 30, 60"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Energie */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Energie</label>
          <div className="flex gap-2 flex-wrap">
            {(["low", "medium", "high"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setEnergyLevel(level)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  energyLevel === level
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {level === "low" ? "Laag" : level === "medium" ? "Gemiddeld" : "Hoog"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Acties */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors"
        >
          Opslaan
        </button>
        <button
          type="button"
          onClick={onClose}
          className="py-3 px-4 rounded-2xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}
