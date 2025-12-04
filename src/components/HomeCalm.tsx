"use client";

import { useState, useEffect } from 'react';
import { PlusIcon, CheckCircleIcon, ClockIcon, TrophyIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useTasks } from '../hooks/useTasks';

interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: number | null;
  dueAt?: string;
  duration?: string;
  source?: string;
  completedAt?: string;
}

interface DashboardData {
  totalTasks: number;
  completedToday: number;
  pendingTasks: number;
  top3Tasks: number;
  currentStreak: number;
  todayGoal: number;
  upcomingDeadlines: number;
}

export default function HomeCalm() {
  const router = useRouter();
  const { tasks, loading } = useTasks();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalTasks: 0,
    completedToday: 0,
    pendingTasks: 0,
    top3Tasks: 0,
    currentStreak: 0,
    todayGoal: 3,
    upcomingDeadlines: 0
  });

  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

  // Bereken dashboard data
  useEffect(() => {
    if (loading) return;

    const calculateDashboardData = () => {
      try {
        const today = new Date().toDateString();
        
        const completedToday = tasks.filter(task => 
          task.done && task.completedAt && 
          new Date(task.completedAt).toDateString() === today
        ).length;

        const pendingTasks = tasks.filter(task => !task.done).length;
        const top3Tasks = tasks.filter(task => task.priority && task.priority <= 3 && !task.done).length;
        
        // Bereken streak
        const completedTasks = tasks.filter(task => task.done && task.completedAt);
        const streak = calculateStreak(completedTasks);
        
        // Bereken aankomende deadlines
        const upcomingDeadlines = tasks.filter(task => 
          !task.done && task.dueAt && 
          new Date(task.dueAt) > new Date() &&
          new Date(task.dueAt) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Volgende 7 dagen
        ).length;

        // Recente taken (laatste 3 voltooid)
        const recentCompleted = tasks
          .filter(task => task.done && task.completedAt)
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
          .slice(0, 3);

        setDashboardData({
          totalTasks: tasks.length,
          completedToday,
          pendingTasks,
          top3Tasks,
          currentStreak: streak.current,
          todayGoal: 3,
          upcomingDeadlines
        });

        setRecentTasks(recentCompleted);
      } catch (error) {
        console.error('Error calculating dashboard data:', error);
      }
    };

    calculateDashboardData();
  }, [tasks, loading]);

  const calculateStreak = (completedTasks: Task[]) => {
    if (completedTasks.length === 0) return { current: 0, longest: 0 };

    const sortedTasks = completedTasks
      .filter(task => task.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

    let currentStreak = 0;
    let tempStreak = 0;
    let lastDate: string | null = null;

    for (const task of sortedTasks) {
      const taskDate = new Date(task.completedAt!).toDateString();
      
      if (!lastDate) {
        tempStreak = 1;
        lastDate = taskDate;
      } else {
        const daysDiff = Math.floor((new Date(lastDate).getTime() - new Date(taskDate).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          tempStreak++;
        } else if (daysDiff === 0) {
          continue;
        } else {
          break;
        }
        lastDate = taskDate;
      }
    }

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    if (lastDate === today || lastDate === yesterday) {
      currentStreak = tempStreak;
    }

    return { current: currentStreak, longest: 0 };
  };

  const getProgressPercentage = () => {
    return Math.min((dashboardData.completedToday / dashboardData.todayGoal) * 100, 100);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Goedemorgen";
    if (hour < 18) return "Goedemiddag";
    return "Goedenavond";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F8FA",
        color: "#2F3441",
        display: "grid",
        justifyContent: "center",
        padding: "28px 16px 64px",
      }}
    >
      <main style={{ width: "min(720px, 92vw)", display: "grid", gap: 20 }}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>🏠 Dashboard</div>
          <div style={{ fontSize: 14, color: "rgba(47,52,65,0.75)", marginTop: 6 }}>
            {getGreeting()}, welkom terug bij Structuro
          </div>
          <div style={{ fontSize: 12, color: "rgba(47,52,65,0.6)", marginTop: 4 }}>
            Jouw hulpmiddel naar een gestructureerd leven
          </div>
        </header>

        {/* Quick Stats Grid */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          {/* Totaal Taken */}
          <div style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#4A90E2", marginBottom: 4 }}>
              {dashboardData.totalTasks}
            </div>
            <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
              Totaal taken
            </div>
          </div>

          {/* Vandaag Voltooid */}
          <div style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#10B981", marginBottom: 4 }}>
              {dashboardData.completedToday}
            </div>
            <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
              Vandaag voltooid
            </div>
          </div>

          {/* Wachtende Taken */}
          <div style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#F59E0B", marginBottom: 4 }}>
              {dashboardData.pendingTasks}
            </div>
            <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
              Wachtend
            </div>
          </div>

          {/* Top 3 Prioriteiten */}
          <div style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#EF4444", marginBottom: 4 }}>
              {dashboardData.top3Tasks}
            </div>
            <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
              Top 3 prioriteiten
            </div>
          </div>
        </section>

        {/* Main Dashboard Cards */}
        <section style={{ display: "grid", gap: 20 }}>
          {/* Dagelijkse Voortgang */}
          <div style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>📊 Dagelijkse Voortgang</div>
              <div style={{ fontSize: 14, color: "#4A90E2", fontWeight: 600 }}>
                {dashboardData.completedToday} / {dashboardData.todayGoal}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div style={{ background: "#E6E8EE", borderRadius: 8, height: 12, marginBottom: 12 }}>
              <div 
                style={{ 
                  background: "#4A90E2", 
                  borderRadius: 8, 
                  height: "100%", 
                  width: `${getProgressPercentage()}%`,
                  transition: "width 0.3s ease"
                }}
              />
            </div>
            
            <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
              {getProgressPercentage() >= 100 ? "🎉 Dagelijkse doelen behaald!" : `${Math.round(getProgressPercentage())}% van je dagelijkse doelen`}
            </div>
          </div>

          {/* Streak & Motivatie */}
          <div style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>🔥 Je Streak</div>
              <div style={{ fontSize: 14, color: "#EF4444", fontWeight: 600 }}>
                {dashboardData.currentStreak} dagen
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ textAlign: "center", padding: 16, background: "#FEF2F2", borderRadius: 8 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>🔥</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#EF4444" }}>
                  {dashboardData.currentStreak} dagen op rij
                </div>
                <div style={{ fontSize: 12, color: "#EF4444", opacity: 0.8 }}>
                  Houd je momentum vast!
                </div>
              </div>
              
              <div style={{ textAlign: "center", padding: 16, background: "#F0F9FF", borderRadius: 8 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>🎯</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0EA5E9" }}>
                  Dagelijks doel: {dashboardData.todayGoal}
                </div>
                <div style={{ fontSize: 12, color: "#0EA5E9", opacity: 0.8 }}>
                  Kleine stappen, grote resultaten
                </div>
              </div>
            </div>
          </div>

          {/* Snelle Acties */}
          <div style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>⚡ Snelle Acties</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <button
                onClick={() => router.push('/todo')}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "16px 12px",
                  background: "#F0F9FF",
                  border: "1px solid #BAE6FD",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#E0F2FE";
                  e.currentTarget.style.borderColor = "#7DD3FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#F0F9FF";
                  e.currentTarget.style.borderColor = "#BAE6FD";
                }}
              >
                <PlusIcon style={{ width: 24, height: 24, color: "#0EA5E9", marginBottom: 8 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0EA5E9" }}>Taak Toevoegen</div>
              </button>

              <button
                onClick={() => router.push('/focus')}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "16px 12px",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#FEE2E2";
                  e.currentTarget.style.borderColor = "#FCA5A5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#FEF2F2";
                  e.currentTarget.style.borderColor = "#FECACA";
                }}
              >
                <ClockIcon style={{ width: 24, height: 24, color: "#EF4444", marginBottom: 8 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: "#EF4444" }}>Focus Modus</div>
              </button>

              <button
                onClick={() => router.push('/agenda')}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "16px 12px",
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#DCFCE7";
                  e.currentTarget.style.borderColor = "#86EFAC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#F0FDF4";
                  e.currentTarget.style.borderColor = "#BBF7D0";
                }}
              >
                <CalendarIcon style={{ width: 24, height: 24, color: "#10B981", marginBottom: 8 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>Agenda</div>
              </button>

              <button
                onClick={() => router.push('/gamification')}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "16px 12px",
                  background: "#FEF3C7",
                  border: "1px solid #FDE68A",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#FDE68A";
                  e.currentTarget.style.borderColor = "#F59E0B";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#FEF3C7";
                  e.currentTarget.style.borderColor = "#FDE68A";
                }}
              >
                <TrophyIcon style={{ width: 24, height: 24, color: "#F59E0B", marginBottom: 8 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: "#F59E0B" }}>Prestaties</div>
              </button>

              <button
                onClick={() => router.push('/dagstart')}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "16px 12px",
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#DCFCE7";
                  e.currentTarget.style.borderColor = "#86EFAC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#F0FDF4";
                  e.currentTarget.style.borderColor = "#BBF7D0";
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>🌅</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>Dagstart</div>
              </button>

              <button
                onClick={() => router.push('/shutdown')}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "16px 12px",
                  background: "#F3E8FF",
                  border: "1px solid #DDD6FE",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#E9D5FF";
                  e.currentTarget.style.borderColor = "#C4B5FD";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#F3E8FF";
                  e.currentTarget.style.borderColor = "#DDD6FE";
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>🌙</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#8B5CF6" }}>Shutdown</div>
              </button>
            </div>
          </div>

          {/* Recente Prestaties */}
          {recentTasks.length > 0 && (
            <div style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>✅ Recent Voltooid</div>
              <div style={{ display: "grid", gap: 12 }}>
                {recentTasks.map((task) => (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#F8FAFC", borderRadius: 8 }}>
                    <CheckCircleIcon style={{ width: 20, height: 20, color: "#10B981", flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 14 }}>{task.title}</div>
                    <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                      {task.completedAt ? new Date(task.completedAt).toLocaleDateString('nl-NL', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aankomende Deadlines */}
          {dashboardData.upcomingDeadlines > 0 && (
            <div style={{ background: "white", border: "1px solid #E6E8EE", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>⏰ Aankomende Deadlines</div>
                <div style={{ fontSize: 14, color: "#F59E0B", fontWeight: 600 }}>
                  {dashboardData.upcomingDeadlines} deze week
                </div>
              </div>
              
              <div style={{ fontSize: 12, color: "rgba(47,52,65,0.75)" }}>
                Je hebt {dashboardData.upcomingDeadlines} taken met deadlines in de komende 7 dagen. 
                Plan ze goed in om stress te voorkomen!
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
