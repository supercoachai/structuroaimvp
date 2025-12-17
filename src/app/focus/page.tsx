"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '../../components/layout/AppLayout';
import { track } from '../../shared/track';
import { toast } from '../../components/Toast';
import { useTasks } from '../../hooks/useTasks';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import GedachteParkerenModal from '../../components/GedachteParkerenModal';

export default function FocusPage() {
  const searchParams = useSearchParams();
  const { addTask, tasks, fetchTasks, updateTask } = useTasks();
  const [taskTitle, setTaskTitle] = useState(searchParams.get('task') || 'Focus sessie');
  
  // Vind taak op basis van titel of ID
  const currentTask = useMemo(() => {
    const taskParam = searchParams.get('task');
    if (!taskParam) return null;
    
    // Probeer eerst op ID (als het een ID is)
    let task = tasks.find(t => t.id === taskParam);
    
    // Als niet gevonden, zoek op titel
    if (!task) {
      task = tasks.find(t => t.title === taskParam);
    }
    
    return task;
  }, [tasks, searchParams]);
  
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

  // Start automatisch focus mode als er een taak is
  useEffect(() => {
    if (taskTitle && taskTitle !== 'Focus sessie' && duration > 0) {
      setShowCountdown(true);
      setTimeLeft(duration * 60);
      setCountdown(3);
    }
  }, [taskTitle, duration]);

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

  // Start sessie
  const startSession = () => {
    setShowCountdown(true);
    setCountdown(3);
    setTimeLeft(duration * 60);
    track("ignite_start", { taskTitle, duration });
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

  // Countdown overlay
  if (showCountdown) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-8xl font-bold text-blue-600 mb-4">{countdown}</div>
            <p className="text-xl text-gray-600 mb-2">Focus sessie start over</p>
            <p className="text-gray-500">{taskTitle}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        style={{
          minHeight: "100vh",
          background: "#F7F8FA",
          color: "#2F3441",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "24px 16px",
        }}
      >
        <main style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ 
            width: "100%", 
            maxWidth: "600px", 
            background: "white", 
            borderRadius: "16px", 
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)", 
            padding: "32px",
            textAlign: "center"
          }}>
            {/* 1. Titel met info icoon */}
            <header style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#2F3441", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                Focus Modus
                <div style={{ position: "relative" }}>
                  <InformationCircleIcon 
                    style={{ width: "20px", height: "20px", color: "#9CA3AF", cursor: "pointer" }}
                    onMouseEnter={() => setShowInfoTooltip(true)}
                    onMouseLeave={() => setShowInfoTooltip(false)}
                  />
                  {showInfoTooltip && (
                    <div style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      marginBottom: "8px",
                      padding: "12px 16px",
                      background: "#1F2937",
                      color: "white",
                      fontSize: "12px",
                      borderRadius: "8px",
                      zIndex: 1000,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                      pointerEvents: "none",
                      width: "280px",
                      textAlign: "left",
                      lineHeight: "1.5"
                    }}>
                      <div style={{ marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Focus Modus</div>
                      <div style={{ fontSize: "11px", opacity: 0.9, lineHeight: 1.5 }}>
                        Gebruik "Gedachte Parkeren" (toets J) om afleidende gedachten snel op te slaan zonder je focus te verliezen.
                      </div>
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "6px solid #1F2937"
                      }} />
                    </div>
                  )}
                </div>
              </div>
              {/* 2. Subtitel */}
              <div style={{ fontSize: "15px", color: "rgba(47,52,65,0.75)", lineHeight: "1.4" }}>
                Concentreer je op: <strong style={{ color: "#2F3441" }}>{taskTitle}</strong>
              </div>
            </header>

            {/* 3. Preptip - willekeurige ADHD focus tip */}
            {showFirstStep && !isRunning && !completed && (() => {
              const adhdFocusTips = [
                "🔕 Zet je telefoon op stil en leg hem uit het zicht",
                "🎧 Gebruik noise-cancelling koptelefoon of oordopjes",
                "💧 Zet een glas water naast je - blijf gehydrateerd",
                "🌿 Zet een plant of rustige achtergrond op je scherm",
                "⏰ Gebruik de Pomodoro techniek: 25 min focus, 5 min pauze",
                "📝 Schrijf afleidende gedachten op en parkeer ze voor later",
                "🚫 Sluit alle onnodige tabs en apps",
                "🎯 Focus op één taak tegelijk - multitasken bestaat niet",
                "💪 Begin met de moeilijkste taak als je energie hoog is",
                "🏃 Doe 2 minuten beweging voor je begint",
                "🍎 Eet iets lichts voor focus - geen suikerpieken",
                "💡 Zet je scherm op nachtmodus voor minder blauw licht",
                "🧘 Doe 3 diepe ademhalingen voor je start",
                "📌 Zet je doelen visueel neer waar je ze ziet",
                "🎵 Luister naar focus muziek (binaural beats of instrumentaal)",
                "🌅 Plan focus tijd in je beste uren van de dag",
                "✍️ Schrijf je microstappen op - maak het klein",
                "🔄 Wissel tussen zittend en staand werken",
                "💚 Gebruik een fidget toy als je handen onrustig zijn",
                "📱 Zet notificaties uit voor deze sessie",
                "🎨 Creëer een rustige, opgeruimde werkplek",
                "⏱️ Start met 5 minuten - momentum bouwt op",
                "🧠 Accepteer dat perfectie niet bestaat - done is better than perfect",
                "💬 Vertel anderen dat je in focus modus bent",
                "🌟 Beloon jezelf na elke voltooide sessie"
              ];
              const today = new Date();
              const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
              const tipIndex = dayOfYear % adhdFocusTips.length;
              const currentTip = adhdFocusTips[tipIndex];
              
              // Verwijder emoji uit tip voor taak titel (verwijder eerste emoji + spatie)
              const tipWithoutEmoji = currentTip.replace(/^[\u{1F300}-\u{1F9FF}]+\s?/u, '').trim() || currentTip.replace(/^[^\s]+\s/, '').trim();
              
              // Check of taak al bestaat
              const taskExists = tasks.some(task => 
                task.title.toLowerCase() === tipWithoutEmoji.toLowerCase() && 
                !task.done
              );

              const handleAddTipAsTask = async () => {
                if (taskExists) {
                  toast('Deze taak staat al in je lijst');
                  return;
                }

                try {
                  await addTask({
                    title: tipWithoutEmoji,
                    done: false,
                    priority: null,
                    duration: null,
                    dueAt: new Date().toISOString().split('T')[0] + 'T00:00:00', // Vandaag
                    reminders: [],
                    repeat: 'none',
                    impact: '🌱',
                    source: 'regular',
                    energyLevel: 'medium',
                    estimatedDuration: null
                  });
                  
                  await fetchTasks(); // Refresh takenlijst
                  toast('Taak toegevoegd ✅');
                  track('focus_tip_added_as_task', { tip: tipWithoutEmoji });
                } catch (error: any) {
                  console.error('Failed to add tip as task:', error);
                  toast('Fout bij toevoegen van taak: ' + (error.message || 'Onbekende fout'));
                }
              };

              return (
                <div 
                  style={{ 
                    marginBottom: "24px", 
                    fontSize: "13px", 
                    color: "rgba(107,114,128,0.8)",
                    lineHeight: "1.6",
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    flexWrap: "wrap"
                  }}
                >
                  <span>{currentTip}</span>
                  <span style={{ color: "rgba(107,114,128,0.5)" }}>•</span>
                  <button
                    onClick={handleAddTipAsTask}
                    disabled={taskExists}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: taskExists ? "rgba(107,114,128,0.5)" : "#4A90E2",
                      cursor: taskExists ? "default" : "pointer",
                      fontSize: "13px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      transition: "all 0.2s ease",
                      position: "relative",
                      textDecoration: "none"
                    }}
                    onMouseEnter={(e) => {
                      if (!taskExists) {
                        e.currentTarget.style.background = "#F0F9FF";
                        e.currentTarget.style.color = "#2563EB";
                        setShowAddTooltip(true);
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!taskExists) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#4A90E2";
                        setShowAddTooltip(false);
                      }
                    }}
                  >
                    {taskExists ? "✓ Al in lijst" : "+"}
                    
                    {/* Tooltip */}
                    {showAddTooltip && !taskExists && (
                      <div style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        marginBottom: "8px",
                        padding: "6px 10px",
                        background: "#1F2937",
                        color: "white",
                        fontSize: "11px",
                        borderRadius: "6px",
                        whiteSpace: "nowrap",
                        zIndex: 1000,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        pointerEvents: "none"
                      }}>
                        Toevoegen als taak
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 0,
                          height: 0,
                          borderLeft: "4px solid transparent",
                          borderRight: "4px solid transparent",
                          borderTop: "4px solid #1F2937"
                        }} />
                      </div>
                    )}
                  </button>
                </div>
              );
            })()}

            {/* 4. Timer Display - rustige typografie */}
            <div style={{ marginBottom: "28px" }}>
              <div style={{ 
                fontSize: "64px", 
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
                color: "#1F2937",
                marginBottom: "16px",
                lineHeight: 1,
                letterSpacing: "-0.02em"
              }}>
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* 5. Tijdskeuze - één dropdown/combobox */}
            {!isRunning && !completed && (
              <div style={{ marginBottom: "28px", display: "flex", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px", color: "#6B7280" }}>🕒 Tijd:</span>
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
                      border: "1px solid #E6E8EE",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#2F3441",
                      background: "white",
                      cursor: "pointer",
                      outline: "none",
                      appearance: "none",
                      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E\")",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                      paddingRight: "40px"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#4A90E2";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(74,144,226,0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#E6E8EE";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((mins) => (
                      <option key={mins} value={mins}>{mins} min</option>
                    ))}
                    <option value={duration} disabled={[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].includes(duration)}>
                      {duration} min (aangepast)
                    </option>
                  </select>
                </div>
              </div>
            )}

            {/* Controls */}
            {!completed && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "28px" }}>
                {!isRunning ? (
                  <>
                    {/* 7. Start knop - primaire CTA */}
                    <button
                      onClick={startSession}
                      style={{
                        width: "100%",
                        background: "linear-gradient(135deg, #4A90E2, #3B82F6)",
                        border: "none",
                        borderRadius: "12px",
                        padding: "16px 24px",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "white",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: "0 4px 12px rgba(74,144,226,0.3)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, #3B82F6, #2563EB)";
                        e.currentTarget.style.transform = "scale(1.02)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(74,144,226,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, #4A90E2, #3B82F6)";
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(74,144,226,0.3)";
                      }}
                    >
                      🚀 Start Focus Sessie
                    </button>
                    
                    {/* 6. Gedachten parkeren - onder start knop */}
                    <button
                      onClick={openParkModal}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        padding: "8px 16px",
                        fontSize: "12px",
                        fontWeight: 400,
                        color: "#9CA3AF",
                        cursor: "pointer",
                        textDecoration: "underline",
                        textDecorationStyle: "dotted"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#6B7280";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#9CA3AF";
                      }}
                    >
                      Gedachten parkeren
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={pauseSession}
                      style={{
                        width: "100%",
                        background: isPaused ? "linear-gradient(135deg, #10B981, #059669)" : "linear-gradient(135deg, #F59E0B, #D97706)",
                        border: "none",
                        borderRadius: "10px",
                        padding: "12px 20px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "white",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {isPaused ? '▶ Hervatten' : '⏸ Pauzeren'}
                    </button>
                    
                    {showExtendButton && (
                      <button
                        onClick={extendSession}
                        style={{
                          width: "100%",
                          background: "linear-gradient(135deg, #10B981, #059669)",
                          border: "none",
                          borderRadius: "10px",
                          padding: "12px 20px",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "white",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        +5 Minuten
                      </button>
                    )}
                    
                    <button
                      onClick={openParkModal}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        padding: "8px 16px",
                        fontSize: "12px",
                        fontWeight: 400,
                        color: "#9CA3AF",
                        cursor: "pointer",
                        textDecoration: "underline",
                        textDecorationStyle: "dotted"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#6B7280";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#9CA3AF";
                      }}
                    >
                      Gedachten parkeren
                    </button>
                    
                    <button
                      onClick={stopSession}
                      style={{
                        width: "100%",
                        background: "linear-gradient(135deg, #EF4444, #DC2626)",
                        border: "none",
                        borderRadius: "10px",
                        padding: "12px 20px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "white",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
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
                background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)", 
                border: "2px solid #86EFAC", 
                borderRadius: "16px"
              }}>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
                  <h3 style={{ fontSize: "24px", fontWeight: 700, color: "#166534", marginBottom: "8px" }}>
                    Taakblok Afgerond!
                  </h3>
                  <div style={{ fontSize: "14px", color: "#15803D", fontWeight: 500 }}>
                    Je hebt {Math.round(((duration * 60 - timeLeft) / 60))} minuten gefocust
                  </div>
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
                      background: "linear-gradient(135deg, #10B981, #059669)",
                      border: "none",
                      borderRadius: "12px",
                      padding: "16px 24px",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "white",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    🎯 Klaar! Taak Voltooid
                  </button>
                  
                  {timeLeft > 0 && (
                    <button
                      onClick={() => {
                        setCompleted(false);
                        setIsRunning(false);
                      }}
                      style={{
                        width: "100%",
                        background: "white",
                        border: "2px solid #E6E8EE",
                        borderRadius: "10px",
                        padding: "12px 20px",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#64748B",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      📋 Maak resterende tijd tot nieuwe taak ({Math.round(timeLeft / 60)} min)
                    </button>
                  )}
                </div>
              </div>
            )}


            {/* Gedachte Parkeren Modal */}
            <GedachteParkerenModal
              isOpen={showParkModal}
              onClose={() => setShowParkModal(false)}
              onPark={handleParkThought}
            />
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
