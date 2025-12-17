import { useState } from 'react';

interface CheckInProps {
  onCheckIn: (mood: string) => void;
}

export default function CheckIn({ onCheckIn }: CheckInProps) {
  const [mood, setMood] = useState<string | null>(null);

  const submit = () => {
    if (mood) {
      onCheckIn(mood);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Hoe voel je je vandaag?</h3>
      <div className="flex gap-3 mb-4">
        {["😴", "🙂", "⚡"].map((emoji) => (
          <button 
            key={emoji} 
            onClick={() => setMood(emoji)}
            className={`text-3xl p-3 rounded-lg border-2 transition-all ${
              mood === emoji 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <button 
        onClick={submit}
        disabled={!mood}
        className={`px-6 py-2 rounded-md font-medium transition-colors ${
          mood 
            ? 'bg-green-500 hover:bg-green-600 text-white' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        Opslaan
      </button>
    </div>
  );
}
