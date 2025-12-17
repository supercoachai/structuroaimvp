"use client";

import { useState, useEffect, useMemo } from 'react';
import { PlusIcon, CheckCircleIcon, ClockIcon, TrophyIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useTasks, Task } from '../hooks/useTasks';
import { designSystem } from '../lib/design-system';
import { getTodayCheckIn, hasCheckedInToday } from '../lib/localStorageTasks';
import { resetAndLoadMockData, clearAllTasksOnly } from '../lib/resetStorage';

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
  const [userName, setUserName] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [newName, setNewName] = useState('');
  const [previousCompleted, setPreviousCompleted] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const { updateTask } = useTasks();

  // Helper: Bereken complexiteit van een taak (1-5, lager = makkelijker)
  const getTaskComplexity = (task: Task): number => {
    let complexity = 2; // default medium
    if (task.energyLevel === 'low') complexity = 1;
    else if (task.energyLevel === 'high') complexity = 4;
    else if (task.energyLevel === 'medium') complexity = 2;
    
    if (task.duration) {
      if (task.duration <= 15) complexity = Math.max(1, complexity - 1);
      else if (task.duration > 60) complexity = Math.min(5, complexity + 1);
      else if (task.duration > 90) complexity = 5;
    }
    return Math.max(1, Math.min(5, complexity));
  };

  // Helper: Vind laagste-energie taak (laagste complexiteit, kortste duur)
  const findLowestEnergyTask = useMemo(() => {
    const realTasks = tasks.filter(task => 
      task.source !== 'medication' && 
      !task.done && 
      !task.started
    );
    
    if (realTasks.length === 0) return null;
    
    // Sorteer: eerst op complexiteit (laagste eerst), dan op duur (kortste eerst)
    const sorted = [...realTasks].sort((a, b) => {
      const complexityA = getTaskComplexity(a);
      const complexityB = getTaskComplexity(b);
      
      if (complexityA !== complexityB) {
        return complexityA - complexityB; // Laagste complexiteit eerst
      }
      
      // Als complexiteit gelijk is, sorteer op duur (kortste eerst)
      const durationA = a.duration || a.estimatedDuration || 999;
      const durationB = b.duration || b.estimatedDuration || 999;
      return durationA - durationB;
    });
    
    return sorted[0];
  }, [tasks]);

  // Check of laagste-energie-pad actief moet zijn
  const shouldShowLowestEnergyPath = useMemo(() => {
    if (!hasCheckedInToday()) return true; // Geen check-in = altijd laagste-energie-pad
    const checkIn = getTodayCheckIn();
    return checkIn?.energy_level === 'low'; // Of energie is 'low'
  }, []);

  // Helper functie - moet voor useEffect worden gedefinieerd
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

  // Bereken dashboard data
  useEffect(() => {
    if (loading) return;

    const calculateDashboardData = () => {
      try {
        const today = new Date().toDateString();
        
        // Telt taken als succes: done OF started
        const completedToday = tasks.filter(task => {
          const isDone = task.done && task.completedAt && 
            new Date(task.completedAt).toDateString() === today;
          const isStarted = task.started && !task.done; // Gestart maar nog niet af
          return isDone || isStarted;
        }).length;

        // Filter medicatie uit taken (medicatie telt niet als echte taak)
        const realTasks = tasks.filter(task => task.source !== 'medication');
        
        const pendingTasks = realTasks.filter(task => !task.done).length;
        const top3Tasks = realTasks.filter(task => task.priority && task.priority <= 3 && !task.done).length;
        
        // Bereken streak (alleen echte taken)
        const completedTasks = realTasks.filter(task => task.done && task.completedAt);
        const streak = calculateStreak(completedTasks);
        
        // Bereken aankomende deadlines (alleen echte taken)
        const upcomingDeadlines = realTasks.filter(task => 
          !task.done && task.dueAt && 
          new Date(task.dueAt) > new Date() &&
          new Date(task.dueAt) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        ).length;

        // Recente taken (laatste 3 voltooid)
        const recentCompleted = tasks
          .filter(task => task.done && task.completedAt)
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
          .slice(0, 3);

        // Micro-animatie trigger bij voltooiing
        if (completedToday > previousCompleted && previousCompleted > 0) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 2000);
        }
        setPreviousCompleted(completedToday);

        setDashboardData({
          totalTasks: realTasks.length,
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

  const getProgressPercentage = () => {
    return Math.min((dashboardData.completedToday / dashboardData.todayGoal) * 100, 100);
  };

  // Haal gebruikersnaam op bij mount (uit localStorage)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('structuro_user_name');
      if (storedName) {
        setUserName(storedName.split(' ')[0]);
        setShowNamePrompt(false);
      } else {
        setShowNamePrompt(true);
      }
    }
  }, []);

  const handleSaveName = () => {
    if (!newName.trim()) return;
    
    try {
      // Sla naam op in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('structuro_user_name', newName.trim());
        setUserName(newName.trim().split(' ')[0]);
        setShowNamePrompt(false);
        setNewName('');
      }
    } catch (error: any) {
      console.error('Unexpected error saving name:', error);
      alert(`Onverwachte fout: ${error?.message || 'Onbekende fout'}`);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Goedemorgen";
    if (hour < 18) return "Goedemiddag";
    return "Goedenavond";
  };

  // 15 afwisselende welkomstzinnen (zonder emoji's in de tekst zelf)
  const welcomeMessages = [
    "Fijn dat je er bent — klaar om rustig aan de dag te beginnen?",
    "Welkom terug — kleine stappen brengen grote rust.",
    "Mooi dat je er weer bent — vandaag telt elk moment.",
    "Tijd om structuur te brengen in de chaos.",
    "Goed dat je inlogt — vandaag doen we het stap voor stap.",
    "Rustig hoofd, helder plan — laten we beginnen.",
    "Vandaag is een nieuwe kans om het overzicht te pakken.",
    "Je doet het goed — vandaag is weer een stap vooruit.",
    "Klaar om wat meer structuur te vinden?",
    "Goed bezig dat je weer start — dat is al een overwinning.",
    "Samen maken we er een georganiseerde dag van.",
    "Even op adem komen, dan gefocust verder.",
    "Elke dag telt — ook de kleine stappen vandaag.",
    "Jij bepaalt het tempo, Structuro helpt je op koers.",
    "Rust. Ritme. Structuur. Vandaag begint weer rustig."
  ];

  const getWelcomeMessage = () => {
    // Gebruik de dag van het jaar als seed voor consistente dagelijkse welkomstzin
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    return welcomeMessages[dayOfYear % welcomeMessages.length];
  };

  // 50 ADHD-gerelateerde motivatie quotes
  const adhdQuotes = [
    "Rustige stappen, helder hoofd.",
    "Eén ding tegelijk is genoeg.",
    "Perfectie is niet het doel, vooruitgang wel.",
    "Kleine stappen zijn ook stappen.",
    "Focus op wat je nu doet, niet op wat nog moet.",
    "Je bent niet te laat, je bent precies op tijd.",
    "Vandaag is een nieuwe kans.",
    "Elke taak begint met één stap.",
    "Rust is ook productiviteit.",
    "Je doet het goed, precies zoals je bent.",
    "Kleine overwinningen tellen mee.",
    "Het is oké om het rustig aan te doen.",
    "Focus op je eigen tempo.",
    "Elke dag is een nieuw begin.",
    "Je bent genoeg, precies zoals je bent.",
    "Kleine stappen leiden tot grote doelen.",
    "Het is oké om pauze te nemen.",
    "Vandaag focus je op wat belangrijk is.",
    "Rust en structuur gaan hand in hand.",
    "Je bent op de goede weg.",
    "Eén taak afmaken is een overwinning.",
    "Kalmte is kracht.",
    "Je doet het in jouw eigen tempo.",
    "Kleine stappen, grote impact.",
    "Focus op het nu, niet op morgen.",
    "Rust is onderdeel van productiviteit.",
    "Je bent precies waar je moet zijn.",
    "Elke stap telt, hoe klein ook.",
    "Kalmte helpt je helder te denken.",
    "Je bent niet alleen in deze reis.",
    "Kleine stappen zijn de weg naar succes.",
    "Het is oké om hulp te vragen.",
    "Vandaag doe je wat je kunt.",
    "Rust en focus zijn je vrienden.",
    "Je bent sterker dan je denkt.",
    "Kleine stappen, grote vooruitgang.",
    "Focus op wat je nu kunt doen.",
    "Het is oké om het anders te doen.",
    "Rustige stappen leiden tot resultaten.",
    "Je bent waardevol, precies zoals je bent.",
    "Eén ding tegelijk is de sleutel.",
    "Kalmte helpt je betere keuzes te maken.",
    "Je doet het op jouw manier, en dat is goed.",
    "Kleine stappen, heldere doelen.",
    "Rust is een vorm van zelfzorg.",
    "Focus op vooruitgang, niet op perfectie.",
    "Je bent op je eigen pad, en dat is mooi.",
    "Kleine stappen, grote rust.",
    "Het is oké om het rustig aan te doen.",
    "Vandaag focus je op wat echt belangrijk is."
  ];

  const getDailyQuote = () => {
    // Gebruik de dag van het jaar als seed voor consistente dagelijkse quotes
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    return adhdQuotes[dayOfYear % adhdQuotes.length];
  };

  // DEBUG: Reset functie (alleen in development)
  const handleReset = () => {
    if (confirm('Weet je zeker dat je alle data wilt wissen? Dit kan niet ongedaan worden gemaakt.')) {
      resetAndLoadMockData();
    }
  };

  // Verwijder ALLEEN taken (schone start)
  const handleClearAllTasks = () => {
    if (confirm('Weet je zeker dat je ALLE taken wilt verwijderen? Dit kan niet ongedaan worden gemaakt. Je kunt daarna zelf handmatig taken toevoegen.')) {
      clearAllTasksOnly();
    }
  };

  return (
    <>
      {/* DEBUG: Reset knoppen (alleen in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          <button
            onClick={handleClearAllTasks}
            style={{
              padding: '8px 16px',
              background: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            🗑️ Verwijder ALLE taken
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              background: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
            title="Reset alle data (development only)"
          >
            🔄 Reset Data
          </button>
        </div>
      )}
    <div
      style={{
        minHeight: "100vh",
        background: designSystem.colors.background,
        color: designSystem.colors.text,
        padding: "24px 16px 64px",
      }}
    >
      <div style={designSystem.container}>
        {/* Header - Alleen warme welkomsttekst */}
        <header style={{ marginBottom: 24 }}>
          <div style={{ 
            fontSize: '30px', 
            fontWeight: 700, 
            color: '#111827',
            marginBottom: 8,
            lineHeight: 1.2
          }}>
            {getGreeting()}{userName ? `, ${userName}` : ''} 👋
          </div>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 400, 
            color: '#6B7280', 
            lineHeight: 1.5
          }}>
            {getWelcomeMessage()}
          </div>
        </header>

        {/* Naam prompt modal */}
        {showNamePrompt && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 32,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                Welkom bij Structuro! 👋
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(47,52,65,0.75)', marginBottom: 20 }}>
                Hoe wil je dat we je aanspreken?
              </p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                }}
                placeholder="Je voornaam..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #E6E8EE',
                  fontSize: 16,
                  marginBottom: 16,
                  outline: 'none'
                }}
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={!newName.trim()}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: newName.trim() ? '#4A90E2' : '#E6E8EE',
                  color: newName.trim() ? 'white' : 'rgba(47,52,65,0.5)',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: newName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Opslaan
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats Grid - "Vandaag voltooid" subtiel gehighlight, andere grijzer */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: 0
        }}
        className="dashboard-stats-grid"
        >
          {/* Totaal Taken - Consistent */}
          <div 
            style={{
              ...designSystem.statCard,
              background: '#F9FAFB',
              border: '1px solid #E7E9EB',
              borderRadius: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #BFD9FF';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
            tabIndex={0}
          >
            <div style={{ ...designSystem.typography.statValue, color: '#111827', marginBottom: 6 }}>
              {dashboardData.totalTasks}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, marginTop: 6 }}>
              Totaal taken
            </div>
          </div>

          {/* Vandaag Voltooid - Subtiel gehighlight */}
          <div 
            style={{
              ...designSystem.statCard,
              background: '#F0FAF4',
              border: '1px solid #CBEAD7',
              borderRadius: 13,
              boxShadow: showCelebration ? '0 8px 24px rgba(16, 185, 129, 0.2)' : '0 1px 2px rgba(0,0,0,0.04)',
              position: 'relative',
              transform: showCelebration ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!showCelebration) {
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showCelebration) {
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #BFD9FF';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
            tabIndex={0}
          >
            {showCelebration && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 32,
                animation: 'confetti 2s ease-out',
                pointerEvents: 'none',
                zIndex: 10
              }}>
                🎉
              </div>
            )}
            <div style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              background: '#10B981',
              borderRadius: '50%',
              opacity: 0.8
            }} />
            <div style={{ 
              ...designSystem.typography.statValue, 
              color: '#111827', 
              marginBottom: 6,
              animation: showCelebration ? 'pulse 0.6s ease-out' : 'none'
            }}>
              {dashboardData.completedToday}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, marginTop: 6 }}>
              Vandaag voltooid
            </div>
          </div>

          {/* Wachtende Taken - Consistent */}
          <div 
            style={{
              ...designSystem.statCard,
              background: '#F9FAFB',
              border: '1px solid #E7E9EB',
              borderRadius: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #BFD9FF';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
            tabIndex={0}
          >
            <div style={{ ...designSystem.typography.statValue, color: '#111827', marginBottom: 6 }}>
              {dashboardData.pendingTasks}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, marginTop: 6 }}>
              Openstaand
            </div>
          </div>

          {/* Top 3 Prioriteiten - Consistent */}
          <div 
            style={{
              ...designSystem.statCard,
              background: '#F9FAFB',
              border: '1px solid #E7E9EB',
              borderRadius: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #BFD9FF';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
            tabIndex={0}
          >
            <div style={{ ...designSystem.typography.statValue, color: '#111827', marginBottom: 6 }}>
              {dashboardData.top3Tasks}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, marginTop: 6 }}>
              Top 3 prioriteiten
            </div>
          </div>
        </section>

        {/* Scheidingslijn - Spacing 24/24/32px */}
        <div style={{
          height: 1,
          background: '#EEF0F2',
          marginTop: 32,
          marginBottom: 16
        }} />

        {/* Dagelijkse voortgang - Meer ruimte boven */}
        <section style={{ ...designSystem.section, marginTop: 48 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: designSystem.spacing.md }}>
            <div style={designSystem.typography.h3}>Dagelijkse voortgang</div>
            <div style={{ ...designSystem.typography.body, color: designSystem.colors.primary, fontWeight: 600 }}>
              {dashboardData.completedToday} / {dashboardData.todayGoal}
            </div>
          </div>
          
          {/* Progress Bar - Zachte kleuren */}
          <div style={{ 
            background: '#EFF3F6', 
            borderRadius: 8, 
            height: 12, 
            marginBottom: designSystem.spacing.sm,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div 
              style={{ 
                background: 'rgba(59, 130, 246, 0.9)', 
                borderRadius: 8, 
                height: "100%", 
                width: `${getProgressPercentage()}%`,
                transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
              className="progress-bar-fill"
            />
          </div>
          
          <div style={{ 
            fontSize: '12px', 
            color: '#64748B',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              {getProgressPercentage() >= 100 ? "Dagelijkse doelen behaald!" : `${Math.round(getProgressPercentage())}% van je dagelijkse doelen`}
            </span>
            <span style={{ fontWeight: 500 }}>
              {dashboardData.completedToday} / {dashboardData.todayGoal}
            </span>
          </div>
        </section>

        {/* Laagste-energie-pad: Toon 1 taak als geen check-in of energie='low' */}
        {shouldShowLowestEnergyPath && findLowestEnergyTask && (
          <section style={designSystem.section}>
            <div style={{
              background: 'linear-gradient(135deg, #F0FDF4 0%, #E8F5E9 100%)',
              border: '2px solid #86EFAC',
              borderRadius: 16,
              padding: 24,
              position: 'relative',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
            }}>
              <div style={{ 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#059669',
                marginBottom: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Begin hier
              </div>
              <div style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                color: '#111827',
                marginBottom: 8
              }}>
                {findLowestEnergyTask.title}
              </div>
              <div style={{ 
                fontSize: 13, 
                color: '#6B7280',
                marginBottom: 16
              }}>
                {findLowestEnergyTask.duration || findLowestEnergyTask.estimatedDuration || 15} minuten • 
                {getTaskComplexity(findLowestEnergyTask) <= 2 ? ' Laag' : ' Normaal'} complexiteit
              </div>
              <button
                onClick={async () => {
                  // Markeer als gestart
                  await updateTask(findLowestEnergyTask.id, { started: true });
                  // Navigeer naar focus modus met deze taak
                  router.push(`/focus?task=${findLowestEnergyTask.id}`);
                }}
                style={{
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#059669';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#10B981';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                }}
              >
                Begin hier ({findLowestEnergyTask.duration || findLowestEnergyTask.estimatedDuration || 15} min)
              </button>
            </div>
          </section>
        )}

        {/* Verzachte motivatie sectie (geen harde streaks) */}
        {dashboardData.completedToday > 0 && (
          <section style={designSystem.section}>
            <div style={{ 
              textAlign: "center", 
              padding: designSystem.spacing.md, 
              background: "#EAF4FE", 
              borderRadius: 12,
              border: '1px solid #DCE8F9'
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>🎯</div>
              <div style={{ ...designSystem.typography.body, fontWeight: 600, color: "#1E40AF" }}>
                Je bent weer gestart
              </div>
              <div style={{ ...designSystem.typography.bodySmall, color: "#1E3A8A", marginTop: 4 }}>
                Elke stap telt vandaag
              </div>
            </div>
          </section>
        )}

        {/* Snelle acties - 3 kolommen grid */}
        <section style={designSystem.section}>
          <div style={{ ...designSystem.typography.h3, marginBottom: designSystem.spacing.md }}>Snelle acties</div>
          <div style={designSystem.grid.quickActions} className="dashboard-actions-grid">
            <button
              onClick={() => router.push('/todo')}
              style={{
                ...designSystem.quickActionButton,
                background: "#F0F9FF",
                borderColor: "#BAE6FD",
                color: "#0EA5E9",
                minHeight: '100px',
                height: '100px'
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
              <PlusIcon style={{ width: designSystem.icon.medium, height: designSystem.icon.medium, marginBottom: 8 }} />
              <div style={{ ...designSystem.typography.bodySmall, fontWeight: 600 }}>Taak toevoegen</div>
            </button>

            <button
              onClick={() => router.push('/focus')}
              style={{
                ...designSystem.quickActionButton,
                background: "#FEF2F2",
                borderColor: "#FECACA",
                color: designSystem.colors.danger,
                minHeight: '100px',
                height: '100px'
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
              <ClockIcon style={{ width: designSystem.icon.medium, height: designSystem.icon.medium, marginBottom: 8 }} />
              <div style={{ ...designSystem.typography.bodySmall, fontWeight: 600 }}>Focus modus</div>
            </button>

            <button
              onClick={() => router.push('/agenda')}
              style={{
                ...designSystem.quickActionButton,
                background: "#F0FDF4",
                borderColor: "#BBF7D0",
                color: designSystem.colors.success,
                minHeight: '100px',
                height: '100px'
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
              <CalendarIcon style={{ width: designSystem.icon.medium, height: designSystem.icon.medium, marginBottom: 8 }} />
              <div style={{ ...designSystem.typography.bodySmall, fontWeight: 600 }}>Agenda</div>
            </button>

            <button
              onClick={() => router.push('/gamification')}
              style={{
                ...designSystem.quickActionButton,
                background: "#FEF3C7",
                borderColor: "#FDE68A",
                color: designSystem.colors.warning,
                minHeight: '100px',
                height: '100px'
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
              <TrophyIcon style={{ width: designSystem.icon.medium, height: designSystem.icon.medium, marginBottom: 8 }} />
              <div style={{ ...designSystem.typography.bodySmall, fontWeight: 600 }}>Prestaties</div>
            </button>

            <button
              onClick={() => router.push('/dagstart')}
              style={{
                ...designSystem.quickActionButton,
                background: "#F0FDF4",
                borderColor: "#BBF7D0",
                color: designSystem.colors.success,
                minHeight: '100px',
                height: '100px'
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
              <div style={{ fontSize: 24, marginBottom: 8, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24 }}>🌅</div>
              <div style={{ ...designSystem.typography.bodySmall, fontWeight: 600 }}>Dagstart</div>
            </button>

            <button
              onClick={() => router.push('/shutdown')}
              style={{
                ...designSystem.quickActionButton,
                background: "#F3E8FF",
                borderColor: "#DDD6FE",
                color: "#8B5CF6",
                minHeight: '100px',
                height: '100px'
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
              <div style={{ fontSize: 24, marginBottom: 8, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24 }}>🌙</div>
              <div style={{ ...designSystem.typography.bodySmall, fontWeight: 600 }}>Shutdown</div>
            </button>
          </div>
        </section>

        {/* Recent voltooid */}
        {recentTasks.length > 0 && (
          <section style={designSystem.section}>
            <div style={{ ...designSystem.typography.h3, marginBottom: designSystem.spacing.md }}>Recent voltooid</div>
            <div style={{ display: "grid", gap: designSystem.spacing.sm }}>
              {recentTasks.map((task) => (
                <div 
                  key={task.id} 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: designSystem.spacing.sm, 
                    padding: `${designSystem.spacing.sm} ${designSystem.spacing.md}`, 
                    background: "#F8FAFC", 
                    borderRadius: 8 
                  }}
                >
                  <CheckCircleIcon style={{ width: designSystem.icon.small, height: designSystem.icon.small, color: designSystem.colors.success, flexShrink: 0 }} />
                  <div style={{ flex: 1, ...designSystem.typography.body }}>{task.title}</div>
                  <div style={designSystem.typography.bodySmall}>
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
          </section>
        )}

        {/* Lege staat: altijd concrete suggestie tonen */}
        {tasks.filter(t => t.source !== 'medication' && !t.done && !t.started).length === 0 && (
          <section style={designSystem.section}>
            <div style={{
              background: '#F0F9FF',
              border: '2px solid #BAE6FD',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>✨</div>
              <div style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                color: '#111827',
                marginBottom: 8
              }}>
                Doe dit nu. Klein is genoeg.
              </div>
              <div style={{ 
                fontSize: 14, 
                color: '#6B7280',
                marginBottom: 20
              }}>
                Voeg een kleine taak toe om vandaag te beginnen
              </div>
              <button
                onClick={() => router.push('/todo')}
                style={{
                  background: '#4A90E2',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2563EB';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#4A90E2';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                + Voeg je eerste taak toe
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
    </>
  );
}
