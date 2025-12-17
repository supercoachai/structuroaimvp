"use client";

import { useMemo, useState, useEffect } from 'react';
import { useTasks } from '../../hooks/useTasks';
import AppLayout from '../../components/layout/AppLayout';
import TasksOverviewCalm from '../../components/TasksOverview';
import { designSystem } from '../../lib/design-system';
import { getTodayCheckIn } from '../../lib/localStorageTasks';
import { toast } from '../../components/Toast';

const theme = {
  bg: designSystem.colors.background,
  card: designSystem.colors.white,
  text: designSystem.colors.text,
  sub: designSystem.colors.textSecondary,
  line: designSystem.colors.border,
  accent: designSystem.colors.primary,
  soft: "rgba(74,144,226,0.06)",
};

// Energie kleuren
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

export default function TodoPage() {
  const { tasks, updateTask, fetchTasks } = useTasks();
  const [showMicroSteps, setShowMicroSteps] = useState(false);
  const [microStepInputs, setMicroStepInputs] = useState<string[]>(['', '', '']);
  const [completedMicroSteps, setCompletedMicroSteps] = useState<Set<number>>(new Set());
  const [showOtherTasks, setShowOtherTasks] = useState(false);
  const [checkIn, setCheckIn] = useState<any>(null);
  const [confettiElements, setConfettiElements] = useState<number[]>([]);

  // Haal laatste check-in op
  useEffect(() => {
    const todayCheckIn = getTodayCheckIn();
    setCheckIn(todayCheckIn);
  }, []);

  // Filter Prioriteit 1 taak (Focus Card)
  const focusTask = useMemo(() => {
    return tasks.find((t: any) => 
      t.priority === 1 && 
      !t.done && 
      t.source !== 'medication'
    ) || null;
  }, [tasks]);

  // Filter andere taken (Prioriteit 2/3) - verborgen/dimmed
  const otherTasks = useMemo(() => {
    return tasks
      .filter((t: any) => 
        (t.priority === 2 || t.priority === 3) && 
        !t.done && 
        t.source !== 'medication'
      )
      .sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999));
  }, [tasks]);

  // Energie matching
  const taskEnergy = focusTask?.energyLevel || 'medium';
  const userEnergy = checkIn?.energyLevel || 'medium';
  const energyColors = getEnergyColor(taskEnergy);
  const hasEnergyMismatch = taskEnergy === 'high' && userEnergy === 'low';

  // Handle "Help me starten" - toon micro-stappen editor
  const handleHelpMeStart = () => {
    if (!focusTask) return;
    
    const existingSteps = focusTask.microSteps || [];
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
    if (!focusTask) return;
    
    const steps = microStepInputs.filter(step => step.trim() !== '');
    if (steps.length === 0) {
      toast('Voeg minimaal 1 micro-stap toe');
      return;
    }

    await updateTask(focusTask.id, {
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

  // Start focus sessie
  const handleStartFocus = () => {
    if (!focusTask) return;
    window.location.href = `/focus?task=${encodeURIComponent(focusTask.title)}&duration=${focusTask.duration || 15}`;
  };

  const existingMicroSteps = focusTask?.microSteps || [];

  return (
    <AppLayout>
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

      <div style={{ 
        maxWidth: 900, 
        margin: '0 auto', 
        padding: '40px 24px',
        minHeight: '100vh'
      }}>
        {/* Focus Card - Alleen tonen als er een Prioriteit 1 taak is */}
        {focusTask && (
          <div style={{
            background: theme.card,
            borderRadius: 24,
            padding: 48,
            marginBottom: 32,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: `3px solid ${energyColors.border}`,
            backgroundImage: `linear-gradient(to bottom, ${energyColors.bg}15, ${theme.card})`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Energie indicator badge */}
            <div style={{
              position: 'absolute',
              top: 24,
              right: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: energyColors.bg,
              borderRadius: 20,
              border: `2px solid ${energyColors.border}`
            }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: energyColors.border
              }} />
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: energyColors.text,
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>
                {energyColors.label}
              </span>
            </div>

            {/* Energie mismatch waarschuwing */}
            {hasEnergyMismatch && (
              <div style={{
                marginBottom: 24,
                padding: 16,
                background: '#FEF3C7',
                border: '2px solid #F59E0B',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'start',
                gap: 12
              }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#92400E',
                    marginBottom: 4
                  }}>
                    Pas op: deze taak vraagt veel energie
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: '#78350F',
                    lineHeight: 1.5
                  }}>
                    Je hebt vandaag lage energie ingevuld, maar deze taak is intens. 
                    Overweeg om de taak op te splitsen in kleinere stappen.
                  </div>
                </div>
              </div>
            )}

            {/* Taak titel - Extra groot */}
            <h1 style={{
              fontSize: 36,
              fontWeight: 800,
              color: theme.text,
              marginBottom: 16,
              lineHeight: 1.2,
              marginTop: 8,
              maxWidth: '85%'
            }}>
              {focusTask.title}
            </h1>

            {/* Context info */}
            <div style={{
              display: 'flex',
              gap: 12,
              marginBottom: 32,
              flexWrap: 'wrap'
            }}>
              {focusTask.duration && (
                <div style={{
                  fontSize: 14,
                  color: theme.sub,
                  padding: '6px 14px',
                  background: theme.soft,
                  borderRadius: 8,
                  fontWeight: 500
                }}>
                  ⏱ {focusTask.duration} minuten
                </div>
              )}
              {focusTask.energyLevel && (
                <div style={{
                  fontSize: 14,
                  color: energyColors.text,
                  padding: '6px 14px',
                  background: energyColors.bg,
                  borderRadius: 8,
                  fontWeight: 500,
                  border: `1px solid ${energyColors.border}30`
                }}>
                  Energie: {energyColors.label}
                </div>
              )}
            </div>

            {/* Actie knoppen */}
            <div style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: showMicroSteps ? 32 : 0
            }}>
              <button
                onClick={handleStartFocus}
                style={{
                  flex: 1,
                  minWidth: 220,
                  padding: '18px 32px',
                  background: theme.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 16px rgba(74,144,226,0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(74,144,226,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(74,144,226,0.4)';
                }}
              >
                Start Focus Sessie
              </button>
              
              <button
                onClick={handleHelpMeStart}
                style={{
                  padding: '18px 32px',
                  background: energyColors.bg,
                  color: energyColors.text,
                  border: `3px solid ${energyColors.border}`,
                  borderRadius: 14,
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: `0 4px 16px ${energyColors.border}30`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = `0 6px 20px ${energyColors.border}50`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 4px 16px ${energyColors.border}30`;
                }}
              >
                Help me starten
              </button>
            </div>

            {/* Micro-stappen editor */}
            {showMicroSteps && (
              <div style={{
                marginTop: 32,
                padding: 32,
                background: theme.soft,
                borderRadius: 16,
                border: `2px solid ${energyColors.border}40`
              }}>
                <h3 style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: theme.text,
                  marginBottom: 20
                }}>
                  Breek het op in kleine stappen:
                </h3>
                
                {/* Input velden voor nieuwe micro-stappen */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {microStepInputs.map((input, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: energyColors.border,
                        minWidth: 32,
                        textAlign: 'center'
                      }}>
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => {
                          const newInputs = [...microStepInputs];
                          newInputs[idx] = e.target.value;
                          setMicroStepInputs(newInputs);
                        }}
                        placeholder={
                          idx === 0 
                            ? "Stap 1: Pak een glas water en open je laptop"
                            : idx === 1
                            ? "Stap 2: Open het bestand of de app die je nodig hebt"
                            : "Stap 3: Begin met de eerste kleine actie"
                        }
                        style={{
                          flex: 1,
                          padding: '16px 20px',
                          border: `2px solid ${theme.line}`,
                          borderRadius: 12,
                          fontSize: 16,
                          outline: 'none',
                          transition: 'border-color 0.2s',
                          background: theme.card
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = energyColors.border;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = theme.line;
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Save/Cancel buttons */}
                <div style={{
                  display: 'flex',
                  gap: 16,
                  marginTop: 24
                }}>
                  <button
                    onClick={handleSaveMicroSteps}
                    style={{
                      flex: 1,
                      padding: '16px 32px',
                      background: energyColors.border,
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 6px 20px ${energyColors.border}50`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Opslaan
                  </button>
                  <button
                    onClick={() => {
                      setShowMicroSteps(false);
                      setMicroStepInputs(['', '', '']);
                    }}
                    style={{
                      padding: '16px 32px',
                      background: 'transparent',
                      color: theme.sub,
                      border: `2px solid ${theme.line}`,
                      borderRadius: 12,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}

            {/* Bestaande micro-stappen weergave (als niet in edit mode) */}
            {!showMicroSteps && existingMicroSteps.length > 0 && (
              <div style={{
                marginTop: 32,
                padding: 28,
                background: theme.soft,
                borderRadius: 16
              }}>
                <h3 style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: theme.text,
                  marginBottom: 20
                }}>
                  Jouw micro-stappen:
                </h3>
                {existingMicroSteps.map((step: string, idx: number) => (
                  <div 
                    key={idx}
                    id={`micro-step-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      marginBottom: 14,
                      padding: 16,
                      background: theme.card,
                      borderRadius: 12,
                      border: `2px solid ${completedMicroSteps.has(idx) ? energyColors.border : theme.line}`,
                      transition: 'all 0.3s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={completedMicroSteps.has(idx)}
                      onChange={() => handleToggleMicroStep(idx)}
                      style={{
                        width: 24,
                        height: 24,
                        cursor: 'pointer',
                        accentColor: energyColors.border,
                        flexShrink: 0
                      }}
                    />
                    <span style={{
                      fontSize: 16,
                      color: completedMicroSteps.has(idx) ? theme.sub : theme.text,
                      textDecoration: completedMicroSteps.has(idx) ? 'line-through' : 'none',
                      flex: 1,
                      fontWeight: completedMicroSteps.has(idx) ? 400 : 500,
                      transition: 'all 0.3s'
                    }}>
                      {idx + 1}. {step}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Andere taken - Verborgen/Dimmed (collapsed) */}
        {otherTasks.length > 0 && (
          <div style={{
            background: theme.card,
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            opacity: showOtherTasks ? 1 : 0.6,
            marginBottom: 32
          }}>
            <button
              onClick={() => setShowOtherTasks(!showOtherTasks)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 16,
                borderRadius: 12,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme.soft;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{
                fontSize: 16,
                fontWeight: 600,
                color: theme.text
              }}>
                {showOtherTasks ? '▼' : '▶'} Andere prioriteiten ({otherTasks.length})
              </span>
              <span style={{
                fontSize: 13,
                color: theme.sub
              }}>
                {showOtherTasks ? 'Verberg' : 'Toon'}
              </span>
            </button>

            {showOtherTasks && (
              <div style={{
                marginTop: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                {otherTasks.map((task: any) => {
                  const taskEnergyColors = getEnergyColor(task.energyLevel || 'medium');
                  return (
                    <div
                      key={task.id}
                      style={{
                        padding: 20,
                        background: theme.soft,
                        borderRadius: 12,
                        border: `1px solid ${taskEnergyColors.border}30`,
                        opacity: 0.8
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 8
                      }}>
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: taskEnergyColors.border
                        }} />
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: theme.sub,
                          textTransform: 'uppercase'
                        }}>
                          {task.priority === 2 ? 'BELANGRIJK' : 'EXTRA FOCUS'}
                        </span>
                        {task.duration && (
                          <span style={{
                            fontSize: 12,
                            color: theme.sub,
                            marginLeft: 'auto'
                          }}>
                            ⏱ {task.duration} min
                          </span>
                        )}
                      </div>
                      <h3 style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: theme.text,
                        margin: 0
                      }}>
                        {task.title}
                      </h3>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Volledige takenlijst onderaan */}
        <div style={{ marginTop: 48 }}>
          <TasksOverviewCalm />
        </div>
      </div>
    </AppLayout>
  );
}
