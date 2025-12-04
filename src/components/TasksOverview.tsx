"use client";

import React, { useMemo, useState, useEffect } from "react";
import TaskScheduleEditor from "./TaskScheduleEditor";
import { scheduleReminders, requestNotificationPermission, formatWhen, startTask, stopTask } from "./ReminderEngine";
import { useTaskShortcuts } from "../hooks/useTaskShortcuts";
import { toast } from "./Toast";
import { track } from "../shared/track";
import UserInsights from "./UserInsights";
import { useTasks } from "../hooks/useTasks";

/** ---- Calm theme: afstemmen met HomeCalm ---- */
const theme = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#2F3441",
  sub: "rgba(47,52,65,0.75)", // Iets donkerder voor betere leesbaarheid
  line: "#E6E8EE",
  accent: "#4A90E2",
  soft: "rgba(74,144,226,0.06)", // zachte spotlight achtergrond
};

/** --- Demo startdata (vervang met API/data store) --- */
const seed: any[] = [
  // Lege lijst - begin met schone lei
];

/** ---------- Natural Language Parsing ---------- */
function parseNaturalLanguage(input: string) {
  const timePatterns = [
    { regex: /morgen (\d{1,2}):(\d{2})/, action: 'tomorrow' },
    { regex: /over (\d+) uur/, action: 'hours' },
    { regex: /over (\d+) min/, action: 'minutes' },
    { regex: /vandaag (\d{1,2}):(\d{2})/, action: 'today' },
  ];

  for (const pattern of timePatterns) {
    const match = input.match(pattern.regex);
    if (match) {
      return { hasTime: true, pattern: pattern.action, match, regex: pattern.regex };
    }
  }

  return { hasTime: false };
}

