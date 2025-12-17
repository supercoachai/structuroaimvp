"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '../../components/layout/AppLayout';
import { track } from '../../shared/track';
import { toast } from '../../components/Toast';
import { useTasks } from '../../hooks/useTasks';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import GedachteParkerenModal from '../../components/GedachteParkerenModal';
import { getTodayCheckIn } from '../../lib/localStorageTasks';

// Energie kleuren helper
const getEnergyColor = (level: string) => {
  switch (level) {
    case 'low': return { bg: '#EAF9EE', border: '#10B981', text: '#065F46', label: 'Rustig' };
    case 'medium': return { bg: '#FFF4E6', border: '#F59E0B', text: '#92400E', label: 'Actief' };
    case 'high': return { bg: '#F3E8FF', border: '#9333EA', text: '#6B21A8', label: 'Intens' };
    default: return { bg: '#F3F4F6', border: '#6B7280', text: '#374151', label: 'Normaal' };
  }
};

// Confetti animatie CSS
const confettiStyle = `
  @keyframes confetti-fall {
    0% {
      transform: translateY(0) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100px) rotate(360deg);
      opacity: 0;
    }
  }
  
  @keyframes glow-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.7);
    }
    50% {
      box-shadow: 0 0 20px 10px rgba(74, 144, 226, 0.4);
    }
  }
  
  .confetti {
    animation: confetti-fall 1s ease-out forwards;
  }
  
  .glow-checkbox {
    animation: glow-pulse 0.6s ease-out;
  }
`;

const theme = {
  bg: '#F7F8FA',
  card: '#FFFFFF',
  text: '#2F3441',
  sub: '#6B7280',
  line: '#E6E8EE',
  accent: '#4A90E2',
  soft: 'rgba(74,144,226,0.06)',
};

