"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTasks } from '../hooks/useTasks';
import { toast } from './Toast';
import { track } from '../shared/track';
import { saveCheckInToStorage, getTodayCheckIn } from '../lib/localStorageTasks';

interface DayStartCheckInProps {
  onComplete: () => void;
}

export default function DayStartCheckIn({ onComplete }: DayStartCheckInProps) {
  const { tasks, addTask, fetchTasks, updateTask } = useTasks();
  const router = useRouter();
  const [energyLevel, setEnergyLevel] = useState<string | null>(null);
  const [hoveredEnergyLevel, setHoveredEnergyLevel] = useState<string | null>(null);
  const [top3Tasks, setTop3Tasks] = useState<{ [key: number]: any }>({ 1: null, 2: null, 3: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedTask, setDraggedTask] = useState<any>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [energySelected, setEnergySelected] = useState(false);
  const [showSecondScreen, setShowSecondScreen] = useState(false);

  // Bereken complexiteit (1-5) en geef kleurgecodeerde indicator terug
  const getTaskComplexity = (task: any): { level: number; color: string; label: string } => {
    let complexity = 2; // default medium
    
    // Basis op energy_level
    if (task.energyLevel === 'low') complexity = 1;
    else if (task.energyLevel === 'high') complexity = 4;
    else if (task.energyLevel === 'medium') complexity = 2;
    
    // Aanpassen op basis van duration
    if (task.duration) {
      if (task.duration <= 15) complexity = Math.max(1, complexity - 1);
      else if (task.duration > 60) complexity = Math.min(5, complexity + 1);
      else if (task.duration > 90) complexity = 5;
    }
    
    const level = Math.max(1, Math.min(5, complexity));
    
    // Kleurgecodeerde indicator - matcht met prioriteitszones voor intuïtieve mapping
    if (level <= 2) {
      return { level, color: '#10B981', label: 'Laag' }; // Groen - past bij lage energie
    } else if (level === 3) {
      return { level, color: '#F59E0B', label: 'Normaal' }; // Oranje - matcht met zone 2 (BELANGRIJK)
    } else {
      return { level, color: '#EF4444', label: 'Hoog' }; // Rood - matcht met zone 1 (MOET VANDAAG)
    }
  };

  // Filter taken op basis van energie-niveau (PRIMAIR op energy_level veld)
  const getFilteredTasks = () => {
    if (!energyLevel) return [];
    
    // Filter: toon alleen taken ZONDER prioriteit (1, 2, 3) - taken met prioriteit staan al in de slots
    const top3TaskIds = new Set(
      Object.values(top3Tasks)
        .filter(t => t !== null && t.id)
        .map(t => t.id)
    );
    
    const baseTasks = tasks.filter((t: any) => 
      t &&
      t.id &&
      t.title &&
      !t.done && 
      !t.notToday && 
      t.source !== 'medication' &&
      (t.priority === null || t.priority === undefined || t.priority > 3) && // Geen prioriteit 1-3
      !top3TaskIds.has(t.id) // Niet al in een slot
    );

    // Filter op basis van energie-niveau EN complexiteit
    if (energyLevel === 'low') {
      // Bij lage energie: toon groene taken actief, oranje/rode als "voor later"
      const allTasks = baseTasks.map((t: any) => {
        const complexity = getTaskComplexity(t);
        return { task: t, complexity };
      });
      
      // Sorteer: groene eerst (actief), dan oranje/rode (voor later)
      const sorted = allTasks.sort((a: any, b: any) => {
        // Groene taken (<=2) eerst
        if (a.complexity.level <= 2 && b.complexity.level > 2) return -1;
        if (a.complexity.level > 2 && b.complexity.level <= 2) return 1;
        
        // Binnen groene taken: laagste complexiteit eerst
        if (a.complexity.level <= 2 && b.complexity.level <= 2) {
          if (a.complexity.level !== b.complexity.level) {
            return a.complexity.level - b.complexity.level;
          }
          const durA = a.task.duration || a.task.estimatedDuration || 999;
          const durB = b.task.duration || b.task.estimatedDuration || 999;
          return durA - durB;
        }
        
        // Binnen oranje/rode taken: ook sorteren
        return a.complexity.level - b.complexity.level;
      });
      
      // Toon alle taken (zowel actief als voor later)
      return sorted.map(item => item.task).slice(0, 10);
    } else if (energyLevel === 'high') {
      // Uitdagende taken: voorkeur voor hoge complexiteit (4-5 = Rood/Oranje)
      const allTasks = baseTasks.filter((t: any) => {
        if (t.energyLevel === 'high') return true;
        if (t.duration && t.duration > 60) return true;
        if (!t.energyLevel && !t.duration) return true;
        return false;
      });
      
      // Sorteer: complexiteit 4-5 eerst, dan de rest
      const sorted = allTasks.sort((a: any, b: any) => {
        const compA = getTaskComplexity(a);
        const compB = getTaskComplexity(b);
        if (compA.level >= 4 && compB.level < 4) return -1;
        if (compA.level < 4 && compB.level >= 4) return 1;
        return compB.level - compA.level; // Hoogste eerst
      });
      
      return sorted.slice(0, 8);
    } else {
      // Normaal: normale taken (medium energie of gemiddelde duur)
      return baseTasks.filter((t: any) => {
        if (t.energyLevel === 'medium') return true;
        if (t.energyLevel === 'low' && t.duration && t.duration <= 30) return true;
        if (t.duration && t.duration > 15 && t.duration <= 60) return true;
        if (!t.energyLevel && !t.duration) return true;
        return false;
      }).slice(0, 8);
    }
  };

  const filteredTasks = useMemo(() => getFilteredTasks(), [tasks, top3Tasks, energyLevel]);

  // Tel hoeveel slots gevuld zijn
  const filledSlots = Object.values(top3Tasks).filter(t => t !== null).length;

  // Haal gebruikersnaam op bij mount (uit localStorage)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('structuro_user_name');
      if (storedName) {
        setUserName(storedName.split(' ')[0]);
      }
    }
  }, []);

  // Haal bestaande prioriteiten op bij mount en bij wijzigingen
  const [isUpdating, setIsUpdating] = useState(false);
  const updateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Skip update als we net een optimistic update hebben gedaan
    if (isUpdating) {
      return;
    }
    
    // Filter taken met prioriteit 1, 2 of 3
    const top3 = tasks
      .filter((t: any) => 
        t && 
        t.id &&
        t.title &&
        t.priority != null && 
        t.priority >= 1 &&
        t.priority <= 3 && 
        !t.done && 
        !t.notToday && 
        t.source !== 'medication'
      )
      .sort((a: any, b: any) => a.priority - b.priority);
    
    // Vul slots op basis van priority
    const slots: { [key: number]: any } = { 1: null, 2: null, 3: null };
    top3.forEach((task) => {
      if (task && task.priority && task.priority >= 1 && task.priority <= 3 && task.id && task.title) {
        slots[task.priority] = task;
      }
    });
    
    // Update alleen als er echt iets veranderd is (voorkom onnodige re-renders)
    const currentIds = Object.values(slots)
      .map(t => t?.id)
      .filter(Boolean)
      .sort()
      .join(',');
    const previousIds = Object.values(top3Tasks)
      .map(t => t?.id)
      .filter(Boolean)
      .sort()
      .join(',');
    
    if (currentIds !== previousIds) {
      setTop3Tasks(slots);
    }
  }, [tasks, isUpdating]);

  // Fade-in animatie voor tweede scherm - MOET voor early return staan
  useEffect(() => {
    if (energyLevel) {
      // Kleine delay voor vloeiende overgang
      const timer = setTimeout(() => setShowSecondScreen(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowSecondScreen(false);
    }
  }, [energyLevel]);

  const handleDrop = async (slotNumber: number) => {
    if (!draggedTask || !draggedTask.id) {
      console.warn('No draggedTask in handleDrop');
      return;
    }

    try {
      // STAP 1: Verwijder oude prioriteit van de taak als die in een andere slot zat
      const oldSlot = Object.entries(top3Tasks).find(([_, task]) => task?.id === draggedTask.id)?.[0];
      if (oldSlot && oldSlot !== slotNumber.toString()) {
        // Verwijder prioriteit van oude slot
        await updateTask(draggedTask.id, { priority: null });
      }

      // STAP 2: Verwijder taak uit huidige slot als die al gevuld is met een andere taak
      if (top3Tasks[slotNumber] && top3Tasks[slotNumber].id !== draggedTask.id) {
        await updateTask(top3Tasks[slotNumber].id, { priority: null });
      }

      // STAP 3: Zet nieuwe prioriteit - dit slaat het op in localStorage
      // BELANGRIJK: Update alleen priority, behoud alle andere velden
      await updateTask(draggedTask.id, { priority: slotNumber });
      
      // STAP 4: Update state DIRECT (optimistic update) - dit zorgt dat de taak direct zichtbaar is
      const newTop3Tasks: { [key: number]: any } = { 1: null, 2: null, 3: null };
      
      // Kopieer bestaande taken (behalve de gesleepte taak)
      [1, 2, 3].forEach(num => {
        const existingTask = top3Tasks[num];
        if (existingTask && existingTask.id && existingTask.id !== draggedTask.id) {
          newTop3Tasks[num] = existingTask;
        }
      });
      
      // Zet gesleepte taak in nieuwe slot met priority - BEHOUD alle velden
      const taskWithPriority = { 
        ...draggedTask, // Behoud ALLE bestaande velden
        priority: slotNumber // Update alleen priority
      };
      newTop3Tasks[slotNumber] = taskWithPriority;
      
      // Markeer dat we een optimistic update doen (voorkom dat useEffect overschrijft)
      setIsUpdating(true);
      
      // Update state DIRECT - dit zorgt dat de taak direct zichtbaar is
      setTop3Tasks(newTop3Tasks);
      
      // STAP 5: Wacht even zodat de update is doorgevoerd in localStorage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // STAP 6: Haal taken opnieuw op - dit zorgt dat alles gesynchroniseerd is
      await fetchTasks();
      
      // STAP 7: Reset update flag na een delay zodat useEffect weer normaal werkt
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        setIsUpdating(false);
        updateTimeoutRef.current = null;
      }, 2000);
      
      // Visuele feedback
      setRecentlyAdded(draggedTask.id);
      setTimeout(() => setRecentlyAdded(null), 1000);
      setDraggedTask(null);
      setHoveredSlot(null);
      
      // Toast met duidelijke feedback
      const slotNames = {
        1: 'MOET VANDAAG',
        2: 'BELANGRIJK', 
        3: 'EXTRA FOCUS'
      };
      toast(`✅ Gefixeerd op Prioriteit ${slotNumber} (${slotNames[slotNumber as keyof typeof slotNames]})`);
      
    } catch (error) {
      console.error('Error in handleDrop:', error);
      toast('Fout bij toevoegen van taak. Probeer het opnieuw.');
      // Refresh om state te herstellen
      await fetchTasks();
      setIsUpdating(false);
    }
  };

  const handleRemoveFromSlot = async (slotNumber: number) => {
    const task = top3Tasks[slotNumber];
    
    if (!task || !task.id) {
      console.warn('No task to remove from slot', slotNumber);
      return;
    }

    try {
      // Update taak: verwijder prioriteit (taak gaat automatisch terug naar takenlijst)
      await updateTask(task.id, { priority: null });
      
      // Update state direct (optimistic update)
      const newTop3Tasks: { [key: number]: any } = { ...top3Tasks };
      newTop3Tasks[slotNumber] = null;
      setTop3Tasks(newTop3Tasks);
      
      // Markeer als updating om useEffect te voorkomen
      setIsUpdating(true);
      
      // Refresh taken - dit zorgt ervoor dat de taak terugkomt in de suggesties
      await fetchTasks();
      
      // Reset update flag
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        setIsUpdating(false);
        updateTimeoutRef.current = null;
      }, 500);
      
      toast('Prioriteit verwijderd - taak staat weer in je takenlijst');
    } catch (error) {
      console.error('Error in handleRemoveFromSlot:', error);
      toast('Fout bij verwijderen van prioriteit. Probeer het opnieuw.');
      // Herstel state bij error
      await fetchTasks();
    }
  };

  const handleSubmit = async () => {
    if (!energyLevel) {
      toast('Kies eerst je energie niveau');
      return;
    }

    if (filledSlots === 0) {
      toast('Kies minimaal 1 prioriteit om door te gaan');
      return;
    }

    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Eerst: zorg dat alle taken in top3Tasks de juiste prioriteit hebben
      // Doe dit in parallel voor betere performance
      const updatePromises = [];
      for (const [slotNumber, task] of Object.entries(top3Tasks)) {
        if (task && task.id) {
          const priority = parseInt(slotNumber);
          updatePromises.push(updateTask(task.id, { priority }));
        }
      }
      
      // Wacht tot alle updates klaar zijn
      await Promise.all(updatePromises);
      
      // Wacht even zodat localStorage updates zijn doorgevoerd
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Haal taken opnieuw op om zeker te zijn dat alles gesynchroniseerd is
      await fetchTasks();
      
      // Wacht nog even voor zekerheid
      await new Promise(resolve => setTimeout(resolve, 100));

      const top3Ids = Object.values(top3Tasks)
        .filter(t => t !== null)
        .map(t => t.id);

      // Sla check-in op in localStorage
      saveCheckInToStorage({
        user_id: 'local_user',
        date: today,
        energy_level: energyLevel,
        top3_task_ids: top3Ids.length > 0 ? top3Ids : null,
      });

      // Pas dagindeling aan op basis van energie
      if (energyLevel === 'low') {
        toast('💚 Rustige dag vandaag - focus op kleine taken');
      } else if (energyLevel === 'high') {
        toast('⚡ Hoge energie! Perfect voor uitdagende taken');
      } else {
        toast('🙂 Goede balans vandaag');
      }

      track('day_start_checkin', { energyLevel, top3Count: filledSlots });
      
      // Navigeer naar dashboard
      setTimeout(() => {
        router.push('/');
      }, 500);
    } catch (error: any) {
      console.error('Error saving check-in:', error);
      toast(`Fout bij opslaan: ${error?.message || 'Onbekende fout'}`);
      setIsSubmitting(false);
    }
  };

  const energyLevels = [
    { emoji: "😴", label: "Laag", value: "low", description: "Rustige taken vandaag", color: "#10B981", bgColor: "#EAF9EE" },
    { emoji: "🙂", label: "Normaal", value: "medium", description: "Gewone taken", color: "#F59E0B", bgColor: "#FFF9E6" },
    { emoji: "⚡", label: "Hoog", value: "high", description: "Uitdagende taken", color: "#F97316", bgColor: "#FFF3E0" }
  ];

  const getEnergyIntensity = (value: string) => {
    if (value === 'low') return 1;
    if (value === 'medium') return 2;
    return 3;
  };

  const slotConfig = [
    { number: 1, label: "MOET VANDAAG", description: "Dit is je belangrijkste taak vandaag", color: "#EF4444", bgColor: "#FEF2F2", borderColor: "#FECACA" },
    { number: 2, label: "BELANGRIJK", description: "Belangrijke maar niet-urgente taak", color: "#F59E0B", bgColor: "#FFFBEB", borderColor: "#FDE68A" },
    { number: 3, label: "EXTRA FOCUS", description: "Nice-to-have voor als je extra energie hebt", color: "#4A90E2", bgColor: "#F0F9FF", borderColor: "#BAE6FD" }
  ];

  // Als energie nog niet is gekozen, toon alleen energie-selectie
  if (!energyLevel) {
    return (
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E6E8EE',
        borderRadius: 16,
        padding: 32,
        maxWidth: 840,
        width: '100%',
        margin: '0 auto'
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: 'center', color: '#111827' }}>
          {userName ? `Dagstart van ${userName}` : 'Dagstart Check-in'}
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(47,52,65,0.75)', textAlign: 'center', marginBottom: 32 }}>
          Start je dag met helderheid en rust
        </p>

        {/* Energie selectie - EERST */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#111827' }}>
            Hoe voel jij je vandaag?
          </h3>
          <p style={{ fontSize: 12, color: 'rgba(47,52,65,0.6)', marginBottom: 16 }}>
            Op basis van je energie kiezen we de juiste taken om je dag soepel te starten
          </p>
          
          {/* Visuele schaal indicator */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: 12,
            padding: '0 8px'
          }}>
            <span style={{ fontSize: 10, color: 'rgba(47,52,65,0.5)' }}>Laag</span>
            <div style={{ 
              display: 'flex', 
              gap: 4, 
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
              margin: '0 12px',
              height: 4,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Achtergrond balk (grijs) */}
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: 4,
                borderRadius: 2,
                background: '#E6E8EE',
                zIndex: 0
              }} />
              {/* Progressieve neutrale balk - altijd lichtgrijs, alleen breedte verandert */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: 4,
                  borderRadius: 2,
                  background: '#D1D5DB', // Neutrale lichtgrijs - geen emotie-kleur
                  width: hoveredEnergyLevel === 'low' ? '33.33%' : 
                         hoveredEnergyLevel === 'medium' ? '66.66%' : 
                         hoveredEnergyLevel === 'high' ? '100%' : '0%',
                  transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 1,
                  opacity: hoveredEnergyLevel ? 0.8 : 0,
                  transform: 'translateZ(0)', // Hardware acceleration
                  willChange: 'width, opacity'
                }}
              />
            </div>
            <span style={{ fontSize: 10, color: 'rgba(47,52,65,0.5)' }}>Hoog</span>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {energyLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => {
                  setEnergyLevel(level.value);
                  setEnergySelected(true);
                  // Micro-feedback toast
                  const messages: { [key: string]: string } = {
                    low: '😴 Tijd voor een rustige start',
                    medium: '🙂 Goede balans vandaag',
                    high: '⚡ Energie geladen!'
                  };
                  toast(messages[level.value] || 'Energie gekozen');
                  // Reset animatie na 1 seconde
                  setTimeout(() => setEnergySelected(false), 1000);
                }}
                style={{
                  flex: 1,
                  padding: 20,
                  borderRadius: 12,
                  border: energyLevel === level.value ? `2px solid ${level.color}` : '2px solid #E6E8EE',
                  background: energyLevel === level.value ? level.bgColor : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  transform: energySelected && energyLevel === level.value ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: energyLevel === level.value ? `0 4px 12px ${level.color}30` : 'none'
                }}
                onMouseEnter={(e) => {
                  // Direct state update voor consistente visuele feedback
                  setHoveredEnergyLevel(level.value);
                  e.currentTarget.style.borderColor = level.color;
                  e.currentTarget.style.background = level.bgColor;
                }}
                onMouseLeave={(e) => {
                  // Direct reset voor snelle overgangen
                  setHoveredEnergyLevel(null);
                  e.currentTarget.style.borderColor = '#E6E8EE';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
              >
                <div style={{ fontSize: 32 }}>{level.emoji}</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{level.label}</div>
                <div style={{ fontSize: 11, color: '#555555', fontWeight: 500 }}>{level.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Als energie is gekozen, toon de taken-selectie
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E6E8EE',
      borderRadius: 16,
      padding: 32,
      maxWidth: 840,
      width: '100%',
      margin: '0 auto',
      opacity: showSecondScreen ? 1 : 0,
      transform: showSecondScreen ? 'translateY(0)' : 'translateY(10px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: '#111827' }}>
            Kies je 3 belangrijkste focuspunten
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(47,52,65,0.75)' }}>
            Sleep taken naar de juiste prioriteit
          </p>
        </div>
        {/* Progress indicator */}
        <div style={{
          padding: '8px 16px',
          borderRadius: 20,
          background: filledSlots === 3 ? '#ECFDF5' : '#F0F9FF',
          border: `2px solid ${filledSlots === 3 ? '#10B981' : '#4A90E2'}`,
          color: filledSlots === 3 ? '#10B981' : '#4A90E2',
          fontWeight: 700,
          fontSize: 14
        }}>
          {filledSlots === 3 ? '🎉 Klaar!' : `${filledSlots}/3`}
        </div>
      </div>

      {/* Energie indicator (klein) */}
      <div style={{ 
        marginBottom: 24, 
        padding: '8px 12px', 
        background: energyLevels.find(l => l.value === energyLevel)?.bgColor || '#F8F9FA',
        borderRadius: 8,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8
      }}>
        <span style={{ fontSize: 20 }}>
          {energyLevels.find(l => l.value === energyLevel)?.emoji}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(47,52,65,0.75)' }}>
          Energie: {energyLevels.find(l => l.value === energyLevel)?.label}
        </span>
        <button
          onClick={() => setEnergyLevel(null)}
          style={{
            marginLeft: 8,
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid rgba(47,52,65,0.2)',
            background: 'white',
            fontSize: 10,
            cursor: 'pointer',
            color: 'rgba(47,52,65,0.6)'
          }}
        >
          Wijzigen
        </button>
      </div>

      {/* Top 3 Buckets */}
      <div style={{ marginBottom: 36 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
          Sleep taken naar de juiste plek:
        </h3>
        <p style={{ fontSize: 12, color: 'rgba(47,52,65,0.6)', marginBottom: 20 }}>
          Kies 1-3 taken die je vandaag wilt doen. Begin met 1, de rest kan later.
        </p>
        
        <div style={{ display: 'grid', gap: 16 }}>
          {slotConfig.map((slot) => {
            const task = top3Tasks[slot.number];
            const isHovered = hoveredSlot === slot.number;
            const isEmpty = !task || !task.id;
            
            
            // Bij lage energie: alleen zone 1 (MOET VANDAAG) is actief
            const isLowEnergy = energyLevel === 'low';
            const shouldDisable = isLowEnergy && slot.number !== 1; // Disable zones 2 en 3 bij lage energie
            const opacity = shouldDisable ? 0.4 : 1;
            const pointerEvents = shouldDisable ? 'none' as const : 'auto' as const;
            
            return (
              <div
                key={slot.number}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedTask && !shouldDisable) {
                    setHoveredSlot(slot.number);
                  }
                }}
                onDragLeave={() => setHoveredSlot(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!shouldDisable) {
                    handleDrop(slot.number);
                  }
                }}
                style={{
                  minHeight: 90,
                  padding: 20,
                  background: isHovered ? slot.bgColor : isEmpty ? '#F8FAFC' : slot.bgColor,
                  border: `2px ${isEmpty ? 'dashed' : 'solid'} ${isHovered ? slot.color : slot.borderColor}`,
                  borderRadius: 12,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  opacity: opacity,
                  pointerEvents: pointerEvents,
                  transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isHovered ? `0 4px 12px ${slot.color}40` : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isEmpty ? 0 : 8 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: slot.color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 16,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {slot.number}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{slot.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(47,52,65,0.6)' }}>
                      {shouldDisable ? '💤 Niet beschikbaar bij lage energie' : slot.description}
                    </div>
                  </div>
                  {task && task.id && task.title && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveFromSlot(slot.number);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Voorkom drag events
                        e.stopPropagation();
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid #E6E8EE',
                        background: 'white',
                        color: '#6B7280',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        zIndex: 10,
                        position: 'relative',
                        lineHeight: 1,
                        minWidth: 24,
                        minHeight: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FEF2F2';
                        e.currentTarget.style.borderColor = '#FECACA';
                        e.currentTarget.style.color = '#DC2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#E6E8EE';
                        e.currentTarget.style.color = '#6B7280';
                      }}
                      title="Verwijder uit prioriteit"
                    >
                      ×
                    </button>
                  )}
                </div>

                {task && task.id && task.title ? (
                  <div style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 8,
                    border: '1px solid ' + slot.borderColor,
                    animation: recentlyAdded === task.id ? 'pulse 0.5s ease' : 'none',
                    minHeight: 50
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', wordBreak: 'break-word' }}>
                      {task.title}
                    </div>
                    {task.duration && (
                      <div style={{ fontSize: 12, color: 'rgba(47,52,65,0.75)', marginTop: 4 }}>
                        ⏱ {task.duration} minuten
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px 0',
                    color: shouldDisable ? 'rgba(47,52,65,0.3)' : 'rgba(47,52,65,0.5)',
                    fontSize: 12
                  }}>
                    {shouldDisable ? (
                      <span style={{ fontStyle: 'italic' }}>Niet beschikbaar bij lage energie</span>
                    ) : isHovered && draggedTask ? (
                      <span style={{ color: slot.color, fontWeight: 600, fontSize: 14 }}>↓ Laat hier los</span>
                    ) : (
                      <span>Sleep hier een taak naartoe</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Taak suggesties */}
      <div style={{ marginBottom: 36 }}>
        {filteredTasks.length > 0 ? (
          <>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
              Suggesties voor vandaag ({filteredTasks.length}):
            </h3>
            <p style={{ fontSize: 12, color: 'rgba(47,52,65,0.6)', marginBottom: 12 }}>
              Sleep een taak naar boven om deze als prioriteit in te stellen
            </p>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12
          }}>
            {filteredTasks.map((task) => {
              const complexity = getTaskComplexity(task);
              const isLowEnergy = energyLevel === 'low';
              const isForLater = isLowEnergy && complexity.level > 2; // Oranje/rode taken bij lage energie
              
              return (
                <div
                  key={task.id}
                  draggable={!isForLater} // Alleen groene taken zijn sleepbaar bij lage energie
                  onDragStart={() => {
                    if (!isForLater) {
                      setDraggedTask(task);
                    }
                  }}
                  onDragEnd={() => {
                    setDraggedTask(null);
                    setHoveredSlot(null);
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: isForLater ? '1px dashed #D1D5DB' : '1px solid #E6E8EE',
                    background: isForLater 
                      ? 'rgba(249, 250, 251, 0.5)' 
                      : recentlyAdded === task.id ? '#ECFDF5' : 'white',
                    cursor: isForLater ? 'not-allowed' : 'grab',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minHeight: 70,
                    opacity: isForLater ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isForLater) {
                      e.currentTarget.style.borderColor = '#4A90E2';
                      e.currentTarget.style.background = '#F0F9FF';
                      e.currentTarget.style.cursor = 'grabbing';
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(74, 144, 226, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isForLater) {
                      e.currentTarget.style.borderColor = '#E6E8EE';
                      e.currentTarget.style.background = recentlyAdded === task.id ? '#ECFDF5' : 'white';
                      e.currentTarget.style.cursor = 'grab';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {/* Titel met drag handle */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {!isForLater && (
                      <span style={{ fontSize: 16, userSelect: 'none', color: '#9CA3AF', lineHeight: 1.3, marginTop: 2 }}>⋮⋮</span>
                    )}
                    <span style={{ 
                      fontSize: 13, 
                      color: isForLater ? 'rgba(17, 24, 39, 0.5)' : '#111827', 
                      flex: 1, 
                      fontWeight: 500,
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      hyphens: 'auto'
                    }}>
                      {task.title}
                    </span>
                  </div>
                  
                  {/* Duur en complexiteit */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {task.duration && (
                        <span style={{ fontSize: 11, color: isForLater ? 'rgba(107, 114, 128, 0.5)' : 'rgba(47,52,65,0.6)', whiteSpace: 'nowrap' }}>
                          ⏱ {task.duration}m
                        </span>
                      )}
                      {isForLater && (
                        <span style={{ 
                          fontSize: 10, 
                          color: 'rgba(107, 114, 128, 0.7)',
                          fontStyle: 'italic',
                          padding: '2px 6px',
                          background: 'rgba(243, 244, 246, 0.8)',
                          borderRadius: 4
                        }}>
                          Voor later
                        </span>
                      )}
                    </div>
                    <span 
                      style={{ 
                        fontSize: 16, 
                        color: complexity.color,
                        lineHeight: 1,
                        userSelect: 'none',
                        marginLeft: 'auto',
                        opacity: isForLater ? 0.6 : 1
                      }} 
                      title={`Complexiteit: ${complexity.label} (${complexity.level}/5)`}
                    >
                      ●
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        ) : (
          <div style={{
            padding: 24,
            background: '#F8FAFC',
            borderRadius: 12,
            border: '1px dashed #E6E8EE',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>
              Geen suggesties beschikbaar
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>
              Voeg eerst taken toe aan je takenlijst
            </div>
          </div>
        )}
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!energyLevel || isSubmitting || filledSlots === 0}
        style={{
          width: '100%',
          padding: 16,
          borderRadius: 12,
          border: 'none',
          background: (energyLevel && filledSlots > 0 && !isSubmitting) ? '#10B981' : '#E6E8EE',
          color: (energyLevel && filledSlots > 0 && !isSubmitting) ? 'white' : 'rgba(47,52,65,0.5)',
          fontWeight: 600,
          fontSize: 16,
          cursor: (energyLevel && filledSlots > 0 && !isSubmitting) ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          boxShadow: (energyLevel && filledSlots > 0 && !isSubmitting) ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
        }}
      >
        {isSubmitting ? 'Opslaan...' : filledSlots === 0 ? 'Kies minimaal 1 prioriteit' : filledSlots < 3 ? `Je bent er klaar voor! (${filledSlots}/3)` : '🎉 Start mijn dag'}
      </button>
    </div>
  );
}
