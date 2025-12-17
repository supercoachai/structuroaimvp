"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTasks } from '../hooks/useTasks';
import { toast } from './Toast';
import { track } from '../shared/track';
import { saveCheckInToStorage, getTodayCheckIn } from '../lib/localStorageTasks';

interface DayStartCheckInProps {
  onComplete: () => void;
  existingCheckIn?: any; // Bestaande check-in data om te bewerken
}

export default function DayStartCheckIn({ onComplete, existingCheckIn }: DayStartCheckInProps) {
  const { tasks, addTask, fetchTasks, updateTask } = useTasks();
  const router = useRouter();
  const [energyLevel, setEnergyLevel] = useState<string | null>(existingCheckIn?.energy_level || null);
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
  // BELANGRIJK: Dit is ALLEEN voor UI weergave - taken worden NOOIT verwijderd uit de data!
  const getFilteredTasks = () => {
    if (!energyLevel) return [];
    
    // Filter: toon alleen taken ZONDER prioriteit (1, 2, 3) - taken met prioriteit staan al in de slots
    // Gebruik expliciete checks: !task.priority || task.priority === 0 || task.priority > 3
    const baseTasks = tasks.filter((t: any) => {
      // Basis validatie
      if (!t || !t.id || !t.title) return false;
      if (t.done || t.notToday || t.source === 'medication') return false;
      
      // BELANGRIJK: Toon alleen taken ZONDER prioriteit 1, 2 of 3
      // Taken met priority 1-3 staan al in de slots, niet in suggesties
      const hasPriority = t.priority != null && t.priority >= 1 && t.priority <= 3;
      if (hasPriority) return false;
      
      // Check of taak al in een slot staat (extra veiligheid)
      const isInSlot = Object.values(top3Tasks).some(slotTask => slotTask?.id === t.id);
      if (isInSlot) return false;
      
      return true;
    });

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
  const hasInitializedRef = React.useRef(false);
  const userHasInteractedRef = React.useRef(false); // Track of gebruiker heeft gesleept
  
  // Laad bestaande check-in data bij mount
  useEffect(() => {
    if (existingCheckIn && existingCheckIn.top3_task_ids && tasks.length > 0 && !hasInitializedRef.current) {
      // Laad taken uit bestaande check-in
      const slots: { [key: number]: any } = { 1: null, 2: null, 3: null };
      const taskIds = existingCheckIn.top3_task_ids;
      
      // Zoek taken op basis van IDs en zet ze in de juiste slots
      // Gebruik de priority van de taak in plaats van de index
      taskIds.forEach((taskId: string) => {
        const task = tasks.find((t: any) => t.id === taskId);
        if (task && task.priority && task.priority >= 1 && task.priority <= 3) {
          slots[task.priority] = task;
        }
      });
      
      // Als taken geen priority hebben, gebruik dan de volgorde in de array
      if (!Object.values(slots).some(t => t !== null)) {
        taskIds.forEach((taskId: string, index: number) => {
          const task = tasks.find((t: any) => t.id === taskId);
          if (task) {
            const slotNumber = index + 1; // 1, 2, of 3
            if (slotNumber >= 1 && slotNumber <= 3) {
              slots[slotNumber] = task;
            }
          }
        });
      }
      
      setTop3Tasks(slots);
      hasInitializedRef.current = true;
    }
  }, [existingCheckIn, tasks]);
  
  // BELANGRIJK: Sync top3Tasks met tasks array ALLEEN bij eerste load
  // Zodra de gebruiker een taak heeft gesleept, is top3Tasks de bron van waarheid
  // en wordt deze useEffect NIET MEER uitgevoerd
  useEffect(() => {
    // Skip als:
    // 1. We aan het updaten zijn (tijdens drag & drop operatie)
    // 2. De gebruiker heeft geïnterageerd (gesleept) - dan is top3Tasks de bron van waarheid
    // 3. Er is al een bestaande check-in geladen (die wordt in een andere useEffect geladen)
    // 4. We al geïnitialiseerd zijn
    if (isUpdating || userHasInteractedRef.current || existingCheckIn || hasInitializedRef.current) {
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
    
    // Vul slots op basis van priority - ELKE slot krijgt alleen taken met exact die priority
    const slots: { [key: number]: any } = { 1: null, 2: null, 3: null };
    top3.forEach((task) => {
      if (task && task.priority && task.priority >= 1 && task.priority <= 3 && task.id && task.title) {
        // Prioriteit 1 zone: alleen task.priority === 1
        if (task.priority === 1) slots[1] = task;
        // Prioriteit 2 zone: alleen task.priority === 2
        if (task.priority === 2) slots[2] = task;
        // Prioriteit 3 zone: alleen task.priority === 3
        if (task.priority === 3) slots[3] = task;
      }
    });
    
    // Update top3Tasks ALLEEN bij eerste load (als nog niet geïnitialiseerd)
    // Dit voorkomt dat we top3Tasks overschrijven tijdens de sessie
    const hasTasks = Object.values(slots).some(t => t !== null);
    if (hasTasks) {
      setTop3Tasks(slots);
      hasInitializedRef.current = true;
    }
  }, [tasks, isUpdating, existingCheckIn]);

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
      // STAP 1: Markeer dat gebruiker heeft geïnterageerd - VOORDAT we iets doen
      // Dit voorkomt dat useEffect top3Tasks nog update vanuit tasks array
      userHasInteractedRef.current = true;
      
      // STAP 2: Markeer dat we een optimistic update doen - VOORDAT we iets doen
      // Dit voorkomt dat useEffect interfereert
      setIsUpdating(true);
      
      // STAP 3: Optimistic update EERST - taak direct zichtbaar maken
      // BELANGRIJK: Gebruik functionele update om race conditions te voorkomen
      setTop3Tasks((prevTop3Tasks) => {
        const newTop3Tasks: { [key: number]: any } = { 1: null, 2: null, 3: null };
        
        // Kopieer bestaande taken (behalve de gesleepte taak)
        [1, 2, 3].forEach(num => {
          const existingTask = prevTop3Tasks[num];
          if (existingTask && existingTask.id && existingTask.id !== draggedTask.id) {
            newTop3Tasks[num] = existingTask;
          }
        });
        
        // Zet gesleepte taak in nieuwe slot - BEHOUD ALLE VELDEN, update alleen priority
        const taskWithPriority = { 
          ...draggedTask, // Behoud ALLE bestaande velden (title, duration, energyLevel, etc.)
          priority: slotNumber // Update ALLEEN priority
        };
        newTop3Tasks[slotNumber] = taskWithPriority;
        
        return newTop3Tasks;
      });
      
      // STAP 3: Verwijder oude prioriteit van de taak als die in een andere slot zat
      const oldSlot = Object.entries(top3Tasks).find(([_, task]) => task?.id === draggedTask.id)?.[0];
      if (oldSlot && oldSlot !== slotNumber.toString()) {
        await updateTask(draggedTask.id, { priority: null });
      }

      // STAP 4: Verwijder taak uit huidige slot als die al gevuld is met een andere taak
      if (top3Tasks[slotNumber] && top3Tasks[slotNumber].id !== draggedTask.id) {
        await updateTask(top3Tasks[slotNumber].id, { priority: null });
      }

      // STAP 5: VERIFICATIE - controleer of taak bestaat in localStorage
      const { getTasksFromStorage, addTaskToStorage } = await import('../lib/localStorageTasks');
      const tasksInStorage = getTasksFromStorage();
      const taskExists = tasksInStorage.find((t: any) => t.id === draggedTask.id);
      
      if (!taskExists) {
        console.error('❌ Task not found in localStorage:', draggedTask.id, draggedTask.title);
        // Taak bestaat niet - voeg toe aan localStorage
        const taskToAdd = {
          id: draggedTask.id,
          title: draggedTask.title,
          done: false,
          started: false,
          priority: slotNumber,
          dueAt: draggedTask.dueAt || null,
          duration: draggedTask.duration || null,
          source: draggedTask.source || 'regular',
          completedAt: null,
          reminders: draggedTask.reminders || [],
          repeat: draggedTask.repeat || 'none',
          impact: draggedTask.impact || '🌱',
          energyLevel: draggedTask.energyLevel || 'medium',
          estimatedDuration: draggedTask.estimatedDuration || null,
          microSteps: draggedTask.microSteps || [],
          notToday: false,
          created_at: draggedTask.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        addTaskToStorage(taskToAdd);
        console.log('✅ Task added to localStorage:', taskToAdd);
      } else {
        console.log('✅ Task exists in localStorage, updating priority');
      }
      
      // STAP 6: Zet nieuwe prioriteit - gebruik updateTask(taskId, { priority: slotNumber })
      // BELANGRIJK: Dit update ALLEEN priority, alle andere velden (zoals energyLevel) blijven behouden
      // De updateTask functie behoudt automatisch alle bestaande velden via updateTaskInStorage
      console.log(`🔄 DayStart: Updating task ${draggedTask.id} with priority ${slotNumber}`);
      await updateTask(draggedTask.id, { priority: slotNumber });
      
      // STAP 7: VERIFICATIE - controleer of taak correct is opgeslagen
      await new Promise(resolve => setTimeout(resolve, 200));
      const tasksAfterUpdate = getTasksFromStorage();
      const updatedTask = tasksAfterUpdate.find((t: any) => t.id === draggedTask.id);
      console.log('🔍 DayStart: Task after update in localStorage:', updatedTask ? {
        id: updatedTask.id,
        title: updatedTask.title,
        priority: updatedTask.priority,
        energyLevel: updatedTask.energyLevel
      } : 'NOT FOUND');
      
      // BELANGRIJK: Trigger expliciet een sync event zodat andere pagina's direct updaten
      // Dit zorgt ervoor dat TasksOverview en Focus Mode direct de nieuwe priority zien
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        console.log('🔄 DayStart: Sync event triggered');
      }
      
      // STAP 8: Haal taken opnieuw op - dit synchroniseert met localStorage
      // BELANGRIJK: fetchTasks haalt ALLE taken op, geen filtering!
      await fetchTasks();
      console.log('🔄 DayStart: fetchTasks completed');
      
      // STAP 9: Wacht even zodat fetchTasks volledig is doorgevoerd en tasks state is geüpdatet
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // STAP 9: Reset update flag - taak staat al in top3Tasks (optimistic update)
      // BELANGRIJK: top3Tasks is nu de bron van waarheid, niet meer tasks array
      // De useEffect zal top3Tasks niet meer overschrijven omdat userHasInteractedRef.current = true
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        setIsUpdating(false);
        updateTimeoutRef.current = null;
      }, 500); // Kortere delay - taak staat al in top3Tasks
      
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
      
      // Eerst: VERIFICATIE - controleer of taken bestaan in localStorage
      const { getTasksFromStorage } = await import('../lib/localStorageTasks');
      const tasksBeforeUpdate = getTasksFromStorage();
      const top3Ids = Object.values(top3Tasks)
        .filter(t => t !== null)
        .map(t => t.id);
      
      console.log('🔍 VOOR UPDATE - Taken in localStorage:', tasksBeforeUpdate.length);
      console.log('🔍 VOOR UPDATE - Top3 task IDs:', top3Ids);
      
      // Check of alle taken bestaan
      const missingTasks = top3Ids.filter(id => !tasksBeforeUpdate.find((t: any) => t.id === id));
      if (missingTasks.length > 0) {
        console.error('❌ MISSING TASKS:', missingTasks);
        toast(`Fout: ${missingTasks.length} ta(a)k(en) niet gevonden in opslag`);
        setIsSubmitting(false);
        return;
      }
      
      // KRITIEK: DIRECTE OPSLAG in localStorage - dit is de ENIGE manier om zeker te zijn dat taken blijven bestaan
      // Gebruik NIET updateTask omdat die async is en race conditions kan veroorzaken
      const { saveTasksToStorage, updateTaskInStorage } = await import('../lib/localStorageTasks');
      const allTasks = getTasksFromStorage();
      
      console.log('🔍 handleSubmit: Starting direct save. Total tasks in storage:', allTasks.length);
      console.log('🔍 handleSubmit: Top3 tasks to save:', top3Ids);
      
      // DIRECTE UPDATE: Update elke taak direct in de array
      const updatedTasks = allTasks.map((t: any) => {
        // Zoek of deze taak in top3Tasks staat
        const top3Entry = Object.entries(top3Tasks).find(([_, task]: any) => task && task.id === t.id);
        
        if (top3Entry) {
          const [slotNumber, task] = top3Entry;
          const priority = parseInt(slotNumber);
          
          console.log(`📝 DIRECT SAVE: Task ${t.id} (${t.title}) -> priority ${priority}`);
          
          // Behoud ALLE bestaande velden, update alleen priority, notToday en done
          return {
            ...t, // Behoud ALLES (title, energyLevel, duration, etc.)
            priority: priority,
            notToday: false,
            done: false,
            updated_at: new Date().toISOString()
          };
        }
        
        // Als taak NIET in top3Tasks staat maar WEL een priority 1-3 heeft, reset priority
        // Dit voorkomt dat oude prioriteiten blijven staan
        if (t.priority && t.priority >= 1 && t.priority <= 3 && !top3Ids.includes(t.id)) {
          console.log(`🔄 RESET: Task ${t.id} (${t.title}) priority ${t.priority} -> null (niet meer in top3)`);
          return {
            ...t,
            priority: null,
            updated_at: new Date().toISOString()
          };
        }
        
        return t;
      });
      
      // Voeg taken toe die nog niet bestaan (fallback)
      for (const [slotNumber, task] of Object.entries(top3Tasks)) {
        if (task && task.id) {
          const exists = updatedTasks.find((t: any) => t.id === task.id);
          if (!exists) {
            const priority = parseInt(slotNumber);
            console.log(`➕ ADD MISSING: Task ${task.id} (${task.title}) -> priority ${priority}`);
            updatedTasks.push({
              id: task.id,
              title: task.title,
              done: false,
              started: false,
              priority: priority,
              dueAt: task.dueAt || null,
              duration: task.duration || null,
              source: task.source || 'regular',
              completedAt: null,
              reminders: task.reminders || [],
              repeat: task.repeat || 'none',
              impact: task.impact || '🌱',
              energyLevel: task.energyLevel || 'medium',
              estimatedDuration: task.estimatedDuration || null,
              microSteps: task.microSteps || [],
              notToday: false,
              created_at: task.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      }
      
      // SLA DIRECT OP - dit is synchroon en gegarandeerd
      saveTasksToStorage(updatedTasks);
      console.log('💾 DIRECT SAVE COMPLETE: Saved', updatedTasks.length, 'tasks to localStorage');
      
      // VERIFICATIE: Controleer DIRECT of taken correct zijn opgeslagen
      const tasksAfterSave = getTasksFromStorage();
      const tasksWithPriority = tasksAfterSave.filter((t: any) => 
        t.priority != null && t.priority >= 1 && t.priority <= 3
      );
      
      console.log('✅ VERIFICATION: Tasks in localStorage:', tasksAfterSave.length);
      console.log('✅ VERIFICATION: Tasks with priority 1-3:', tasksWithPriority.map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        energyLevel: t.energyLevel
      })));
      
      // Check of alle taken nog steeds bestaan
      const stillMissing = top3Ids.filter(id => !tasksAfterSave.find((t: any) => t.id === id));
      if (stillMissing.length > 0) {
        console.error('❌ KRITIEKE FOUT: Taken verdwenen na directe opslag:', stillMissing);
        toast(`Fout: ${stillMissing.length} ta(a)k(en) verdwenen na opslaan`);
        setIsSubmitting(false);
        return;
      }
      
      // Wacht even zodat localStorage volledig is doorgevoerd
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Haal taken opnieuw op via fetchTasks om state te synchroniseren
      await fetchTasks();
      
      // Wacht nog even zodat fetchTasks volledig is doorgevoerd
      await new Promise(resolve => setTimeout(resolve, 200));

      // Sla check-in op in localStorage
      saveCheckInToStorage({
        user_id: 'local_user',
        date: today,
        energy_level: energyLevel,
        top3_task_ids: top3Ids.length > 0 ? top3Ids : null,
      });

      // BELANGRIJK: Trigger expliciet een sync event zodat alle pagina's direct updaten
      // Dit zorgt ervoor dat TasksOverview en Focus Mode direct de nieuwe prioriteiten zien
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        console.log('🔄 DayStart: Final sync event triggered');
      }

      // Pas dagindeling aan op basis van energie
      if (energyLevel === 'low') {
        toast('💚 Rustige dag vandaag - focus op kleine taken');
      } else if (energyLevel === 'high') {
        toast('⚡ Hoge energie! Perfect voor uitdagende taken');
      } else {
        toast('🙂 Goede balans vandaag');
      }

      track('day_start_checkin', { energyLevel, top3Count: filledSlots });
      
      // KRITIEK: Trigger MULTIPLE sync events VOORDAT we navigeren
      if (typeof window !== 'undefined') {
        // Event 1: Direct
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        console.log('🔄 DayStart: Sync event 1 triggered');
        
        // Event 2: Na korte delay
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
          console.log('🔄 DayStart: Sync event 2 triggered (delayed)');
        }, 100);
        
        // Event 3: Na langere delay
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
          console.log('🔄 DayStart: Sync event 3 triggered (delayed 2)');
        }, 300);
      }
      
      // Wacht zodat events zijn doorgevoerd
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🔄 DayStart: Navigating to /todo');
      router.push('/todo');
      
      // Event 4: NA navigatie (voor zekerheid)
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
          console.log('🔄 DayStart: Sync event 4 triggered AFTER navigation');
        }
      }, 1000);
      
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
          {userName ? `Dagstart van ${userName}` : existingCheckIn ? 'Bewerk je Dagstart' : 'Dagstart Check-in'}
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(47,52,65,0.75)', textAlign: 'center', marginBottom: 32 }}>
          {existingCheckIn ? 'Pas je prioriteiten en energie aan' : 'Start je dag met helderheid en rust'}
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
            {existingCheckIn ? 'Bewerk je focuspunten' : 'Kies je 3 belangrijkste focuspunten'}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(47,52,65,0.75)' }}>
            {existingCheckIn ? 'Pas je prioriteiten aan door taken te verplaatsen' : 'Sleep taken naar de juiste prioriteit'}
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
        {isSubmitting 
          ? 'Opslaan...' 
          : filledSlots === 0 
            ? 'Kies minimaal 1 prioriteit' 
            : existingCheckIn
              ? `✅ Wijzigingen opslaan (${filledSlots}/3)`
              : filledSlots < 3 
                ? `Je bent er klaar voor! (${filledSlots}/3)` 
                : '🎉 Start mijn dag'}
      </button>
    </div>
  );
}