export default function FocusPage() {
  const searchParams = useSearchParams();
  const { addTask, tasks, fetchTasks, updateTask } = useTasks();
  const [taskTitle, setTaskTitle] = useState(searchParams.get('task') || 'Focus sessie');
  const [checkIn, setCheckIn] = useState<any>(null);
  const [showMicroSteps, setShowMicroSteps] = useState(false);
  const [microStepInputs, setMicroStepInputs] = useState<string[]>(['', '', '']);
  const [completedMicroSteps, setCompletedMicroSteps] = useState<Set<number>>(new Set());
  const [confettiElements, setConfettiElements] = useState<number[]>([]);
  const [showFocusCard, setShowFocusCard] = useState(true); // Toon Focus Card standaard
  
  // Haal laatste check-in op
  useEffect(() => {
    const todayCheckIn = getTodayCheckIn();
    setCheckIn(todayCheckIn);
  }, []);
  
  // Vind taak op basis van titel of ID, of gebruik priority 1 taak
  const currentTask = useMemo(() => {
    const taskParam = searchParams.get('task');
    
    // Als er een task parameter is, zoek die taak
    if (taskParam) {
      // Probeer eerst op ID (als het een ID is)
      let task = tasks.find(t => t.id === taskParam);
      
      // Als niet gevonden, zoek op titel
      if (!task) {
        task = tasks.find(t => t.title === taskParam);
      }
      
      if (task) return task;
    }
    
    // Anders, gebruik priority 1 taak (ALTIJD de eerste niet-voltooide taak met priority 1)
    // BELANGRIJK: Als priority 1 taak wordt voltooid, toon dan een lege staat
    const priority1Task = tasks.find((t: any) => 
      t && 
      t.id &&
      t.title &&
      t.priority === 1 && 
      !t.done && 
      t.source !== 'medication'
    );
    
    return priority1Task || null;
  }, [tasks, searchParams]);
  
  // BELANGRIJK: Refresh taken wanneer ze worden geüpdatet (real-time sync)
  useEffect(() => {
    const handleTaskUpdate = () => {
      console.log('🔄 Focus Mode: Task update event received, refreshing...');
      fetchTasks();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('structuro_tasks_updated', handleTaskUpdate);
      return () => {
        window.removeEventListener('structuro_tasks_updated', handleTaskUpdate);
      };
    }
  }, [fetchTasks]);
  
  // Persistent timer state met localStorage (default 15 minuten)
  const [duration, setDuration] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('focus_duration');
      if (saved) return parseInt(saved);
    }
    return parseInt(searchParams.get('duration') || '15');
  });
  
  const [timeLeft, setTimeLeft] = useState(duration * 60); // in seconden
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showFirstStep, setShowFirstStep] = useState(true);
  const [showExtendButton, setShowExtendButton] = useState(false);
  const [showParkModal, setShowParkModal] = useState(false);
  const [showTipTooltip, setShowTipTooltip] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showAddTooltip, setShowAddTooltip] = useState(false);

  // Sla duration op in localStorage wanneer deze verandert
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('focus_duration', duration.toString());
    }
  }, [duration]);

  // Bereken dynamische presets: [current-5, current, current+10] met grenzen 5-60
  const presets = useMemo(() => {
    const min = 5;
    const max = 60;
    const preset1 = Math.max(min, duration - 5);
    const preset2 = duration;
    const preset3 = Math.min(max, duration + 10);
    
    // Zorg dat we altijd 3 unieke presets hebben
    const uniquePresets = Array.from(new Set([preset1, preset2, preset3])).sort((a, b) => a - b);
    
    // Als we minder dan 3 hebben, vul aan
    while (uniquePresets.length < 3) {
      if (uniquePresets[uniquePresets.length - 1] < max) {
        uniquePresets.push(Math.min(max, uniquePresets[uniquePresets.length - 1] + 5));
      } else if (uniquePresets[0] > min) {
        uniquePresets.unshift(Math.max(min, uniquePresets[0] - 5));
      } else {
        break;
      }
    }
    
    return uniquePresets.slice(0, 3);
  }, [duration]);

  // Update timeLeft wanneer duration verandert
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(duration * 60);
    }
  }, [duration, isRunning]);

  // Start NIET automatisch - wacht op gebruiker actie via Focus Card

  // Countdown timer
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setShowCountdown(false);
      setIsRunning(true);
      setShowFirstStep(false);
      
      // Markeer taak als gestart
      if (currentTask && !currentTask.started) {
        updateTask(currentTask.id, { started: true }).catch(err => {
          console.error('Error marking task as started:', err);
        });
      }
      
      track("ignite_start", { taskTitle, duration, autoStart: true });
    }
  }, [showCountdown, countdown, taskTitle, duration, currentTask, updateTask]);

  // Timer countdown
  useEffect(() => {
    if (isRunning && !isPaused && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setCompleted(true);
            track("ignite_complete", { taskTitle, duration });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isRunning, isPaused, timeLeft, taskTitle, duration]);

  // Toon verleng-knop in laatste minuut
  useEffect(() => {
    if (isRunning && timeLeft <= 60 && timeLeft > 0) {
      setShowExtendButton(true);
    } else {
      setShowExtendButton(false);
    }
  }, [isRunning, timeLeft]);

  // Progress berekening (0-100%)
  const progress = useMemo(() => {
    if (duration === 0) return 0;
    const elapsed = (duration * 60 - timeLeft) / (duration * 60);
    return Math.min(100, Math.max(0, elapsed * 100));
  }, [duration, timeLeft]);

  // Format tijd als MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Energie matching
  const taskEnergy = currentTask?.energyLevel || 'medium';
  const userEnergy = checkIn?.energyLevel || 'medium';
  const energyColors = getEnergyColor(taskEnergy);
  const hasEnergyMismatch = taskEnergy === 'high' && userEnergy === 'low';

  // Handle "Help me starten" - toon micro-stappen editor
  const handleHelpMeStart = () => {
    if (!currentTask) return;
    
    const existingSteps = currentTask.microSteps || [];
    if (existingSteps.length > 0) {
      setMicroStepInputs([...existingSteps, '', '', '']);
    } else {
      setMicroStepInputs(['', '', '']);
    }
    setCompletedMicroSteps(new Set());
    setShowMicroSteps(true);
  };

  // Sla micro-stappen op
  const handleSaveMicroSteps = async () => {
    if (!currentTask) return;
    
    const steps = microStepInputs.filter(step => step.trim() !== '');
    if (steps.length === 0) {
      toast('Voeg minimaal 1 micro-stap toe');
      return;
    }

    await updateTask(currentTask.id, {
      microSteps: steps
    });
    
    setShowMicroSteps(false);
    toast('Micro-stappen opgeslagen!');
    fetchTasks();
  };

  // Toggle micro-stap completion met confetti effect
  const handleToggleMicroStep = (index: number) => {
    const newCompleted = new Set(completedMicroSteps);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
      
      // Confetti effect
      setConfettiElements(prev => [...prev, Date.now()]);
      setTimeout(() => {
        setConfettiElements(prev => prev.slice(1));
      }, 1000);
      
      // Glow effect via CSS class
      const checkbox = document.getElementById(`micro-step-${index}`);
      if (checkbox) {
        checkbox.classList.add('glow-checkbox');
        setTimeout(() => {
          checkbox.classList.remove('glow-checkbox');
        }, 600);
      }
      
      toast('✓ Stap voltooid!');
    }
    setCompletedMicroSteps(newCompleted);
  };

  // Start sessie (vanuit Focus Card)
  const startSession = () => {
    setShowFocusCard(false); // Verberg Focus Card
    setShowCountdown(true);
    setCountdown(3);
    setTimeLeft(duration * 60);
    track("ignite_start", { taskTitle: currentTask?.title || taskTitle, duration });
  };

  // Pauzeer/hervat sessie
  const pauseSession = () => {
    setIsPaused(prev => !prev);
    track("ignite_pause", { taskTitle, duration, paused: !isPaused });
  };

  // Stop sessie
  const stopSession = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(duration * 60);
    track("ignite_stop", { taskTitle, duration });
  };

  // Verleng sessie met 5 minuten
  const extendSession = () => {
    setTimeLeft(prev => prev + 300);
    setDuration(prev => prev + 5);
    toast("Sessie verlengd met 5 minuten! ⏰");
    track("ignite_extend", { taskTitle, duration, extended: true });
  };

  // Gedachte parkeren
  const handleParkThought = async (thoughtText: string) => {
    try {
      await addTask({
        title: thoughtText,
        duration: null,
        priority: null,
        done: false,
        dueAt: null,
        reminders: [],
        repeat: "none",
        impact: "🧠",
        source: "parked_thought",
        energyLevel: 'low',
        estimatedDuration: null
      });
      
      toast("Gedachte geparkeerd! 📝");
      track("interruption_parked", { taskTitle, duration, thought: thoughtText });
    } catch (error: any) {
      console.error('Failed to park thought:', error);
      toast("Fout bij parkeren van gedachte: " + (error.message || 'Onbekende fout'));
      throw error;
    }
  };

  const openParkModal = () => {
    setShowParkModal(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      
      if (e.key === " ") {
        e.preventDefault();
        if (isRunning) pauseSession();
      } else if (e.key === "Escape") {
        if (isRunning) stopSession();
      } else if (e.key.toLowerCase() === "j") {
        if (isRunning || !isRunning) {
          openParkModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, isPaused]);

  // Update preset handler
  const handlePresetClick = (mins: number) => {
    setDuration(mins);
    setTimeLeft(mins * 60);
  };

  // Update taskTitle en duration als currentTask verandert
  useEffect(() => {
    if (currentTask) {
      setTaskTitle(currentTask.title);
      if (currentTask.duration) {
        setDuration(currentTask.duration);
        setTimeLeft(currentTask.duration * 60);
      }
    }
  }, [currentTask]);

  const existingMicroSteps = currentTask?.microSteps || [];

  // Countdown overlay
  if (showCountdown) {
    return (
      <AppLayout>
        <style>{confettiStyle}</style>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-8xl font-bold text-blue-600 mb-4">{countdown}</div>
            <p className="text-xl text-gray-600 mb-2">Focus sessie start over</p>
            <p className="text-gray-500">{currentTask?.title || taskTitle}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Focus Card - toon VOOR timer (alleen als er een taak is)
  // Als er geen taak is, toon een melding
  if (showFocusCard) {
    if (!currentTask) {
      // Geen taak gevonden - toon melding
      return (
        <AppLayout>
          <div style={{ 
            minHeight: '100vh',
            background: theme.bg,
            padding: '40px 24px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ 
              maxWidth: 600, 
              width: '100%',
              background: theme.card,
              borderRadius: 24,
              padding: 48,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 48, marginBottom: 24 }}>🎯</div>
              <h1 style={{
                fontSize: 28,
                fontWeight: 700,
                color: theme.text,
                marginBottom: 16
              }}>
                Geen focus taak
              </h1>
              <p style={{
                fontSize: 16,
                color: theme.sub,
                marginBottom: 32,
                lineHeight: 1.6
              }}>
                Stel je prioriteiten in via de dagstart check-in om te beginnen, of kies een taak uit je takenlijst.
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  href="/dagstart"
                  style={{
                    padding: '16px 32px',
                    background: theme.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  Start dagstart check-in
                </a>
                <a
                  href="/todo"
                  style={{
                    padding: '16px 32px',
                    background: 'transparent',
                    color: theme.accent,
                    border: `2px solid ${theme.accent}`,
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  Bekijk takenlijst
                </a>
              </div>
            </div>
          </div>
        </AppLayout>
      );
    }
    
    // Er is een taak - toon Zen-modus Focus Card
    return (
      <AppLayout hideSidebar={true}>
        <style>{confettiStyle}</style>
        
        {/* Confetti elements */}
        {confettiElements.map((id, idx) => (
          <div
            key={id}
            className="confetti"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              width: 10,
              height: 10,
              background: energyColors.border,
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 9999,
              transform: `translate(-50%, -50%) rotate(${idx * 45}deg)`,
            }}
          />
        ))}

        {/* Zen-modus: Donkere achtergrond, gecentreerde content */}
        <div style={{ 
          minHeight: '100vh',
          background: '#0F172A', // Donkere achtergrond (slate-900)
          color: '#F1F5F9', // Lichte tekst
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '60px 24px 40px',
          position: 'relative'
        }}>
          {/* Hoofdcontent: Taak groot gecentreerd */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            maxWidth: '800px',
            textAlign: 'center'
          }}>
            {/* Taak titel - EXTRA GROOT en rustig */}
            <h1 style={{
              fontSize: 'clamp(32px, 8vw, 72px)',
              fontWeight: 300, // Lichter font voor rust
              color: '#F1F5F9',
              marginBottom: 48,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              maxWidth: '90%'
            }}>
              {currentTask.title}
            </h1>

            {/* Micro-stappen - Prominent met grote checkboxes */}
            {existingMicroSteps.length > 0 && (
              <div style={{
                width: '100%',
                maxWidth: '600px',
                marginBottom: 60
              }}>
                {existingMicroSteps.map((step: string, idx: number) => (
                  <div 
                    key={idx}
                    id={`micro-step-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20,
                      marginBottom: 24,
                      padding: 20,
                      background: completedMicroSteps.has(idx) 
                        ? 'rgba(16, 185, 129, 0.1)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 16,
                      border: `2px solid ${completedMicroSteps.has(idx) ? '#10B981' : 'rgba(255, 255, 255, 0.1)'}`,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleToggleMicroStep(idx)}
                  >
                    {/* Grote checkbox */}
                    <input
                      type="checkbox"
                      checked={completedMicroSteps.has(idx)}
                      onChange={() => handleToggleMicroStep(idx)}
                      style={{
                        width: 32,
                        height: 32,
                        cursor: 'pointer',
                        accentColor: '#10B981',
                        flexShrink: 0
                      }}
                    />
                    <span style={{
                      fontSize: 20,
                      color: completedMicroSteps.has(idx) ? 'rgba(241, 245, 249, 0.5)' : '#F1F5F9',
                      textDecoration: completedMicroSteps.has(idx) ? 'line-through' : 'none',
                      flex: 1,
                      fontWeight: 400,
                      transition: 'all 0.3s ease',
                      textAlign: 'left'
                    }}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Start Focus Sessie knop - Subtiel maar duidelijk */}
            <button
              onClick={startSession}
              style={{
                padding: '20px 48px',
                background: 'rgba(74, 144, 226, 0.2)',
                color: '#4A90E2',
                border: '2px solid rgba(74, 144, 226, 0.4)',
                borderRadius: 16,
                fontSize: 18,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginTop: 40
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(74, 144, 226, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(74, 144, 226, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(74, 144, 226, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(74, 144, 226, 0.4)';
              }}
            >
              Start Focus Sessie
            </button>
          </div>

          {/* Gedachten parkeren - Subtiel onderaan */}
          <div style={{
            width: '100%',
            maxWidth: '600px',
            paddingTop: 40,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                if (input && input.value.trim()) {
                  handleParkThought(input.value.trim());
                  input.value = '';
                }
              }}
              style={{ display: 'flex', gap: 12 }}
            >
              <input
                type="text"
                placeholder="Parkeer een afleiding..."
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  fontSize: 15,
                  color: '#F1F5F9',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '14px 24px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#F1F5F9',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                Parkeer
              </button>
            </form>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Timer modus - Zen-modus met donkere achtergrond
  return (
    <AppLayout hideSidebar={true}>
      <div
        style={{
          minHeight: "100vh",
          background: "#0F172A", // Donkere achtergrond
          color: "#F1F5F9", // Lichte tekst
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "60px 24px 40px",
        }}
      >
        {/* Hoofdcontent: Timer groot gecentreerd */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          maxWidth: "800px",
          textAlign: "center"
        }}>
          {/* Taak titel (als er een is) */}
          {currentTask && (
            <h1 style={{
              fontSize: 'clamp(24px, 5vw, 48px)',
              fontWeight: 300,
              color: '#F1F5F9',
              marginBottom: 32,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              opacity: 0.8
            }}>
              {currentTask.title}
            </h1>
          )}

          {/* Timer Display - EXTRA GROOT */}
          <div style={{ marginBottom: "40px" }}>
            <div style={{ 
              fontSize: "clamp(64px, 15vw, 120px)", 
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 300, // Lichter voor rust
              color: "#F1F5F9",
              lineHeight: 1,
              letterSpacing: "-0.05em"
            }}>
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Micro-stappen tijdens timer (als beschikbaar) */}
          {currentTask && existingMicroSteps.length > 0 && (
            <div style={{
              width: '100%',
              maxWidth: '500px',
              marginBottom: 40
            }}>
              {existingMicroSteps.map((step: string, idx: number) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 16,
                    padding: 12,
                    background: completedMicroSteps.has(idx) 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 12,
                    border: `1px solid ${completedMicroSteps.has(idx) ? '#10B981' : 'rgba(255, 255, 255, 0.1)'}`,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    opacity: completedMicroSteps.has(idx) ? 0.6 : 1
                  }}
                  onClick={() => handleToggleMicroStep(idx)}
                >
                  <input
                    type="checkbox"
                    checked={completedMicroSteps.has(idx)}
                    onChange={() => handleToggleMicroStep(idx)}
                    style={{
                      width: 24,
                      height: 24,
                      cursor: 'pointer',
                      accentColor: '#10B981',
                      flexShrink: 0
                    }}
                  />
                  <span style={{
                    fontSize: 16,
                    color: completedMicroSteps.has(idx) ? 'rgba(241, 245, 249, 0.5)' : '#F1F5F9',
                    textDecoration: completedMicroSteps.has(idx) ? 'line-through' : 'none',
                    flex: 1,
                    fontWeight: 400,
                    textAlign: 'left'
                  }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Controls - Subtiel */}
          {!completed && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "400px" }}>
              {!isRunning ? (
                <>
                  {/* Tijdskeuze - Subtiel */}
                  <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px", color: "rgba(241, 245, 249, 0.6)" }}>🕒</span>
                      <select
                        value={duration}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val) {
                            setDuration(val);
                            setTimeLeft(val * 60);
                          }
                        }}
                        style={{
                          padding: "8px 32px 8px 12px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#F1F5F9",
                          background: "rgba(255, 255, 255, 0.1)",
                          cursor: "pointer",
                          outline: "none",
                          appearance: "none",
                          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23F1F5F9' d='M6 9L1 4h10z'/%3E%3C/svg%3E\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                          paddingRight: "40px"
                        }}
                      >
                        {[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((mins) => (
                          <option key={mins} value={mins} style={{ background: "#0F172A", color: "#F1F5F9" }}>{mins} min</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Start knop */}
                  <button
                    onClick={startSession}
                    style={{
                      width: "100%",
                      background: "rgba(74, 144, 226, 0.2)",
                      border: "2px solid rgba(74, 144, 226, 0.4)",
                      borderRadius: "12px",
                      padding: "16px 24px",
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "#4A90E2",
                      cursor: "pointer",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(74, 144, 226, 0.3)";
                      e.currentTarget.style.borderColor = "rgba(74, 144, 226, 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(74, 144, 226, 0.2)";
                      e.currentTarget.style.borderColor = "rgba(74, 144, 226, 0.4)";
                    }}
                  >
                    Start Focus Sessie
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={pauseSession}
                    style={{
                      width: "100%",
                      background: isPaused ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                      border: `2px solid ${isPaused ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
                      borderRadius: "12px",
                      padding: "14px 20px",
                      fontSize: "15px",
                      fontWeight: 500,
                      color: isPaused ? "#10B981" : "#F59E0B",
                      cursor: "pointer",
                      transition: "all 0.3s ease"
                    }}
                  >
                    {isPaused ? '▶ Hervatten' : '⏸ Pauzeren'}
                  </button>
                  
                  {showExtendButton && (
                    <button
                      onClick={extendSession}
                      style={{
                        width: "100%",
                        background: "rgba(16, 185, 129, 0.2)",
                        border: "2px solid rgba(16, 185, 129, 0.4)",
                        borderRadius: "12px",
                        padding: "12px 20px",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#10B981",
                        cursor: "pointer",
                        transition: "all 0.3s ease"
                      }}
                    >
                      +5 Minuten
                    </button>
                  )}
                  
                  <button
                    onClick={stopSession}
                    style={{
                      width: "100%",
                      background: "rgba(239, 68, 68, 0.2)",
                      border: "2px solid rgba(239, 68, 68, 0.4)",
                      borderRadius: "12px",
                      padding: "12px 20px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#EF4444",
                      cursor: "pointer",
                      transition: "all 0.3s ease"
                    }}
                  >
                    Stoppen
                  </button>
                </>
              )}
            </div>
          )}

          {/* Completion Message */}
          {completed && (
            <div style={{ 
              marginBottom: "28px", 
              padding: "32px", 
              background: "rgba(16, 185, 129, 0.1)", 
              border: "2px solid rgba(16, 185, 129, 0.3)", 
              borderRadius: "16px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
              <h3 style={{ fontSize: "24px", fontWeight: 600, color: "#10B981", marginBottom: "8px" }}>
                Taakblok Afgerond!
              </h3>
              <div style={{ fontSize: "14px", color: "rgba(241, 245, 249, 0.8)", fontWeight: 400, marginBottom: "24px" }}>
                Je hebt {Math.round(((duration * 60 - timeLeft) / 60))} minuten gefocust
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <button
                  onClick={() => {
                    setCompleted(false);
                    setTimeLeft(duration * 60);
                    setIsRunning(false);
                  }}
                  style={{
                    width: "100%",
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "2px solid rgba(16, 185, 129, 0.4)",
                    borderRadius: "12px",
                    padding: "16px 24px",
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "#10B981",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                >
                  🎯 Klaar! Taak Voltooid
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Gedachten parkeren - Subtiel onderaan */}
        <div style={{
          width: "100%",
          maxWidth: "600px",
          paddingTop: 40,
          borderTop: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input') as HTMLInputElement;
              if (input && input.value.trim()) {
                handleParkThought(input.value.trim());
                input.value = '';
              }
            }}
            style={{ display: "flex", gap: 12 }}
          >
            <input
              type="text"
              placeholder="Parkeer een afleiding..."
              style={{
                flex: 1,
                padding: "14px 20px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                fontSize: 15,
                color: "#F1F5F9",
                outline: "none",
                transition: "all 0.2s"
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            />
            <button
              type="submit"
              style={{
                padding: "14px 24px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#F1F5F9",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              }}
            >
              Parkeer
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
