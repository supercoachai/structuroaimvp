import TaskCard from './TaskCard';

interface Task {
  title: string;
  duration: number;
}

interface DayPlannerProps {
  tasks: Task[];
}

export default function DayPlanner({ tasks }: DayPlannerProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Vandaag</h2>
      <div className="space-y-3">
        {tasks.map((task, i) => (
          <TaskCard key={i} task={task} />
        ))}
      </div>
    </div>
  );
}
