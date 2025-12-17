"use client";

import { useState } from 'react';
import { CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  duration: number;
  icon: string;
  energy: string;
}

interface EnergyStartPanelProps {
  onStart: (task: Task) => void;
}

export default function EnergyStartPanel({ onStart }: EnergyStartPanelProps) {
  const [selectedEnergy, setSelectedEnergy] = useState<string | null>(null);

  const energyLevels = [
    { emoji: "😴", label: "Laag", description: "Rustige taken" },
    { emoji: "🙂", label: "Medium", description: "Gewone taken" },
    { emoji: "⚡", label: "Hoog", description: "Uitdagende taken" }
  ];

  const taskSuggestions: Record<string, Task[]> = {
    "😴": [
      { id: "1", title: "Inbox opruimen", duration: 15, icon: "📧", energy: "😴" },
      { id: "2", title: "Kamer opruimen", duration: 20, icon: "🧹", energy: "😴" },
      { id: "3", title: "Planten water geven", duration: 10, icon: "🌱", energy: "😴" }
    ],
    "🙂": [
      { id: "4", title: "Hond uitlaten", duration: 25, icon: "🐕", energy: "🙂" },
      { id: "5", title: "Was doen", duration: 30, icon: "👕", energy: "🙂" },
      { id: "6", title: "Boodschappen", duration: 45, icon: "🛒", energy: "🙂" }
    ],
    "⚡": [
      { id: "7", title: "Belangrijkste taak", duration: 45, icon: "🎯", energy: "⚡" },
      { id: "8", title: "Focus blok", duration: 60, icon: "🔥", energy: "⚡" },
      { id: "9", title: "Project werk", duration: 90, icon: "🚀", energy: "⚡" }
    ]
  };

  const handleEnergySelect = (energy: string) => {
    setSelectedEnergy(energy);
  };

  const handleTaskStart = (task: Task) => {
    onStart(task);
  };

  const addQuickTask = () => {
    if (selectedEnergy) {
      const suggestions = taskSuggestions[selectedEnergy];
      const randomTask = suggestions[Math.floor(Math.random() * suggestions.length)];
      onStart(randomTask);
    }
  };

  return (
    <div className="space-y-6">
      {/* Energie Selectie */}
      <div>
        <p className="text-gray-600 mb-4 text-center">
          Kies je energie niveau om gepaste taken te zien:
        </p>
        <div className="flex gap-4 justify-center">
          {energyLevels.map((level) => (
            <button
              key={level.emoji}
              onClick={() => handleEnergySelect(level.emoji)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedEnergy === level.emoji
                  ? 'border-blue-500 bg-blue-50 scale-110'
                  : 'border-gray-200 hover:border-gray-300 hover:scale-105'
              }`}
            >
              <div className="text-4xl mb-2">{level.emoji}</div>
              <div className="text-sm font-medium text-gray-800">{level.label}</div>
              <div className="text-xs text-gray-600">{level.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Taak Suggesties */}
      {selectedEnergy && (
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Taken voor {energyLevels.find(l => l.emoji === selectedEnergy)?.label.toLowerCase()}e energie
            </h3>
            <button
              onClick={addQuickTask}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Willekeurige taak
            </button>
          </div>

          <div className="grid gap-3">
            {taskSuggestions[selectedEnergy].map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{task.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-800">{task.title}</h4>
                      <p className="text-sm text-gray-600">{task.duration} minuten</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTaskStart(task)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Start
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
