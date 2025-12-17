"use client";

interface ProgressBarProps {
  plannedMin: number;
  capacityMin: number;
}

export default function ProgressBar({ plannedMin, capacityMin }: ProgressBarProps) {
  const percentage = Math.min((plannedMin / capacityMin) * 100, 100);
  const remaining = capacityMin - plannedMin;
  
  // Kleur bepalen op basis van percentage
  const getColor = (percent: number) => {
    if (percent < 60) return 'bg-green-500';
    if (percent < 80) return 'bg-yellow-500';
    if (percent < 100) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatus = (percent: number) => {
    if (percent < 60) return 'Rustig dagje';
    if (percent < 80) return 'Goed te doen';
    if (percent < 100) return 'Volle dag';
    return 'Overvol - pas op!';
  };

  const getStatusColor = (percent: number) => {
    if (percent < 60) return 'text-green-600';
    if (percent < 80) return 'text-yellow-600';
    if (percent < 100) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Dagbelasting</h3>
        <span className={`text-sm font-medium ${getStatusColor(percentage)}`}>
          {getStatus(percentage)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div 
          className={`h-4 rounded-full transition-all duration-1000 ${getColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-800">{plannedMin}</div>
          <div className="text-xs text-gray-600">Gepland (min)</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-800">{capacityMin}</div>
          <div className="text-xs text-gray-600">Capaciteit (min)</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className={`text-2xl font-bold ${remaining >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
            {remaining >= 0 ? remaining : Math.abs(remaining)}
          </div>
          <div className="text-xs text-gray-600">
            {remaining >= 0 ? 'Over (min)' : 'Over (min)'}
          </div>
        </div>
      </div>

      {/* Percentage indicator */}
      <div className="text-center">
        <span className="text-sm text-gray-600">
          {percentage.toFixed(0)}% van je dag gevuld
        </span>
      </div>
    </div>
  );
}
