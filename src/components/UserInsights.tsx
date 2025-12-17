import React, { useState, useEffect } from 'react';

interface UserInsightsProps {
  tasks: any[];
}

interface DailyStats {
  date: string;
  tasksStarted: number;
  tasksCompleted: number;
  totalFocusTime: number;
  averageSessionLength: number;
  mostProductiveHour: string;
  energyLevels: { low: number; medium: number; high: number };
}

interface WeeklyInsights {
  totalTasks: number;
  completionRate: number;
  averageDailyFocus: number;
  bestDay: string;
  improvement: string;
}

export default function UserInsights({ tasks }: UserInsightsProps) {
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [weeklyInsights, setWeeklyInsights] = useState<WeeklyInsights | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    if (tasks.length > 0) {
      calculateInsights();
    }
  }, [tasks]);

  const calculateInsights = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => {
      if (task.completedAt) {
        return task.completedAt.startsWith(today);
      }
      return false;
    });

    // Dagelijkse statistieken
    const stats: DailyStats = {
      date: today,
      tasksStarted: todayTasks.length,
      tasksCompleted: todayTasks.length,
      totalFocusTime: todayTasks.reduce((sum, task) => sum + (task.duration || 15), 0),
      averageSessionLength: todayTasks.length > 0 ? 
        Math.round(todayTasks.reduce((sum, task) => sum + (task.duration || 15), 0) / todayTasks.length) : 0,
      mostProductiveHour: getMostProductiveHour(todayTasks),
      energyLevels: {
        low: todayTasks.filter(t => t.energyLevel === 'low').length,
        medium: todayTasks.filter(t => t.energyLevel === 'medium').length,
        high: todayTasks.filter(t => t.energyLevel === 'high').length
      }
    };

    setDailyStats(stats);

    // Weekoverzicht
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekTasks = tasks.filter(task => 
      task.completedAt && new Date(task.completedAt) > weekAgo
    );

    const insights: WeeklyInsights = {
      totalTasks: weekTasks.length,
      completionRate: weekTasks.length > 0 ? Math.round((weekTasks.filter(t => t.done).length / weekTasks.length) * 100) : 0,
      averageDailyFocus: weekTasks.length > 0 ? Math.round(weekTasks.reduce((sum, t) => sum + (t.duration || 15), 0) / 7) : 0,
      bestDay: getBestDay(weekTasks),
      improvement: getImprovementSuggestion(weekTasks)
    };

    setWeeklyInsights(insights);
  };

  const getMostProductiveHour = (tasks: any[]): string => {
    if (tasks.length === 0) return 'N/A';
    
    const hourCounts: { [key: number]: number } = {};
    tasks.forEach(task => {
      if (task.completedAt) {
        const hour = new Date(task.completedAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    const mostProductive = Object.entries(hourCounts).reduce((a, b) => 
      hourCounts[Number(a[0])] > hourCounts[Number(b[0])] ? a : b
    );

    return `${mostProductive[0]}:00`;
  };

  const getBestDay = (tasks: any[]): string => {
    if (tasks.length === 0) return 'N/A';
    
    const dayCounts: { [key: string]: number } = {};
    tasks.forEach(task => {
      if (task.completedAt) {
        const day = new Date(task.completedAt).toLocaleDateString('nl-NL', { weekday: 'long' });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });

    const bestDay = Object.entries(dayCounts).reduce((a, b) => 
      dayCounts[a[0]] > dayCounts[b[0]] ? a : b
    );

    return bestDay[0];
  };

  const getImprovementSuggestion = (tasks: any[]): string => {
    if (tasks.length === 0) return 'Begin met je eerste taak!';
    
    const avgDuration = tasks.reduce((sum, t) => sum + (t.duration || 15), 0) / tasks.length;
    const completionRate = tasks.filter(t => t.done).length / tasks.length;
    
    if (avgDuration > 45) {
      return 'Probeer taken op te delen in kleinere stukken';
    } else if (completionRate < 0.5) {
      return 'Focus op minder taken, maar maak ze af';
    } else if (tasks.length < 3) {
      return 'Je bent consistent! Probeer wat meer uitdaging';
    } else {
      return 'Je bent op de goede weg!';
    }
  };

  // Contextuele tips - Variatie tussen compliment, uitdaging en concrete suggestie
  const getContextualTip = (weekly: WeeklyInsights, daily: DailyStats): string => {
    const tips = [
      // Complimenten
      `Je voltooiingsgraad van ${weekly.completionRate}% is geweldig! 🎉`,
      `Je bent consistent bezig - dat is de sleutel tot succes! 💪`,
      `Fantastisch werk vandaag! Je hebt al ${daily.tasksCompleted} taken voltooid! ⚡`,
      
      // Uitdagingen
      `Je kunt het! Probeer morgen 2 taken in plaats van 1 🚀`,
      `Uit je comfort zone! Plan je focusblok eerder op de dag 📅`,
      `Streef naar een hogere voltooiingsgraad - je bent er bijna! 🎯`,
      
      // Concrete suggesties
      `Probeer morgen een 25-min focus sessie voor diepe concentratie 🔥`,
      `Plan je moeilijkste taak in je productiefste uur (${daily.mostProductiveHour}) ⏰`,
      `Deel grote taken op in 15-min blokken voor betere focus 📋`
    ];
    
    // Kies een tip gebaseerd op prestaties
    if (weekly.completionRate >= 90) {
      return tips[0]; // Compliment
    } else if (weekly.completionRate >= 70) {
      return tips[1]; // Compliment
    } else if (daily.tasksCompleted >= 3) {
      return tips[2]; // Compliment
    } else if (weekly.completionRate < 50) {
      return tips[4]; // Uitdaging
    } else if (daily.tasksCompleted === 0) {
      return tips[7]; // Concrete suggestie
    } else {
      // Random tip voor variatie
      const randomIndex = Math.floor(Math.random() * tips.length);
      return tips[randomIndex];
    }
  };

  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'low': return '#10B981'; // groen
      case 'medium': return '#F59E0B'; // oranje
      case 'high': return '#EF4444'; // rood
      default: return '#6B7280'; // grijs
    }
  };

  const getEnergyLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Laag';
      case 'medium': return 'Medium';
      case 'high': return 'Hoog';
      default: return 'Onbekend';
    }
  };

  if (!dailyStats || !weeklyInsights) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Toggle Button */}
      <button
        onClick={() => setShowInsights(!showInsights)}
        className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-left hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-blue-800">📊 Jouw Inzichten</div>
            <div className="text-sm text-blue-600">Klik om te bekijken</div>
          </div>
          <div className={`transform transition-transform duration-200 ${showInsights ? 'rotate-180' : ''}`}>
            ▼
          </div>
        </div>
      </button>

      {showInsights && (
        <div className="space-y-4">
          {/* Jouw Progressie - Gebundeld & Visueel Speels */}
          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-6 border border-indigo-200 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-indigo-800">🚀 Jouw Progressie</h3>
              <div className="flex gap-2">
                {/* Kleine badges/sterren */}
                {dailyStats.tasksCompleted >= 3 && (
                  <span className="text-lg">🏆</span>
                )}
                {dailyStats.totalFocusTime >= 60 && (
                  <span className="text-lg">⚡</span>
                )}
                {weeklyInsights.completionRate >= 80 && (
                  <span className="text-lg">💎</span>
                )}
              </div>
            </div>

            {/* Vandaag - Visueel Speels */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                📅 Vandaag
                {dailyStats.tasksCompleted > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    {dailyStats.tasksCompleted} voltooid
                  </span>
                )}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-200 transition-colors">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{dailyStats.tasksCompleted}</div>
                  <div className="text-sm text-gray-600">Taken voltooid</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-200 transition-colors">
                  <div className="text-2xl font-bold text-green-600 mb-1">{dailyStats.totalFocusTime}</div>
                  <div className="text-sm text-gray-600">Minuten gefocust</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-200 transition-colors">
                  <div className="text-2xl font-bold text-purple-600 mb-1">{dailyStats.averageSessionLength}</div>
                  <div className="text-sm text-gray-600">Gem. sessie</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-200 transition-colors">
                  <div className="text-2xl font-bold text-orange-600 mb-1">{dailyStats.mostProductiveHour}</div>
                  <div className="text-sm text-gray-600">Productiefste uur</div>
                </div>
              </div>
              
              {/* Energie-niveaus - Visueel Verbeterd */}
              <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-100">
                <div className="text-sm font-medium text-indigo-700 mb-3 flex items-center gap-2">
                  ⚡ Energie-verdeling
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    {Object.values(dailyStats.energyLevels).reduce((a, b) => a + b, 0)} taken
                  </span>
                </div>
                <div className="flex gap-3">
                  {Object.entries(dailyStats.energyLevels).map(([level, count]) => (
                    <div key={level} className="flex-1 text-center">
                      <div className="relative">
                        <div 
                          className="h-3 rounded-full mb-2 transition-all duration-300 hover:scale-105"
                          style={{ backgroundColor: getEnergyColor(level) }}
                        ></div>
                        {count > 0 && (
                          <div className="absolute -top-1 -right-1 bg-white border border-gray-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-700">
                            {count}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">{getEnergyLabel(level)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Deze Week - Visueel Verbeterd */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                📈 Deze Week
                {weeklyInsights.completionRate >= 80 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Top performer!
                  </span>
                )}
              </h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-white rounded-lg border border-indigo-100">
                  <div className="text-center">
                    <div className="text-lg font-bold text-indigo-600">{weeklyInsights.totalTasks}</div>
                    <div className="text-xs text-gray-600">Totaal taken</div>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-indigo-100">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{weeklyInsights.completionRate}%</div>
                    <div className="text-xs text-gray-600">Voltooiingsgraad</div>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-indigo-100">
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{weeklyInsights.averageDailyFocus}</div>
                    <div className="text-xs text-gray-600">Min/dag focus</div>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-indigo-100">
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{weeklyInsights.bestDay}</div>
                    <div className="text-xs text-gray-600">Beste dag</div>
                  </div>
                </div>
              </div>
              
              {/* Verbetering suggestie - Verbeterd */}
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                <div className="text-sm font-medium text-amber-800 mb-1">💡 Persoonlijke Tip:</div>
                <div className="text-sm text-amber-700">{getContextualTip(weeklyInsights, dailyStats)}</div>
              </div>
            </div>
          </div>

          {/* Persoonlijke inzichten */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 Persoonlijke Inzichten</h3>
            <div className="space-y-2 text-sm text-blue-700">
              {dailyStats.mostProductiveHour !== 'N/A' && (
                <div>• Je bent het meest productief rond {dailyStats.mostProductiveHour}</div>
              )}
              {dailyStats.tasksCompleted > 0 && (
                <div>• Je hebt vandaag al {dailyStats.tasksCompleted} taken voltooid!</div>
              )}
              {weeklyInsights.completionRate > 70 && (
                <div>• Je voltooiingsgraad van {weeklyInsights.completionRate}% is geweldig!</div>
              )}
              {weeklyInsights.averageDailyFocus > 60 && (
                <div>• Je focust gemiddeld {weeklyInsights.averageDailyFocus} minuten per dag</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
