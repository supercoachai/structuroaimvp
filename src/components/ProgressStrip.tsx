"use client";

interface ProgressStripProps {
  plannedMin: number;
  capacityMin: number;
}

export default function ProgressStrip({ plannedMin, capacityMin }: ProgressStripProps) {
  const percentage = Math.min((plannedMin / capacityMin) * 100, 100);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[rgba(47,52,65,0.65)]">Dagbelasting</span>
        <span className="text-sm text-[#2F3441] font-medium">
          {percentage.toFixed(0)}% van je dag gevuld
        </span>
      </div>
      
      {/* Smalle progress-strook */}
      <div className="w-full bg-[#E6E8EE] rounded-full h-2">
        <div 
          className="bg-[#4A90E2] h-2 rounded-full transition-all duration-1000"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
