"use client";

import { useState, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import { createClient } from '../lib/supabase/client';
import { toast } from './Toast';
import { track } from '../shared/track';

interface DayStartCheckInProps {
  onComplete: () => void;
}

export default function DayStartCheckIn({ onComplete }: DayStartCheckInProps) {
  const { tasks } = useTasks();
  const [energyLevel, setEnergyLevel] = useState<string | null>(null);
  const [top3Tasks, setTop3Tasks] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Haal top 3 prioriteiten op
  useEffect(() => {
    const top3 = tasks
      .filter((t: any) => t.priority != null && !t.done && !t.not_today)
      .sort((a: any, b: any) => a.priority - b.priority)
      .slice(0, 3);
    setTop3Tasks(top3);
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
      const top3Ids = top3Tasks.map(t => t.id);

      // Sla check-in op
      const { error } = await supabase
        .from('daily_checkins')
        .upsert({
          user_id: user.id,
          date: today,
          energy_level: energyLevel,
          top3_task_ids: top3Ids,
        }, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;

      // Pas dagindeling aan op basis van energie
      if (energyLevel === 'low') {
        toast('💚 Rustige dag vandaag - focus op kleine taken');
      } else if (energyLevel === 'high') {
        toast('⚡ Hoge energie! Perfect voor uitdagende taken');
      } else {
        toast('🙂 Goede balans vandaag');
      }

      track('day_start_checkin', { energyLevel, top3Count: top3Tasks.length });
      onComplete();
    } catch (error: any) {
      console.error('Error saving check-in:', error);
      toast('Fout bij opslaan van check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const energyLevels = [
    { emoji: "😴", label: "Laag", value: "low", description: "Rustige taken vandaag" },
    { emoji: "🙂", label: "Oké", value: "medium", description: "Gewone taken" },
    { emoji: "⚡", label: "Hoog", value: "high", description: "Uitdagende taken" }
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
        🌅 Dagstart Check-in
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(47,52,65,0.75)', textAlign: 'center', marginBottom: 32 }}>
        Begin je dag met overzicht en focus
      </p>

      {/* Top 3 belangrijkste dingen */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Dit zijn je 3 belangrijkste dingen vandaag:
        </h3>
        {top3Tasks.length > 0 ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {top3Tasks.map((task, index) => (
              <div
                key={task.id}
                style={{
                  padding: 16,
                  background: index === 0 ? '#FEF2F2' : index === 1 ? '#FFFBEB' : '#F0F9FF',
                  border: `1px solid ${index === 0 ? '#FECACA' : index === 1 ? '#FDE68A' : '#BAE6FD'}`,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: index === 0 ? '#EF4444' : index === 1 ? '#F59E0B' : '#4A90E2',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 16
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
                  {task.duration && (
                    <div style={{ fontSize: 12, color: 'rgba(47,52,65,0.75)', marginTop: 4 }}>
                      ⏱ {task.duration} minuten
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: 24,
            background: '#F8FAFC',
            border: '1px dashed #E6E8EE',
            borderRadius: 12,
            textAlign: 'center',
            color: 'rgba(47,52,65,0.75)'
          }}>
            Nog geen prioriteiten ingesteld. Kies je top 3 in je takenlijst!
          </div>
        )}
      </div>

      {/* Energie selectie */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Hoe voel je je / energie?
        </h3>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {energyLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => setEnergyLevel(level.value)}
              style={{
                flex: 1,
                padding: 20,
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
              <div style={{ fontSize: 32 }}>{level.emoji}</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{level.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(47,52,65,0.75)' }}>{level.description}</div>
            </button>
          ))}
        </div>
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
        {isSubmitting ? 'Opslaan...' : 'Start mijn dag'}
      </button>
    </div>
  );
}

