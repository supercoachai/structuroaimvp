"use client";

import { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { createClient } from '../lib/supabase/client';
import { toast } from './Toast';
import { track } from '../shared/track';

interface DayShutdownProps {
  onComplete: () => void;
}

export default function DayShutdown({ onComplete }: DayShutdownProps) {
  const { tasks, updateTask } = useTaskContext();
  const [energyLevel, setEnergyLevel] = useState<string | null>(null);
  const [reflection, setReflection] = useState('');
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [tasksToMove, setTasksToMove] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Haal voltooide taken van vandaag op
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const completed = tasks.filter((t: any) => 
      t.done && 
      t.completedAt && 
      t.completedAt.startsWith(today)
    );
    setCompletedTasks(completed);

    // Haal openstaande taken op die naar morgen kunnen
    const openTasks = tasks.filter((t: any) => 
      !t.done && 
      !t.notToday &&
      (!t.priority || t.priority > 3)
    );
    setTasksToMove(openTasks);
  }, [tasks]);

  const handleSubmit = async () => {
    if (!energyLevel) {
      toast('Kies eerst je energie niveau');
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast('Je moet ingelogd zijn');
      setIsSubmitting(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const completedIds = completedTasks.map(t => t.id);
      const movedIds = tasksToMove.filter(t => t.selected).map(t => t.id);

      // Verplaats geselecteerde taken naar morgen (update due_at)
      for (const taskId of movedIds) {
        const task = tasks.find((t: any) => t.id === taskId);
        if (task) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          await updateTask(taskId, { dueAt: tomorrow.toISOString() });
        }
      }

      // Sla shutdown op
      const { error } = await supabase
        .from('daily_shutdowns')
        .upsert({
          user_id: user.id,
          date: today,
          completed_task_ids: completedIds,
          moved_to_tomorrow_task_ids: movedIds,
          energy_level: energyLevel,
          reflection: reflection.trim() || null,
        }, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;

      toast('✨ Dagafsluiter voltooid! Goede nacht en rust goed uit.');
      track('day_shutdown', { 
        energyLevel, 
        completedCount: completedTasks.length,
        movedCount: movedIds.length 
      });
      onComplete();
    } catch (error: any) {
      console.error('Error saving shutdown:', error);
      toast('Fout bij opslaan van dagafsluiter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTaskMove = (taskId: string) => {
    setTasksToMove(prev => prev.map(t => 
      t.id === taskId ? { ...t, selected: !t.selected } : t
    ));
  };

  const energyLevels = [
    { emoji: "😴", label: "Laag", value: "low" },
    { emoji: "🙂", label: "Oké", value: "medium" },
    { emoji: "⚡", label: "Hoog", value: "high" }
  ];

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E6E8EE',
      borderRadius: 16,
      padding: 32,
      maxWidth: 600,
      margin: '0 auto'
    }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
        🌙 Dagafsluiter
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(47,52,65,0.75)', textAlign: 'center', marginBottom: 32 }}>
        Sluit je dag af met rust en overzicht
      </p>

      {/* Wat is af? */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          ✅ Wat is af vandaag?
        </h3>
        {completedTasks.length > 0 ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {completedTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  padding: 12,
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: 8,
                  fontSize: 14
                }}
              >
                ✓ {task.title}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: 16,
            background: '#F8FAFC',
            border: '1px dashed #E6E8EE',
            borderRadius: 8,
            textAlign: 'center',
            color: 'rgba(47,52,65,0.75)',
            fontSize: 14
          }}>
            Geen taken voltooid vandaag. Dat is oké! Morgen is een nieuwe dag.
          </div>
        )}
      </div>

      {/* Wat neem je mee naar morgen? */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          📅 Wat neem je mee naar morgen?
        </h3>
        {tasksToMove.length > 0 ? (
          <div style={{ display: 'grid', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
            {tasksToMove.map((task) => (
              <label
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  background: task.selected ? '#F0F9FF' : '#FFFFFF',
                  border: `1px solid ${task.selected ? '#BAE6FD' : '#E6E8EE'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={task.selected || false}
                  onChange={() => toggleTaskMove(task.id)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ flex: 1, fontSize: 14 }}>{task.title}</span>
              </label>
            ))}
          </div>
        ) : (
          <div style={{
            padding: 16,
            background: '#F8FAFC',
            border: '1px dashed #E6E8EE',
            borderRadius: 8,
            textAlign: 'center',
            color: 'rgba(47,52,65,0.75)',
            fontSize: 14
          }}>
            Geen taken om naar morgen te verplaatsen.
          </div>
        )}
      </div>

      {/* Energie reflectie */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          💭 Hoe was je energie vandaag?
        </h3>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {energyLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => setEnergyLevel(level.value)}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 12,
                border: `2px solid ${energyLevel === level.value ? '#4A90E2' : '#E6E8EE'}`,
                background: energyLevel === level.value ? '#F0F9FF' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8
              }}
            >
              <div style={{ fontSize: 28 }}>{level.emoji}</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{level.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Reflectie */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          💡 1 minuut reflectie (optioneel)
        </h3>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Hoe voelde je dag? Wat ging goed? Wat kan beter?"
          style={{
            width: '100%',
            minHeight: 80,
            padding: 12,
            borderRadius: 8,
            border: '1px solid #E6E8EE',
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!energyLevel || isSubmitting}
        style={{
          width: '100%',
          padding: 16,
          borderRadius: 12,
          border: 'none',
          background: energyLevel && !isSubmitting ? '#4A90E2' : '#E6E8EE',
          color: energyLevel && !isSubmitting ? 'white' : 'rgba(47,52,65,0.5)',
          fontWeight: 600,
          fontSize: 16,
          cursor: energyLevel && !isSubmitting ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease'
        }}
      >
        {isSubmitting ? 'Opslaan...' : 'Sluit mijn dag af'}
      </button>
    </div>
  );
}