/** ---------- Hoofdscherm ---------- */
export default function TasksOverviewCalm({ initialTasks = seed, onChange }: any) {
  const { tasks, loading, addTask: apiAddTask, updateTask: apiUpdateTask, deleteTask: apiDeleteTask, updateTasks: apiUpdateTasks, fetchTasks } = useTasks();
  const [newTitle, setNewTitle] = useState("");
  const [quickDate, setQuickDate] = useState<string>("");
  const [quickTime, setQuickTime] = useState<string>("");
  const [editing, setEditing] = useState<any>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isEditingDuration, setIsEditingDuration] = useState(false);

  // Vraag notificatie permissie bij app start
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Tasks worden nu via API geladen via useTasks hook

  const top3 = useMemo(
    () =>
      tasks
        .filter((t: any) => t.priority != null)
        .sort((a: any, b: any) => a.priority - b.priority)
        .slice(0, 3),
    [tasks]
  );
  const others = useMemo(
    () => tasks.filter((t: any) => !top3.some((p: any) => p.id === t.id) && !t.done && !t.notToday),
    [tasks, top3]
  );
  const notTodayTasks = useMemo(
    () => tasks.filter((t: any) => t.notToday && !t.done),
    [tasks]
  );
  const completed = useMemo(() => tasks.filter((t: any) => t.done), [tasks]);

  // Groepeer taken op type voor betere organisatie
  const interruptionTasks = useMemo(() => 
    others.filter((t: any) => t.source === 'interruption_hopper'),
    [others]
  );
  const remainderTasks = useMemo(() => 
    others.filter((t: any) => t.source === 'focus_remainder'),
    [others]
  );
  const regularTasks = useMemo(() => 
    others.filter((t: any) => !t.source || (t.source !== 'interruption_hopper' && t.source !== 'focus_remainder')),
    [others]
  );

  // Debug logging
  console.log('Debug - Tasks:', tasks);
  console.log('Debug - Top3:', top3);
  console.log('Debug - Others:', others);
  console.log('Debug - InterruptionTasks:', interruptionTasks);
  console.log('Debug - RemainderTasks:', remainderTasks);
  console.log('Debug - RegularTasks:', regularTasks);

  const update = async (next: any) => {
    // Filter duplicaten op basis van ID (uniek) en titel + source (voor legacy)
    const uniqueTasks = next.filter((task: any, index: number, arr: any[]) => {
      // Eerst check op ID (meest betrouwbaar)
      const existingById = arr.findIndex((t: any) => t.id === task.id);
      if (existingById !== index) return false;
      
      // Dan check op titel + source (voor legacy taken zonder ID)
      const key = `${task.title}-${task.source || 'regular'}`;
      const firstIndex = arr.findIndex((t: any) => `${t.title}-${t.source || 'regular'}` === key);
      return index === firstIndex;
    });
    
    // Sync met database via API
    try {
      await apiUpdateTasks(uniqueTasks);
    } catch (error) {
      console.error('Failed to update tasks:', error);
      toast('Fout bij opslaan van taken');
    }
    
    scheduleReminders(uniqueTasks); // Herplant herinneringen bij elke wijziging
    onChange?.(uniqueTasks);
  };

  // Eenmalig: verwijder geparkeerde gedachten uit bestaande data (test/legacy)
  const didCleanParkedRef = React.useRef(false);
  useEffect(() => {
    if (didCleanParkedRef.current || loading) return;
    const cleanup = async () => {
      try {
        const hasParked = tasks.some((t: any) => t.source === 'interruption_hopper');
        if (hasParked) {
          const cleaned = tasks.filter((t: any) => t.source !== 'interruption_hopper');
          await update(cleaned);
        }
        didCleanParkedRef.current = true;
      } catch {}
    };
    cleanup();
  }, [tasks, loading]);

  const addTask = async () => {
    const title = newTitle.trim();
    if (!title) return;

    const parsed = parseNaturalLanguage(title);
    let cleanTitle = title;
    let due: Date | null = null;

    // 1) Inline quick date/time heeft prioriteit
    if (quickDate || quickTime) {
      const base = quickDate ? new Date(`${quickDate}T00:00:00`) : new Date();
      const [hh, mm] = (quickTime || "09:00").split(":").map((s) => parseInt(s, 10));
      base.setHours(hh || 9, mm || 0, 0, 0);
      due = base;
    } else if (parsed.hasTime && (parsed as any).regex) {
      // 2) Fallback: natuurlijke taal uit titel
      cleanTitle = title.replace((parsed as any).regex, '').trim();
      if (parsed.pattern === 'tomorrow') {
        const [hours, minutes] = (parsed as any).match.slice(1).map(Number);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hours, minutes, 0, 0);
        due = tomorrow;
      } else if (parsed.pattern === 'hours') {
        const hours = parseInt((parsed as any).match[1]);
        const later = new Date();
        later.setHours(later.getHours() + hours);
        due = later;
      } else if (parsed.pattern === 'minutes') {
        const minutes = parseInt((parsed as any).match[1]);
        const later = new Date();
        later.setMinutes(later.getMinutes() + minutes);
        due = later;
      } else if (parsed.pattern === 'today') {
        const [hours, minutes] = (parsed as any).match.slice(1).map(Number);
        const today = new Date();
        today.setHours(hours, minutes, 0, 0);
        due = today;
      }
    }

    // Automatisch energie-niveau bepalen op basis van titel
    let energyLevel = 'medium';
    if (cleanTitle.toLowerCase().includes('belangrijk') || cleanTitle.toLowerCase().includes('urgent')) {
      energyLevel = 'high';
    } else if (cleanTitle.toLowerCase().includes('klein') || cleanTitle.toLowerCase().includes('snel')) {
      energyLevel = 'low';
    }

    // Automatisch duur schatten
    let estimatedDuration = 15; // default 15 min
    if (cleanTitle.toLowerCase().includes('mail') || cleanTitle.toLowerCase().includes('bericht')) {
      estimatedDuration = 5;
    } else if (cleanTitle.toLowerCase().includes('plan') || cleanTitle.toLowerCase().includes('vergadering')) {
      estimatedDuration = 30;
    }

    const newTask = {
      title: cleanTitle,
      duration: estimatedDuration,
      priority: null,
      done: false,
      dueAt: due ? due.toISOString() : null,
      reminders: [10],
      repeat: "none",
      impact: "🌱", // Standaard klein verschil
      energyLevel: energyLevel,
      estimatedDuration: estimatedDuration
    };
    
    try {
      await apiAddTask(newTask);
      setNewTitle(""); // dopamine: input leeg + taak fade-in
      setQuickDate("");
      setQuickTime("");
      
      // Toast notificatie
      if (due) {
        toast(`Taak toegevoegd voor ${formatWhen(due)}`);
      } else {
        toast("Taak toegevoegd");
      }
      
      // Track event
      track("task_add", { 
        source: "quick_input", 
        hasDueDate: !!due,
        energyLevel: energyLevel,
        estimatedDuration: estimatedDuration
      });
    } catch (error) {
      console.error('Failed to add task:', error);
      toast('Fout bij toevoegen van taak');
    }
  };

  const toggleDone = async (id: string, checked: boolean) => {
    const task = tasks.find((t: any) => t.id === id);
    if (!task) return;
    
    try {
      await apiUpdateTask(id, {
        done: checked,
        priority: checked ? null : task.priority,
        completedAt: checked ? new Date().toISOString() : undefined
      });
      
      if (checked) {
        // Confetti effect voor voltooide taken
        showConfetti();
        toast("🎉 Taak voltooid! Je bent geweldig!");
        track("task_done", { taskId: id });
      } else {
        toast("Taak hervat - je kunt dit!");
        track("task_undone", { taskId: id });
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast('Fout bij bijwerken van taak');
    }
  };

  // Confetti effect
  const showConfetti = () => {
    // Eenvoudige confetti met CSS
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;
    
    // Maak confetti elementen
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: ${['#EF4444', '#F59E0B', '#10B981', '#4A90E2', '#8B5CF6'][Math.floor(Math.random() * 5)]};
        left: ${Math.random() * 100}%;
        top: -10px;
        animation: confetti-fall 2s linear forwards;
        animation-delay: ${Math.random() * 2}s;
      `;
      confetti.appendChild(piece);
    }
    
    document.body.appendChild(confetti);
    
    // Verwijder na animatie
    setTimeout(() => {
      document.body.removeChild(confetti);
    }, 4000);
  };

  const removeTask = async (id: string) => {
    try {
      await apiDeleteTask(id);
      toast("Taak verwijderd");
      track("task_remove", { taskId: id });
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast('Fout bij verwijderen van taak');
    }
  };

  const convertToTask = async (id: string) => {
    const updatedTasks = tasks.map((t: any) => 
      t.id === id ? { ...t, source: undefined } : t
    );
    await update(updatedTasks);
    toast("Geparkeerde gedachte omgezet naar taak! 📝");
    track("task_convert", { taskId: id, from: "interruption_hopper" });
  };

  /** Promoot naar 1/2/3; verschuif anderen netjes mee */
  const setPriority = async (id: string, level: number) => {
    const cur = tasks.find((t: any) => t.id === id);
    if (!cur) return;
    
    // maak plek door taken op/na level één naar beneden te schuiven
    const bumped = tasks.map((t: any) => {
      if (t.id === id) return t;
      if (t.priority != null && t.priority >= level && t.priority < 3) {
        return { ...t, priority: t.priority + 1 };
      }
      return t;
    });
    
    // zet target op level en demote wie >3 is geworden
    const leveled = bumped.map((t: any) =>
      t.id === id ? { ...t, priority: level } : t.priority > 3 ? { ...t, priority: null } : t
    );
    
    await update(leveled);
    track(`priority_set_${level}`, { taskId: id });
  };

  const clearPriority = async (id: string) => {
    await update(tasks.map((t: any) => (t.id === id ? { ...t, priority: null } : t)));
  };

  // Start Focus Modus voor een taak
  const startFocus = (task: any) => {
    // Start task tracking voor reminders
    startTask({
      id: task.id,
      title: task.title,
      dueAt: task.dueAt,
      done: task.done,
      reminders: task.reminders || [],
      onNavigate: (t) => {
        const focusUrl = `/focus?task=${encodeURIComponent(t.title)}&duration=${task.duration || 15}&energy=${task.energyLevel || 'medium'}`;
        window.location.href = focusUrl;
      }
    });

    // Navigeer naar Focus Modus met taak info
    const focusUrl = `/focus?task=${encodeURIComponent(task.title)}&duration=${task.duration || 15}&energy=${task.energyLevel || 'medium'}`;
    window.location.href = focusUrl;
    
    // Positieve feedback
    toast("🚀 Focus sessie gestart! Je kunt dit!");
    track("focus_start", { 
      taskId: task.id, 
      duration: task.duration || 15,
      energyLevel: task.energyLevel || 'medium'
    });
  };

  // Toggle "niet vandaag" status
  const toggleNotToday = async (id: string, notToday: boolean) => {
    try {
      await apiUpdateTask(id, { notToday });
      // Refresh tasks na update om de lijst te updaten
      await fetchTasks();
      toast(notToday ? "📅 Taak verplaatst naar 'niet vandaag'" : "✅ Taak terug in je lijst");
      track("task_not_today_toggle", { taskId: id, notToday });
    } catch (error) {
      console.error('Failed to update task:', error);
      toast('Fout bij bijwerken van taak');
    }
  };

  // Keyboard shortcuts
  useTaskShortcuts({
    onAdd: addTask,
    onPromote1: () => selectedTaskId && setPriority(selectedTaskId, 1),
    onPromote2: () => selectedTaskId && setPriority(selectedTaskId, 2),
    onPromote3: () => selectedTaskId && setPriority(selectedTaskId, 3),
    onFocus: () => {
      const task = tasks.find((t: any) => t.id === selectedTaskId) || top3[0];
      if (task) startFocus(task);
    },
    onDelete: () => selectedTaskId && removeTask(selectedTaskId)
  });

  // Selecteer eerste taak in "Overige" als default
  useEffect(() => {
    if (others.length > 0 && !selectedTaskId) {
      setSelectedTaskId(others[0].id);
    }
  }, [others, selectedTaskId]);

  const updateTask = async (task: any) => {
    // Als de taak al bestaat, update deze direct
    if (task.id && tasks.some((t: any) => t.id === task.id)) {
      const updatedTasks = tasks.map((t: any) => 
        t.id === task.id ? task : t
      );
      await update(updatedTasks);
    } else {
      // Anders open de editor
      setEditing(task);
    }
  };

  // Functie om de volledige editor te openen
  const openTaskEditor = (task: any) => {
    setEditing(task);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        display: "grid",
        justifyContent: "center",
        padding: "28px 16px 64px",
      }}
    >
      {/* Confetti CSS */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>

      <main style={{ width: "min(720px, 92vw)", display: "grid", gap: 20 }}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Jouw dag in overzicht</div>
          <div style={{ fontSize: 14, color: theme.sub, marginTop: 6 }}>
            Eerst wat nú telt. De rest kan later.
          </div>
          
          {/* Micro-gamification: Progress bar voor "Dag voltooid" badge */}
          <div style={{ marginTop: 16, padding: "12px 16px", background: "linear-gradient(135deg, #F0F9FF, #E0F2FE)", border: "1px solid #BAE6FD", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0369A1" }}>
                🎯 Dag Voltooid Badge
              </div>
              <div style={{ fontSize: 12, color: "#0369A1" }}>
                {tasks.filter((t: any) => t.done).length}/3 taken
              </div>
            </div>
            <div style={{ width: "100%", height: 8, background: "#E0F2FE", borderRadius: 4, overflow: "hidden" }}>
              <div 
                style={{ 
                  height: "100%", 
                  background: "linear-gradient(90deg, #0EA5E9, #38BDF8)", 
                  borderRadius: 4,
                  width: `${Math.min(100, (tasks.filter((t: any) => t.done).length / 3) * 100)}%`,
                  transition: "width 0.5s ease",
                  boxShadow: "0 0 8px rgba(14, 165, 233, 0.3)"
                }}
              />
            </div>
            {tasks.filter((t: any) => t.done).length >= 3 && (
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "#0369A1", fontWeight: 600 }}>
                🏆 Gefeliciteerd! Je hebt je dag voltooid!
              </div>
            )}
          </div>
        </header>

        {/* Snel taak toevoegen */}
        <section style={card}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Nieuwe taak…"
                style={input}
                aria-label="Taak titel"
              />
              <input
                type="date"
                value={quickDate}
                onChange={(e) => setQuickDate(e.target.value)}
                aria-label="Datum"
                style={{ ...input, flex: undefined, width: 150 }}
              />
              <input
                type="time"
                value={quickTime}
                onChange={(e) => setQuickTime(e.target.value)}
                aria-label="Tijd"
                style={{ ...input, flex: undefined, width: 120 }}
              />
              <button onClick={addTask} style={buttonPrimary}>Toevoegen</button>
              <button 
                onClick={() => {
                  if (newTitle.trim()) {
                    const newTask = {
                      id: "t" + Math.random().toString(36).slice(2, 8),
                      title: newTitle.trim(),
                      duration: null,
                      priority: null,
                      done: false,
                      dueAt: null,
                      reminders: [10],
                      repeat: "none"
                    };
                    // Eerst de taak opslaan in de state
                    const updatedTasks = [newTask, ...tasks];
                    update(updatedTasks).catch(console.error);
                    setNewTitle("");
                    
                    // Dan de planning editor openen
                    setEditing(newTask);
                  }
                }}
                style={planningBtn}
                title="Toevoegen met planning"
              >
                🗓
              </button>
            </div>
            <div style={{ fontSize: 12, color: theme.sub, marginTop: 0 }}>
              💡 Snel: vul datum/tijd of typ natuurlijke taal bv. "morgen 15:00" / "over 2 uur".
            </div>
          </div>
        </section>

        {/* Top 3 Prioriteiten - Visuele Hiërarchie */}
        <section style={card}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, textAlign: 'center' as const }}>
            <span style={{ color: theme.accent }}>Prioriteiten voor Vandaag</span>
          </div>
          
          <div style={{ display: "grid", gap: 12 }}>
            {/* Prioriteit 1 - Moet vandaag */}
            <div style={{ ...spotlightWrap, border: "1px solid #EF4444", background: "#FEF2F2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <NumberBadge n={1} big />
                <div style={{ display: "grid", gap: 6, flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#EF4444", fontWeight: 700 }}>🔥 MOET VANDAAG</div>
                  {top3[0] ? (
                    <TaskInline
                      task={top3[0]}
                      checked={top3[0].done}
                      onToggle={(c: boolean) => toggleDone(top3[0].id, c)}
                      onRemove={() => removeTask(top3[0].id)}
                      onDemote={() => clearPriority(top3[0].id)}
                      onEdit={updateTask}
                      onStart={startFocus}
                      openTaskEditor={openTaskEditor}
                    />
                  ) : (
                    <EmptySlot text="Sleep hier je belangrijkste taak naartoe" />
                  )}
                </div>
              </div>
            </div>

            {/* Prioriteit 2 - Belangrijk */}
            <div style={{ ...spotlightWrap, border: "1px solid #F59E0B", background: "#FFFBEB" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <NumberBadge n={2} big />
                <div style={{ display: "grid", gap: 6, flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#F59E0B", fontWeight: 700 }}>⚡ BELANGRIJK</div>
                  {top3[1] ? (
                    <TaskInline
                      task={top3[1]}
                      checked={top3[1].done}
                      onToggle={(c: boolean) => toggleDone(top3[1].id, c)}
                      onRemove={() => removeTask(top3[1].id)}
                      onDemote={() => clearPriority(top3[1].id)}
                      onEdit={updateTask}
                      onStart={startFocus}
                      openTaskEditor={openTaskEditor}
                    />
                  ) : (
                    <EmptySlot text="Sleep hier je tweede prioriteit naartoe" />
                  )}
                </div>
              </div>
            </div>

            {/* Prioriteit 3 - Extra focus */}
            <div style={{ ...spotlightWrap, border: "1px solid #4A90E2", background: "#F0F9FF" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <NumberBadge n={3} big />
                <div style={{ display: "grid", gap: 6, flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#4A90E2", fontWeight: 700 }}>💡 EXTRA FOCUS</div>
                  {top3[2] ? (
                    <TaskInline
                      task={top3[2]}
                      checked={top3[2].done}
                      onToggle={(c: boolean) => toggleDone(top3[2].id, c)}
                      onRemove={() => removeTask(top3[2].id)}
                      onDemote={() => clearPriority(top3[2].id)}
                      onEdit={updateTask}
                      onStart={startFocus}
                      openTaskEditor={openTaskEditor}
                    />
                  ) : (
                    <EmptySlot text="Sleep hier je derde prioriteit naartoe" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Aanmoediging */}
          {top3.length === 0 ? (
            <div style={{ marginTop: 12, fontSize: 14, color: theme.sub, textAlign: 'center', padding: '20px' }}>
              Kies je eerste taak voor vandaag.
            </div>
          ) : (
            <div style={{ marginTop: 12, fontSize: 12, color: theme.sub }}>
              Tip: kies je eerste taak om mee te starten.
            </div>
          )}
        </section>

        {/* User Insights & Feedback Loop */}
        <UserInsights tasks={tasks} />

        {/* Debug info - tijdelijk om te zien wat er aan de hand is */}
        {tasks.length > 0 && (
          <section style={card}>
            <div style={{ fontSize: 12, color: theme.sub, marginBottom: 8 }}>
              Debug: Totaal {tasks.length} taken | Top3: {top3.length} | Others: {others.length} | NotToday: {notTodayTasks.length} | Done: {completed.length}
            </div>
          </section>
        )}

        {/* Geparkeerde Gedachten (altijd zichtbaar) */}
        <section style={card}>
          <div style={{ fontWeight: 600, fontSize: 14, color: theme.accent, marginBottom: 8 }}>
            📝 Geparkeerde Gedachten ({interruptionTasks.length})
          </div>
          {interruptionTasks.length === 0 ? (
            <div style={{ color: theme.sub, fontSize: 14, textAlign: 'center' as const, padding: '16px' }}>
              Nog niets geparkeerd.
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8 }}>
                {interruptionTasks.map((t: any) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    isSelected={t.id === selectedTaskId}
                    onSelect={() => setSelectedTaskId(t.id)}
                    onToggle={(c: boolean) => toggleDone(t.id, c)}
                    onRemove={() => removeTask(t.id)}
                    onPromoteTo1={() => setPriority(t.id, 1)}
                    onPromoteTo2={() => setPriority(t.id, 2)}
                    onPromoteTo3={() => setPriority(t.id, 3)}
                    onEdit={updateTask}
                    onStart={startFocus}
                    onConvertToTask={convertToTask}
                    openTaskEditor={openTaskEditor}
                    onClearPriority={() => clearPriority(t.id)}
                    onToggleNotToday={(notToday: boolean) => toggleNotToday(t.id, notToday)}
                  />
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: theme.sub }}>
                💡 Klik op "✓ Taak" om een gedachte om te zetten naar een echte taak
              </div>
            </>
          )}
        </section>

        {/* Overige taken (inklaps) */}
        <section style={card}>
          <Collapsible title={`Overige taken (${regularTasks.length + remainderTasks.length})`}>
            <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
              {(regularTasks.length + remainderTasks.length) === 0 ? (
                <div style={{ color: theme.sub, fontSize: 14, textAlign: 'center' as const, padding: '20px' }}>
                  Alles gedaan. Nice! 🎉
                </div>
              ) : (
                <>
                  {/* Resterende tijd taken */}
                  {remainderTasks.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: theme.accent, fontWeight: 600, marginBottom: 8 }}>
                        ⏱️ Resterende tijd
                      </div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {remainderTasks.map((t: any) => (
                          <TaskRow
                            key={t.id}
                            task={t}
                            isSelected={t.id === selectedTaskId}
                            onSelect={() => setSelectedTaskId(t.id)}
                            onToggle={(c: boolean) => toggleDone(t.id, c)}
                            onRemove={() => removeTask(t.id)}
                            onPromoteTo1={() => setPriority(t.id, 1)}
                            onPromoteTo2={() => setPriority(t.id, 2)}
                            onPromoteTo3={() => setPriority(t.id, 3)}
                            onEdit={updateTask}
                            onStart={startFocus}
                            onConvertToTask={convertToTask}
                            openTaskEditor={openTaskEditor}
                            onClearPriority={() => clearPriority(t.id)}
                            onToggleNotToday={(notToday: boolean) => toggleNotToday(t.id, notToday)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reguliere taken */}
                  {regularTasks.map((t: any) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      isSelected={t.id === selectedTaskId}
                      onSelect={() => setSelectedTaskId(t.id)}
                      onToggle={(c: boolean) => toggleDone(t.id, c)}
                      onRemove={() => removeTask(t.id)}
                      onPromoteTo1={() => setPriority(t.id, 1)}
                      onPromoteTo2={() => setPriority(t.id, 2)}
                      onPromoteTo3={() => setPriority(t.id, 3)}
                      onEdit={updateTask}
                      onStart={startFocus}
                      onConvertToTask={convertToTask}
                      openTaskEditor={openTaskEditor}
                      onClearPriority={() => clearPriority(t.id)}
                      onToggleNotToday={(notToday: boolean) => toggleNotToday(t.id, notToday)}
                    />
                  ))}
                </>
              )}
            </div>
          </Collapsible>
        </section>

        {/* Niet vandaag lijst */}
        {notTodayTasks.length > 0 && (
          <section style={card}>
            <Collapsible title={`📅 Niet vandaag (${notTodayTasks.length})`} defaultOpen={false}>
              <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                {notTodayTasks.map((t: any) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    isSelected={t.id === selectedTaskId}
                    onSelect={() => setSelectedTaskId(t.id)}
                    onToggle={(c: boolean) => toggleDone(t.id, c)}
                    onRemove={() => removeTask(t.id)}
                    onPromoteTo1={() => setPriority(t.id, 1)}
                    onPromoteTo2={() => setPriority(t.id, 2)}
                    onPromoteTo3={() => setPriority(t.id, 3)}
                    onEdit={updateTask}
                    onStart={startFocus}
                    onConvertToTask={convertToTask}
                    openTaskEditor={openTaskEditor}
                    onClearPriority={() => clearPriority(t.id)}
                    onToggleNotToday={(notToday: boolean) => toggleNotToday(t.id, notToday)}
                  />
                ))}
              </div>
            </Collapsible>
          </section>
        )}

        {/* Voltooid (optioneel zichtbaar) */}
        {completed.length > 0 && (
          <section style={card}>
            <Collapsible title={`Voltooid (${completed.length})`} defaultOpen={false}>
              <ul style={{ marginTop: 8, paddingLeft: 18, color: theme.sub, lineHeight: 1.7 }}>
                {completed.map((t: any) => (
                  <li key={t.id}>{t.title}</li>
                ))}
              </ul>
            </Collapsible>
          </section>
        )}

        {/* Schedule Editor Overlay */}
        {editing && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "20px"
          }}>
            <TaskScheduleEditor
              task={editing}
              onSave={async (tNext: any) => {
                const next = tasks.map((t: any) => (t.id === tNext.id ? tNext : t));
                await update(next);
              }}
              onClose={() => setEditing(null)}
            />
          </div>
        )}
      </main>
    </div>
  );
}

/** ---------- Subcomponenten ---------- */

function SpotlightCard({ number, label, task, onPromote, onDemote, onToggle, onRemove, onEdit, onStart }: any) {
  return (
    <div style={{ ...spotlightWrap }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <NumberBadge n={number} big />
        <div style={{ display: "grid", gap: 6, flex: 1 }}>
          <div style={{ fontSize: 12, color: theme.accent, fontWeight: 600 }}>{label}</div>
          {task ? (
            <TaskInline
              task={task}
              checked={task.done}
              onToggle={(c: boolean) => onToggle(task.id, c)}
              onRemove={() => onRemove(task.id)}
              onDemote={() => onDemote(task.id)}
              onEdit={onEdit}
              onStart={onStart}
            />
          ) : (
            <EmptySlot text="Sleep of promoot een taak naar 'Belangrijkst'" />
          )}
        </div>
      </div>
    </div>
  );
}

function PriorityRow({ number, label, task, onPromote, onDemote, onToggle, onRemove, onEdit, onStart }: any) {
  return (
    <div style={{ ...rowWrap }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <NumberBadge n={number} />
        <div style={{ display: "grid", gap: 6, flex: 1 }}>
          <div style={{ fontSize: 12, color: theme.sub, fontWeight: 600 }}>{label}</div>
          {task ? (
            <TaskInline
              task={task}
              checked={task.done}
              onToggle={(c: boolean) => onToggle(task.id, c)}
              onRemove={() => onRemove(task.id)}
              onDemote={() => onDemote(task.id)}
              onEdit={onEdit}
              onStart={onStart}
            />
          ) : (
            <EmptySlot text={`Voeg een taak toe aan #${number}`} />
          )}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, onRemove, onPromoteTo1, onPromoteTo2, onPromoteTo3, onEdit, onStart, onConvertToTask, openTaskEditor, onClearPriority, onToggleNotToday }: any) {
  const [showMicroSteps, setShowMicroSteps] = useState(false);
  const [newMicroStep, setNewMicroStep] = useState('');
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

  return (
    <div style={taskRow}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={`Taak: ${task.title}`}
        style={{ width: 18, height: 18, accentColor: theme.accent, cursor: "pointer" }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
        {task.duration ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <div style={{ fontSize: 11, color: theme.sub }}>⏱ {task.duration} min</div>
            {task.energyLevel && (
              <div
                style={{
                  fontSize: 9,
                  padding: "1px 3px",
                  borderRadius: 3,
                  background: getEnergyColor(task.energyLevel),
                  color: "white",
                  fontWeight: 600
                }}
                title={`Energie: ${getEnergyLabel(task.energyLevel)}`}
              >
                {getEnergyLabel(task.energyLevel).charAt(0)}
              </div>
            )}
          </div>
        ) : null}
        <TimeChip dueAt={task.dueAt} />
        {task.source === 'interruption_hopper' && (
          <div style={{ fontSize: 11, color: theme.accent, marginTop: 2 }}>
            📝 Geparkeerde gedachte
          </div>
        )}
        {/* Micro-stappen */}
        {task.micro_steps && task.micro_steps.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setShowMicroSteps(!showMicroSteps)}
              style={{
                fontSize: 11,
                color: theme.accent,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              {showMicroSteps ? '▼' : '▶'} {task.micro_steps.length} micro-stap{task.micro_steps.length !== 1 ? 'pen' : ''}
            </button>
            {showMicroSteps && (
              <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: `2px solid ${theme.accent}` }}>
                {task.micro_steps.map((step: string, idx: number) => (
                  <div key={idx} style={{ fontSize: 12, color: theme.sub, marginTop: 4 }}>
                    {idx + 1}. {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {task.source === 'interruption_hopper' ? (
          <>
            <button 
              title="Omzetten naar taak" 
              onClick={() => onConvertToTask(task.id)} 
              style={{
                ...iconBtn,
                background: theme.accent,
                color: 'white',
                border: `1px solid ${theme.accent}`,
                fontWeight: '600',
                fontSize: '12px'
              }}
            >
              ✓ Taak
            </button>
            <button title="Verwijder" onClick={onRemove} style={iconBtn}>×</button>
          </>
        ) : (
          <>
            <button title="Maak #1" onClick={onPromoteTo1} style={chipBtn}>1</button>
            <button title="Maak #2" onClick={onPromoteTo2} style={chipBtn}>2</button>
            <button title="Maak #3" onClick={onPromoteTo3} style={chipBtn}>3</button>
            <button 
              title="Prioriteit wissen" 
              onClick={() => onClearPriority(task.id)} 
              style={{
                ...iconBtn,
                background: '#6B7280',
                color: 'white',
                border: '1px solid #6B7280',
                fontSize: '12px',
                padding: '4px 8px'
              }}
            >
              ×
            </button>
            {onToggleNotToday && (
              <button 
                title={task.notToday ? "Terug naar vandaag" : "Niet vandaag"} 
                onClick={() => onToggleNotToday(!task.notToday)} 
                style={{
                  ...iconBtn,
                  background: task.notToday ? '#F59E0B' : '#F3F4F6',
                  color: task.notToday ? 'white' : theme.sub,
                  border: `1px solid ${task.notToday ? '#F59E0B' : '#E6E8EE'}`
                }}
              >
                📅
              </button>
            )}
            <button title="Planning" onClick={() => openTaskEditor(task)} style={iconBtn}>🗓</button>
            <button title="Verwijder" onClick={onRemove} style={iconBtn}>×</button>
            <button 
              title={`Start Focus ${task.duration || 3} min`} 
              onClick={() => onStart(task)} 
              style={{
                ...iconBtn,
                background: theme.accent,
                color: 'white',
                border: `1px solid ${theme.accent}`,
                fontWeight: '600'
              }}
            >
              ▶ {task.duration || 3}m
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TaskInline({ task, checked, onToggle, onRemove, onDemote, onEdit, onStart, openTaskEditor }: any) {
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [newDuration, setNewDuration] = useState(task.duration || 15);
  const [showHint, setShowHint] = useState(true);

  // Verberg hint na 3 keer gebruiken
  useEffect(() => {
    const hintCount = localStorage.getItem('duration_edit_hint_count') || '0';
    const count = parseInt(hintCount);
    if (count >= 3) {
      setShowHint(false);
    }
  }, []);

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

  const handleDurationChange = (newValue: number) => {
    // Update de taak met nieuwe duur
    const updatedTask = { ...task, duration: newValue };
    
    // Geef de bijgewerkte taak door aan de hoofdcomponent
    onEdit?.(updatedTask);
    
    setIsEditingDuration(false);
    
    // Verhoog hint counter
    const hintCount = localStorage.getItem('duration_edit_hint_count') || '0';
    const count = parseInt(hintCount) + 1;
    localStorage.setItem('duration_edit_hint_count', count.toString());
    
    if (count === 1) {
      toast("💡 Pro tip: Klik op de duur om deze aan te passen!");
    }
  };

  const getEnergyLevelFromDuration = (duration: number) => {
    if (duration <= 5) return 'low';
    if (duration <= 15) return 'medium';
    return 'high';
  };

  return (
    <div style={inlineTask(checked)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: theme.accent }}
      />
      
      <div style={{ flex: 1, display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 14, textDecoration: checked ? "line-through" : "none" }}>
          {task.title}
        </div>
        
        {/* Energie-tags en duur */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isEditingDuration ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(parseInt(e.target.value) || 5)}
                min="1"
                max="120"
                style={{
                  width: 50,
                  padding: "2px 4px",
                  borderRadius: 4,
                  border: "1px solid #D1D5DB",
                  fontSize: 10,
                  textAlign: "center"
                }}
              />
              <span style={{ fontSize: 10, color: "#6B7280" }}>min</span>
              <button
                onClick={() => handleDurationChange(newDuration)}
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#10B981",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                ✓
              </button>
              <button
                onClick={() => setIsEditingDuration(false)}
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#6B7280",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* Duur-tag */}
              <button
                onClick={() => setIsEditingDuration(true)}
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: getEnergyColor(getEnergyLevelFromDuration(task.duration || 15)),
                  color: "white",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: showHint ? "0 2px 4px rgba(0,0,0,0.1)" : "none"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = showHint ? "0 2px 4px rgba(0,0,0,0.1)" : "none";
                }}
                title="Klik om duur aan te passen"
              >
                {task.duration || 15} min
              </button>

              {/* Energie-tag */}
              <div
                style={{
                  fontSize: 9,
                  padding: "2px 4px",
                  borderRadius: 3,
                  background: getEnergyColor(task.energyLevel || 'medium'),
                  color: "white",
                  fontWeight: 600,
                  border: "none",
                  opacity: 0.8
                }}
                title={`Energie-niveau: ${getEnergyLabel(task.energyLevel || 'medium')}`}
              >
                {getEnergyLabel(task.energyLevel || 'medium').charAt(0)}
              </div>
              
              {/* Hint icoon voor eerste keer gebruik */}
              {showHint && (
                <button
                  onClick={() => {
                    toast("💡 Klik op de duur-tag om deze aan te passen!");
                    // Verberg hint na klikken
                    setShowHint(false);
                    localStorage.setItem('duration_edit_hint_count', '3');
                  }}
                  style={{
                    fontSize: 8,
                    color: "#6B7280",
                    opacity: 0.8,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 2,
                    borderRadius: 4,
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.color = "#4A90E2";
                    e.currentTarget.style.transform = "scale(1.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.8";
                    e.currentTarget.style.color = "#6B7280";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                  title="Klik hier voor uitleg over duur bewerken"
                >
                  💡
                </button>
              )}
            </div>
          )}
          
          {task.dueAt && (
            <TimeChip dueAt={task.dueAt} />
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {/* Start-knop */}
        <button
          title="Start deze taak"
          onClick={() => onStart?.(task)}
          style={{
            ...iconBtn,
            background: theme.accent,
            color: 'white',
            border: `1px solid ${theme.accent}`,
            fontWeight: '600',
            fontSize: '12px',
            padding: "6px 10px"
          }}
        >
          ▶ Start
        </button>

        {/* Bewerk-knop */}
        <button
          title="Bewerk deze taak (volledige editor)"
          onClick={() => openTaskEditor(task)}
          style={{
            ...iconBtn,
            background: "#F3F4F6",
            color: "#6B7280",
            border: "1px solid #D1D5DB"
          }}
        >
          ✏️
        </button>

        {/* Verwijder knop */}
        <button
          title="Verwijder"
          onClick={onRemove}
          style={iconBtn}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function TimeChip({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return null;
  
  const d = new Date(dueAt);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  let statusColor = theme.line; // normaal
  if (diffMins < 0) statusColor = "#EF4444"; // over-due
  else if (diffMins < 60) statusColor = "#F59E0B"; // bijna-due
  
  return (
    <span style={{ 
      fontSize: 11, 
      padding: "3px 8px", 
      border: `1px solid ${statusColor}`, 
      borderRadius: 999,
      color: statusColor,
      background: statusColor === theme.line ? "transparent" : `${statusColor}10`
    }}>
      {formatWhen(d)}
    </span>
  );
}
function NumberBadge({ n, big = false }: { n: number; big?: boolean }) {
  return (
    <div
      style={{
        width: big ? 36 : 28,
        height: big ? 36 : 28,
        borderRadius: 999,
        border: "2px solid " + theme.accent,
        display: "grid",
        placeItems: "center",
        color: theme.accent,
        fontWeight: 700,
        background: "#FFF",
      }}
    >
      {n}
    </div>
  );
}

function EmptySlot({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px dashed " + theme.line,
        color: theme.sub,
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

function Collapsible({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={collapseBtn}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
        <span style={{ color: theme.sub }}>{open ? "▴" : "▾"}</span>
      </button>
      <div
        style={{
          marginTop: open ? 10 : 0,
          maxHeight: open ? 1200 : 0,
          overflow: "hidden",
          transition: "max-height 260ms ease, margin-top 260ms ease",
        }}
      >
        {open && children}
      </div>
    </div>
  );
}
/** ---------- Stijlen ---------- */
const card = {
  background: theme.card,
  border: "1px solid " + theme.line,
  borderRadius: 14,
  padding: 14,
};

const input = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid " + theme.line,
  background: "#FFF",
  color: theme.text,
  outline: "none",
};

const buttonPrimary = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid " + theme.line,
  background: "#FFF",
  color: theme.text,
  cursor: "pointer",
  transition: "all 200ms ease",
  ":hover": {
    background: theme.soft,
    borderColor: theme.accent,
  }
};

const chipBtn = {
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid " + theme.line,
  background: "#FFF",
  color: theme.text,
  fontSize: 12,
  cursor: "pointer",
  transition: "all 200ms ease",
  ":hover": {
    background: theme.soft,
    borderColor: theme.accent,
  }
};

const iconBtn = {
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid " + theme.line,
  background: "#FFF",
  color: theme.sub,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 200ms ease",
  ":hover": {
    background: theme.soft,
    borderColor: theme.accent,
    color: theme.accent,
  }
};

const spotlightWrap = {
  border: "1px solid " + theme.line,
  borderRadius: 12,
  padding: 14,
  background: theme.soft, // zachte spotlight
};

const rowWrap = {
  border: "1px solid " + theme.line,
  borderRadius: 12,
  padding: 12,
  background: "#FFF",
};

const taskRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 12,
  border: "1px solid " + theme.line,
  borderRadius: 12,
  background: "#FFF",
};

const inlineTask = (checked: boolean) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 10,
  borderRadius: 10,
  border: "1px solid " + theme.line,
  background: "#FFF",
  opacity: checked ? 0.6 : 1,
  transition: "opacity 220ms ease, background 220ms ease",
});

const collapseBtn = {
  width: "100%",
  textAlign: "left" as const,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: 10,
  borderRadius: 10,
  border: "1px solid " + theme.line,
  background: "#FFF",
  color: theme.text,
  cursor: "pointer",
};

const planningBtn = {
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid " + theme.line,
  background: "#FFF",
  color: theme.accent,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 200ms ease",
  ":hover": {
    background: theme.soft,
    borderColor: theme.accent,
  }
};

const modalOverlay = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "20px",
};

const modalContent = {
  background: theme.card,
  borderRadius: 16,
  padding: 24,
  maxWidth: "500px",
  width: "100%",
  maxHeight: "90vh",
  overflow: "auto",
  boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
};


