"use client";

import { useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  duration: number;
  icon: string;
}

interface EnergyChipsProps {
  onStart: (task: Task) => void;
}

export default function EnergyChips({ onStart }: EnergyChipsProps) {
  const [selectedEnergy, setSelectedEnergy] = useState<string | null>(null);

  const energyLevels = [
    { emoji: "😴", label: "Laag", description: "Rustige taken" },
    { emoji: "🙂", label: "Medium", description: "Gewone taken" },
    { emoji: "⚡", label: "Hoog", description: "Uitdagende taken" }
  ];

  const taskSuggestions: Record<string, Task[]> = {
    "😴": [
      { id: "1", title: "Inbox opruimen", duration: 15, icon: "📧" },
      { id: "2", title: "Kamer opruimen", duration: 20, icon: "🧹" },
      { id: "3", title: "Planten water geven", duration: 10, icon: "🌱" }
    ],
    "🙂": [
      { id: "4", title: "Hond uitlaten", duration: 25, icon: "🐕" },
      { id: "5", title: "Was doen", duration: 30, icon: "👕" },
      { id: "6", title: "Boodschappen", duration: 45, icon: "🛒" }
    ],
    "⚡": [
      { id: "7", title: "Belangrijkste taak", duration: 45, icon: "🎯" },
      { id: "8", title: "Focus blok", duration: 60, icon: "🔥" },
      { id: "9", title: "Project werk", duration: 90, icon: "🚀" }
    ]
  };

  const handleEnergySelect = (energy: string) => {
    setSelectedEnergy(energy);
  };

  const handleTaskStart = (task: Task) => {
    onStart(task);
  };

  return (
    <div className="space-y-6">
      {/* Energie chips */}
      <div>
        <p className="text-sm text-[rgba(47,52,65,0.65)] mb-4 text-center">
          Kies je energie niveau:
        </p>
        <div className="flex gap-3 justify-center">
          {energyLevels.map((level) => (
            <button
              key={level.emoji}
              onClick={() => handleEnergySelect(level.emoji)}
              className={`p-3 rounded-lg border transition-all ${
                selectedEnergy === level.emoji
                  ? 'border-[#4A90E2] bg-[#4A90E2] text-white'
                  : 'border-[#E6E8EE] bg-white text-[#2F3441] hover:border-[#4A90E2]'
              }`}
            >
              <div className="text-2xl mb-1">{level.emoji}</div>
              <div className="text-xs font-medium">{level.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Taak voorstel - alleen na keuze */}
      {selectedEnergy && (
        <div className="bg-white border border-[#E6E8EE] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{taskSuggestions[selectedEnergy][0].icon}</span>
              <div>
                <h3 className="text-sm font-medium text-[#2F3441]">
                  {taskSuggestions[selectedEnergy][0].title}
                </h3>
                <p className="text-xs text-[rgba(47,52,65,0.65)]">
                  {taskSuggestions[selectedEnergy][0].duration} minuten
                </p>
              </div>
            </div>
            <button
              onClick={() => handleTaskStart(taskSuggestions[selectedEnergy][0])}
              className="bg-[#4A90E2] hover:bg-[#3A80D2] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
