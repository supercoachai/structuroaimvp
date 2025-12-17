import { useState } from 'react';
import Reward from './Reward';

interface Task {
  title: string;
  duration: number;
}

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const [done, setDone] = useState(false);

  const handleDone = () => setDone(true);

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium text-gray-800">{task.title}</p>
          <p className="text-sm text-gray-600">{task.duration} minuten</p>
        </div>
        {!done ? (
          <button 
            onClick={handleDone}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            Start
          </button>
        ) : (
          <Reward />
        )}
      </div>
    </div>
  );
}
