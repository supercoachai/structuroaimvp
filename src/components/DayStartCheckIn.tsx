"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTaskContext } from '../context/TaskContext';
import { toast } from './Toast';
import { track } from '../shared/track';
import { useCheckIn } from '../hooks/useCheckIn';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface DayStartCheckInProps {
  onComplete: () => void;
  existingCheckIn?: any; // Bestaande check-in data om te bewerken (overschreven door useCheckIn)
}

export default function DayStartCheckIn({ onComplete, existingCheckIn }: DayStartCheckInProps) {
  const { tasks, addTask, fetchTasks, updateTask } = useTaskContext();
  const { checkIn: checkInFromDb, saveCheckIn } = useCheckIn();
  const router = useRouter();
  const [energyLevel, setEnergyLevel] = useState<string | null>(existingCheckIn?.energy_level ?? checkInFromDb?.energy_level ?? null);
  const [hoveredEnergyLevel, setHoveredEnergyLevel] = useState<string | null>(null);
  const [top3Tasks, setTop3Tasks] = useState<{ [key: number]: any }>({ 1: null, 2: null, 3: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedTask, setDraggedTask] = useState<any>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [energySelected, setEnergySelected] = useState(false);
  const [showSecondScreen, setShowSecondScreen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [priorityPickerTask, setPriorityPickerTask] = useState<any>(null);
  const isTouchDevice = useMediaQuery('(pointer: coarse)');

  // Helper: Get energie kleur (GELIJK AAN TasksOverview)
  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'low': return '#10B981'; // groen
      case 'medium': return '#F59E0B'; // oranje
      case 'high': return '#EF4444'; // rood
      default: return '#6B7280';
    }
  };

  // Helper: Get energie label (GELIJK AAN TasksOverview)
  const getEnergyLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Makkelijk';
      case 'medium': return 'Normaal';
      case 'high': return 'Moeilijk';
      default: return 'Onbekend';
    }
  };

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
      if (t.done || t.notToday || t.source === 'medication' || t.source === 'event') return false;
      
      // BELANGRIJK: Toon alleen taken ZONDER prioriteit 1, 2 of 3
      // Taken met priority 1-3 staan al in de slots, niet in suggesties
      // KRITIEK: Gebruik losse vergelijking (==) voor type-flexibiliteit
      const hasPriority = t.priority != null && t.priority != 0 && (t.priority == 1 || t.priority == 2 || t.priority == 3);
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
      // Bij hoge energie: toon ALLE taken, gesorteerd van moeilijk naar makkelijk
      const allTasks = baseTasks.map((t: any) => {
        const complexity = getTaskComplexity(t);
        return { task: t, complexity };
      });
      
      // Sorteer: hoogste complexiteit eerst (moeilijk → makkelijk)
      const sorted = allTasks.sort((a: any, b: any) => {
        // Eerst op complexiteit (hoogste eerst)
        if (a.complexity.level !== b.complexity.level) {
          return b.complexity.level - a.complexity.level;
        }
        // Bij gelijke complexiteit: langste duur eerst
        const durA = a.task.duration || a.task.estimatedDuration || 0;
        const durB = b.task.duration || b.task.estimatedDuration || 0;
        return durB - durA;
      });
      
      return sorted.map(item => item.task).slice(0, 10);
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

  // KRITIEK: Bereken max slots op basis van energie niveau
  const maxSlots = useMemo(() => {
    if (!energyLevel) return 3; // Default tot energie is gekozen
    if (energyLevel === 'low') return 1; // Alleen slot 1
    if (energyLevel === 'medium') return 2; // Slot 1 en 2
    return 3; // Alle slots bij high
  }, [energyLevel]);

  // Tel hoeveel slots gevuld zijn - ALLEEN beschikbare slots tellen
  const filledSlots = useMemo(() => {
    if (!energyLevel) return Object.values(top3Tasks).filter(t => t !== null).length;
    
    let count = 0;
    // Bij low: alleen slot 1
    if (energyLevel === 'low') {
      count = top3Tasks[1] !== null ? 1 : 0;
    }
    // Bij medium: slot 1 en 2
    else if (energyLevel === 'medium') {
      count = (top3Tasks[1] !== null ? 1 : 0) + (top3Tasks[2] !== null ? 1 : 0);
    }
    // Bij high: alle slots
    else {
      count = Object.values(top3Tasks).filter(t => t !== null).length;
    }
    
    return count;
  }, [top3Tasks, energyLevel]);

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
  
  // Sync energyLevel wanneer check-in uit DB/lokalStorage binnenkomt
  useEffect(() => {
    const source = checkInFromDb ?? existingCheckIn;
    if (source?.energy_level && energyLevel === null) {
      setEnergyLevel(source.energy_level);
    }
  }, [checkInFromDb?.energy_level, existingCheckIn?.energy_level]);

  // Laad bestaande check-in data bij mount (uit useCheckIn of existingCheckIn)
  useEffect(() => {
    const source = checkInFromDb ?? existingCheckIn;
    if (!source?.top3_task_ids?.length || hasInitializedRef.current) return;
      // Taken uit context (Supabase of localStorage)
      const allTasks = tasks;
      
      const slots: { [key: number]: any } = { 1: null, 2: null, 3: null };
      // KRITIEK: Zorg dat taskIds een array is
      let taskIds = source.top3_task_ids;
      if (!Array.isArray(taskIds)) {
        // Als het een string is (oude format), converteer naar array
        if (typeof taskIds === 'string') {
          try {
            taskIds = JSON.parse(taskIds);
          } catch {
            taskIds = [taskIds];
          }
        } else {
          taskIds = [];
        }
      }
      
      console.log('🔍 Loading existing check-in tasks:', taskIds, 'Type:', typeof taskIds, 'IsArray:', Array.isArray(taskIds));
      
      // Zoek taken op basis van IDs - eerst in localStorage, dan in tasks state
      taskIds.forEach((taskId: string, index: number) => {
        // Eerst zoeken in localStorage (volledige dataset)
        let task = allTasks.find((t: any) => t.id === taskId);
        
        // Als niet gevonden in localStorage, zoek in tasks state
        if (!task) {
          task = tasks.find((t: any) => t.id === taskId);
        }
        
        if (task) {
          // KRITIEK: Gebruik de volgorde in top3_task_ids array als slot nummer
          // Dit zorgt ervoor dat taken worden getoond in de juiste volgorde, zelfs als priority is gereset
          const slotNumber = index + 1; // 1, 2, of 3 op basis van volgorde in check-in
          
          // Als de taak nog een priority heeft die matcht, gebruik die (maar alleen als het klopt)
          // Anders gebruik de volgorde uit de check-in
          const finalSlotNumber = (task.priority && task.priority >= 1 && task.priority <= 3 && task.priority === slotNumber)
            ? task.priority 
            : slotNumber;
          
          if (finalSlotNumber >= 1 && finalSlotNumber <= 3) {
            // KRITIEK: Zet de priority expliciet terug als die ontbreekt, zodat de taak correct wordt getoond
            if (!task.priority || task.priority !== finalSlotNumber) {
              task = { ...task, priority: finalSlotNumber };
            }
            slots[finalSlotNumber] = task;
            console.log(`✅ Loaded task ${task.id} (${task.title}) into slot ${finalSlotNumber}`, {
              originalPriority: task.priority,
              slotNumber: finalSlotNumber,
              done: task.done
            });
          }
        } else {
          console.warn(`⚠️ Task ${taskId} not found in localStorage or tasks state`);
        }
      });
      
      // KRITIEK: Forceer re-render door state te updaten
      setTop3Tasks(slots);
      hasInitializedRef.current = true;
      console.log('✅ Loaded existing check-in:', slots);
      console.log('✅ top3Tasks state after set:', Object.keys(slots).map(k => ({ slot: k, task: slots[Number(k)]?.title || 'null' })));
      
      // KRITIEK: Trigger een re-render door fetchTasks aan te roepen
      // Dit zorgt ervoor dat de tasks array wordt geüpdatet en de UI wordt gerefresht
      fetchTasks().then(() => {
        console.log('✅ fetchTasks completed after loading existing check-in');
      });
  }, [checkInFromDb, existingCheckIn, tasks, fetchTasks]);
  
  // BELANGRIJK: Sync top3Tasks met tasks array ALLEEN bij eerste load
  // Zodra de gebruiker een taak heeft gesleept, is top3Tasks de bron van waarheid
  // en wordt deze useEffect NIET MEER uitgevoerd
  useEffect(() => {
    // Skip als:
    // 1. We aan het updaten zijn (tijdens drag & drop operatie)
    // 2. De gebruiker heeft geïnterageerd (gesleept) - dan is top3Tasks de bron van waarheid
    // 3. Er is al een bestaande check-in geladen (die wordt in een andere useEffect geladen)
    // 4. We al geïnitialiseerd zijn
    if (isUpdating || userHasInteractedRef.current || existingCheckIn || checkInFromDb || hasInitializedRef.current) {
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

  const handleDrop = async (slotNumber: number, taskOverride?: any) => {
    const taskToUse = taskOverride ?? draggedTask;
    if (!taskToUse || !taskToUse.id) {
      console.warn('No task in handleDrop');
      return;
    }

    try {
      // STAP 1: Markeer dat gebruiker heeft geïnterageerd - VOORDAT we iets doen
      // Dit voorkomt dat useEffect top3Tasks nog update vanuit tasks array
      userHasInteractedRef.current = true;
      
      // STAP 2: Markeer dat we een optimistic update doen - VOORDAT we iets doen
      // Dit voorkomt dat useEffect interfereert
      setIsUpdating(true);
      
      // STAP 2.5: Import localStorage helpers (één keer, voor de hele functie)
      const localStorageHelpers = await import('../lib/localStorageTasks');
      const { getTasksFromStorage, updateTaskInStorage, addTaskToStorage, saveTasksToStorage } = localStorageHelpers;
      
      // STAP 3: BELANGRIJK - Optimistic update EERST (zodat oude taak direct uit top3Tasks wordt verwijderd)
      // Dit zorgt ervoor dat getFilteredTasks de oude taak direct kan zien in suggesties
      const taskToRemove = top3Tasks[slotNumber] && top3Tasks[slotNumber].id !== taskToUse.id 
        ? top3Tasks[slotNumber] 
        : null;
      
      setTop3Tasks((prevTop3Tasks) => {
        const newTop3Tasks: { [key: number]: any } = { 1: null, 2: null, 3: null };
        
        // Kopieer bestaande taken (behalve de gesleepte taak EN de taak die uit deze slot wordt verwijderd)
        [1, 2, 3].forEach(num => {
          const existingTask = prevTop3Tasks[num];
          if (existingTask && existingTask.id && existingTask.id !== taskToUse.id) {
            // Als dit de slot is waar we een nieuwe taak in zetten, skip de oude taak
            if (num === slotNumber && taskToRemove && existingTask.id === taskToRemove.id) {
              return; // Skip - deze taak wordt verwijderd
            }
            newTop3Tasks[num] = existingTask;
          }
        });
        
        // Zet gesleepte taak in nieuwe slot - BEHOUD ALLE VELDEN, update alleen priority
        const taskWithPriority = { 
          ...taskToUse, // Behoud ALLE bestaande velden (title, duration, energyLevel, etc.)
          priority: slotNumber // Update ALLEEN priority
        };
        newTop3Tasks[slotNumber] = taskWithPriority;
        
        return newTop3Tasks;
      });
      
      // STAP 4: Verwijder de oude taak uit localStorage (priority = null) zodat deze terugkomt in suggesties
      // BELANGRIJK: Dit gebeurt NA de optimistic update, zodat getFilteredTasks de taak direct kan zien
      if (taskToRemove) {
        console.log(`🔄 Removing existing task from slot ${slotNumber}: ${taskToRemove.id} (${taskToRemove.title})`);
        
        try {
          // Check of taak bestaat in localStorage
          const tasksInStorage = getTasksFromStorage();
          const taskExists = tasksInStorage.find((t: any) => t.id === taskToRemove.id);
          
          if (taskExists) {
            // KRITIEK: Verifieer dat de taak nog bestaat VOORDAT we updaten
            console.log(`🔍 VOOR UPDATE - Task details:`, {
              id: taskExists.id,
              title: taskExists.title,
              priority: taskExists.priority,
              energyLevel: taskExists.energyLevel,
              duration: taskExists.duration,
              estimatedDuration: taskExists.estimatedDuration
            });
            
            // KRITIEK: Gebruik duration uit taskToRemove (state) als die bestaat, anders uit taskExists (localStorage)
            // Dit voorkomt dat duration verloren gaat
            const preservedDuration = taskToRemove.duration || taskToRemove.estimatedDuration || taskExists.duration || taskExists.estimatedDuration || null;
            const preservedEstimatedDuration = taskToRemove.estimatedDuration || taskExists.estimatedDuration || null;
            
            // Zet priority expliciet op null zodat taak terugkomt in suggesties
            // BELANGRIJK: Behoud ALLE andere velden (title, energyLevel, duration, etc.)
            // Expliciet duration en estimatedDuration behouden
            const updatedTask = updateTaskInStorage(taskToRemove.id, { 
              priority: null,
              duration: preservedDuration,
              estimatedDuration: preservedEstimatedDuration
            });
            
            if (updatedTask) {
              console.log(`✅ Task ${taskToRemove.id} teruggezet naar suggesties (priority = null)`, {
                id: updatedTask.id,
                title: updatedTask.title,
                priority: updatedTask.priority,
                energyLevel: updatedTask.energyLevel,
                duration: updatedTask.duration,
                estimatedDuration: updatedTask.estimatedDuration
              });
              
              // KRITIEK: Verifieer dat de taak nog steeds bestaat in localStorage NA update
              const tasksAfterUpdate = getTasksFromStorage();
              const taskStillExists = tasksAfterUpdate.find((t: any) => t.id === taskToRemove.id);
              if (!taskStillExists) {
                console.error(`❌ KRITIEKE FOUT: Task ${taskToRemove.id} verdwenen na update!`);
                // Probeer de taak terug te zetten met alle originele velden
                const taskToRestore = {
                  ...taskExists,
                  priority: null,
                  updated_at: new Date().toISOString()
                };
                const allTasks = getTasksFromStorage();
                allTasks.push(taskToRestore);
                saveTasksToStorage(allTasks);
                console.log(`✅ Task ${taskToRemove.id} hersteld in localStorage`);
              }
              
              // KRITIEK: Haal taken direct opnieuw op zodat tasks array wordt geüpdatet
              // Dit zorgt ervoor dat getFilteredTasks de taak direct kan zien (zonder priority)
              await fetchTasks();
              console.log(`✅ Tasks array geüpdatet - taak zou nu zichtbaar moeten zijn in suggesties`);
            } else {
              console.error(`❌ updateTaskInStorage returned null voor task ${taskToRemove.id}`);
            }
          } else {
            console.warn(`⚠️ Task ${taskToRemove.id} niet gevonden in localStorage, wordt overgeslagen`);
          }
        } catch (error) {
          console.error(`❌ Error removing task from slot ${slotNumber}:`, error);
          // Ga door - optimistic update is al gedaan
        }
      }
      
      // STAP 5: Verwijder oude prioriteit van de gesleepte taak als die in een andere slot zat
      const oldSlot = Object.entries(top3Tasks).find(([_, task]) => task?.id === taskToUse.id)?.[0];
      if (oldSlot && oldSlot !== slotNumber.toString()) {
        console.log(`🔄 Removing dragged task from old slot ${oldSlot}`);
        
        try {
          const tasksInStorage = getTasksFromStorage();
          const taskExists = tasksInStorage.find((t: any) => t.id === draggedTask.id);
          
          if (taskExists) {
            // KRITIEK: Behoud duration en estimatedDuration expliciet
            const preservedDuration = taskToUse.duration || taskToUse.estimatedDuration || taskExists.duration || taskExists.estimatedDuration || null;
            const preservedEstimatedDuration = taskToUse.estimatedDuration || taskExists.estimatedDuration || null;
            
            updateTaskInStorage(taskToUse.id, { 
              priority: null,
              duration: preservedDuration,
              estimatedDuration: preservedEstimatedDuration
            });
          } else {
            console.warn(`⚠️ Dragged task ${taskToUse.id} niet gevonden in localStorage`);
          }
        } catch (error) {
          console.error(`❌ Error removing dragged task from old slot:`, error);
        }
      }

      // STAP 6: VERIFICATIE - controleer of taak bestaat in localStorage
      // (getTasksFromStorage, updateTaskInStorage en addTaskToStorage zijn al geïmporteerd in STAP 2.5)
      const tasksInStorage = getTasksFromStorage();
      const taskExists = tasksInStorage.find((t: any) => t.id === taskToUse.id);
      
      if (!taskExists) {
        console.error('❌ Task not found in localStorage:', taskToUse.id, taskToUse.title);
        // Taak bestaat niet - voeg toe aan localStorage
        const taskToAdd = {
          id: taskToUse.id,
          title: taskToUse.title,
          done: false,
          started: false,
          priority: slotNumber,
          dueAt: taskToUse.dueAt || null,
          duration: taskToUse.duration || null,
          source: taskToUse.source || 'regular',
          completedAt: null,
          reminders: taskToUse.reminders || [],
          repeat: taskToUse.repeat || 'none',
          impact: taskToUse.impact || '🌱',
          energyLevel: taskToUse.energyLevel || 'medium',
          estimatedDuration: taskToUse.estimatedDuration || null,
          microSteps: taskToUse.microSteps || [],
          notToday: false,
          created_at: taskToUse.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        addTaskToStorage(taskToAdd);
        console.log('✅ Task added to localStorage:', taskToAdd);
      } else {
        console.log('✅ Task exists in localStorage, updating priority');
      }
      
      // STAP 7: Zet nieuwe prioriteit - gebruik updateTask(taskId, { priority: slotNumber })
      // BELANGRIJK: Dit update ALLEEN priority, alle andere velden (zoals energyLevel) blijven behouden
      // KRITIEK: Behoud energyLevel expliciet om te voorkomen dat deze verloren gaat
      const preservedEnergyLevel = taskToUse.energyLevel || 'medium';
      console.log(`🔄 DayStart: Updating task ${taskToUse.id} with priority ${slotNumber}, energyLevel: ${preservedEnergyLevel}`);
      await updateTask(taskToUse.id, { 
        priority: slotNumber,
        energyLevel: preservedEnergyLevel // Expliciet behouden
      });
      
      // STAP 8: VERIFICATIE - controleer of taak correct is opgeslagen
      await new Promise(resolve => setTimeout(resolve, 200));
      const tasksAfterUpdate = getTasksFromStorage();
      const updatedTask = tasksAfterUpdate.find((t: any) => t.id === taskToUse.id);
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
      
      // STAP 9: Haal taken opnieuw op - dit synchroniseert met localStorage
      // BELANGRIJK: fetchTasks haalt ALLE taken op, geen filtering!
      await fetchTasks();
      console.log('🔄 DayStart: fetchTasks completed');
      
      // STAP 10: Wacht even zodat fetchTasks volledig is doorgevoerd en tasks state is geüpdatet
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
      setRecentlyAdded(taskToUse.id);
      setTimeout(() => setRecentlyAdded(null), 1000);
      setDraggedTask(null);
      setHoveredSlot(null);
      setPriorityPickerTask(null);
      
      // Toast met duidelijke feedback
      const slotNames = {
        1: 'MOET VANDAAG',
        2: 'BELANGRIJK', 
        3: 'EXTRA FOCUS'
      };
      toast(`✅ Gefixeerd op Prioriteit ${slotNumber} (${slotNames[slotNumber as keyof typeof slotNames]})`);
      
    } catch (error) {
      console.error('❌ Error in handleDrop:', error);
      toast('Fout bij toevoegen van taak. Probeer het opnieuw.');
      
      // KRITIEK: Herstel state bij error - haal taken opnieuw op zodat niets verloren gaat
      try {
        await fetchTasks();
        
        // Herstel top3Tasks uit localStorage om te voorkomen dat taken verdwijnen
        const { getTasksFromStorage } = await import('../lib/localStorageTasks');
        const allTasks = getTasksFromStorage();
        const restoredTop3Tasks: { [key: number]: any } = { 1: null, 2: null, 3: null };
        
        for (let i = 1; i <= 3; i++) {
          const task = allTasks.find((t: any) => t.priority == i);
          if (task) {
            restoredTop3Tasks[i] = task;
          }
        }
        
        setTop3Tasks(restoredTop3Tasks);
        console.log('✅ State hersteld na error in handleDrop');
      } catch (restoreError) {
        console.error('❌ Error restoring state:', restoreError);
      }
      
      setIsUpdating(false);
      setDraggedTask(null);
      setHoveredSlot(null);
    }
  };

  const handleRemoveFromSlot = async (slotNumber: number) => {
    const task = top3Tasks[slotNumber];

    if (!task || !task.id) {
      console.warn('No task to remove from slot', slotNumber);
      return;
    }

    try {
      // Import localStorage helpers
      const { getTasksFromStorage, updateTaskInStorage } = await import('../lib/localStorageTasks');
      
      // Check of taak bestaat in localStorage
      const tasksInStorage = getTasksFromStorage();
      const taskExists = tasksInStorage.find((t: any) => t.id === task.id);
      
      if (taskExists) {
        // KRITIEK: Behoud duration en estimatedDuration expliciet
        const preservedDuration = task.duration || task.estimatedDuration || taskExists.duration || taskExists.estimatedDuration || null;
        const preservedEstimatedDuration = task.estimatedDuration || taskExists.estimatedDuration || null;
        
        // Update taak: verwijder prioriteit (taak gaat automatisch terug naar takenlijst)
        updateTaskInStorage(task.id, { 
          priority: null,
          duration: preservedDuration,
          estimatedDuration: preservedEstimatedDuration
        });
        console.log(`✅ Task ${task.id} priority verwijderd (terug naar suggesties)`, {
          duration: preservedDuration,
          estimatedDuration: preservedEstimatedDuration
        });
      } else {
        console.warn(`⚠️ Task ${task.id} niet gevonden in localStorage, wordt overgeslagen`);
      }

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
      console.error('❌ Error in handleRemoveFromSlot:', error);
      toast('Fout bij verwijderen van prioriteit. Probeer het opnieuw.');
      // Herstel state bij error
      try {
        await fetchTasks();
      } catch (restoreError) {
        console.error('❌ Error restoring state:', restoreError);
      }
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
      
      console.log('🔍 VOOR UPDATE - Taken in localStorage:', tasksBeforeUpdate.length);
      console.log('🔍 VOOR UPDATE - Top3Tasks state:', top3Tasks);
      console.log('🔍 VOOR UPDATE - Top3 tasks entries:', Object.entries(top3Tasks));
      
      // KRITIEK: Als top3Tasks leeg is, probeer taken uit localStorage te halen met priority 1-3
      let tasksToProcess: { [key: number]: any } = { ...top3Tasks };
      
      // Check of top3Tasks leeg is
      const hasTasksInState = Object.values(top3Tasks).some(t => t !== null && t !== undefined);
      
      if (!hasTasksInState && tasksBeforeUpdate.length > 0) {
        console.warn('⚠️ top3Tasks is leeg, probeer taken uit localStorage te halen met priority 1-3');
        // Haal taken uit localStorage met priority 1-3
        const tasksWithPriority = tasksBeforeUpdate.filter((t: any) => {
          const priorityNum = Number(t.priority);
          return !isNaN(priorityNum) && priorityNum >= 1 && priorityNum <= 3;
        });
        
        // Vul tasksToProcess met taken uit localStorage
        tasksWithPriority.forEach((task: any) => {
          const priorityNum = Number(task.priority);
          if (priorityNum >= 1 && priorityNum <= 3) {
            tasksToProcess[priorityNum] = task;
          }
        });
        
        console.log('🔍 Herstelde tasksToProcess uit localStorage:', tasksToProcess);
      }
      
      // KRITIEK: Filter null values en check dat we alleen task IDs hebben, geen slot numbers
      const top3Ids = Object.values(tasksToProcess)
        .filter((t: any) => {
          // Filter alleen echte task objects met een id property
          if (!t || typeof t !== 'object' || !t.id || typeof t.id !== 'string' || t.id.length === 0) {
            return false;
          }
          // Check of ID geen slot number is
          if (t.id.match(/^[1-3]$/)) {
            return false;
          }
          return true;
        })
        .map((t: any) => t.id);
      
      console.log('🔍 VOOR UPDATE - Top3 task IDs:', top3Ids);
      
      // Check of alle taken bestaan - als ze niet bestaan, voeg ze toe
      const missingTasks = top3Ids.filter(id => !tasksBeforeUpdate.find((t: any) => t.id === id));
      if (missingTasks.length > 0) {
        console.warn('⚠️ MISSING TASKS in localStorage, voeg ze toe:', missingTasks);
        
        // Voeg ontbrekende taken toe aan localStorage via directe manipulatie
        // KRITIEK: Gebruik saveTasksToStorage in plaats van addTaskToStorage om bestaande IDs te behouden
        const { saveTasksToStorage } = await import('../lib/localStorageTasks');
        const tasksToAdd: any[] = [];
        
        for (const missingId of missingTasks) {
          const taskInState = Object.values(tasksToProcess).find((t: any) => t && t.id === missingId);
          if (taskInState) {
            // Vind de slot number voor deze taak
            const slotEntry = Object.entries(tasksToProcess).find(([_, task]: any) => task && task.id === missingId);
            const slotNumber = slotEntry ? parseInt(String(slotEntry[0]), 10) : null;
            
            // KRITIEK: Behoud de bestaande ID - maak een volledige LocalTask
            const taskToAdd: any = {
              id: taskInState.id, // Behoud bestaande ID
              title: taskInState.title || 'Untitled Task',
              done: false,
              started: false,
              priority: slotNumber || taskInState.priority || null,
              dueAt: taskInState.dueAt || null,
              duration: taskInState.duration || null,
              source: taskInState.source || 'regular',
              completedAt: null,
              reminders: taskInState.reminders || [],
              repeat: taskInState.repeat || 'none',
              impact: taskInState.impact || '🌱',
              energyLevel: taskInState.energyLevel || 'medium',
              estimatedDuration: taskInState.estimatedDuration || null,
              microSteps: taskInState.microSteps || [],
              notToday: false,
              created_at: taskInState.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            tasksToAdd.push(taskToAdd);
            console.log('📝 Preparing to add missing task:', taskToAdd.id, taskToAdd.title);
          }
        }
        
        // Voeg alle ontbrekende taken toe via directe localStorage manipulatie
        if (tasksToAdd.length > 0) {
          try {
            const currentTasks = getTasksFromStorage();
            // Filter duplicaten (als een taak al bestaat, skip)
            const newTasks = tasksToAdd.filter(newTask => 
              !currentTasks.find((existing: any) => existing.id === newTask.id)
            );
            
            if (newTasks.length > 0) {
              const allTasksCombined = [...currentTasks, ...newTasks];
              saveTasksToStorage(allTasksCombined);
              console.log('✅ Added', newTasks.length, 'missing tasks to localStorage');
            } else {
              console.log('ℹ️ All tasks already exist in localStorage');
            }
          } catch (error) {
            console.error('❌ Error adding missing tasks to localStorage:', error);
            // Ga door - misschien bestaan de taken al
          }
        }
        
        // Herlaad taken na toevoegen
        const tasksAfterAdd = getTasksFromStorage();
        const stillMissing = missingTasks.filter(id => !tasksAfterAdd.find((t: any) => t.id === id));
        
        if (stillMissing.length > 0) {
          console.warn('⚠️ Kon sommige ontbrekende taken niet toevoegen:', stillMissing);
          console.warn('⚠️ Maar we gaan door met de beschikbare taken');
          // Filter top3Ids om alleen bestaande taken te gebruiken
          const existingTop3Ids = top3Ids.filter(id => tasksAfterAdd.find((t: any) => t.id === id));
          console.log('🔍 Using only existing tasks:', existingTop3Ids);
          // Update top3Ids om alleen bestaande taken te gebruiken
          top3Ids.length = 0;
          top3Ids.push(...existingTop3Ids);
        }
      }
      
      // KRITIEK: DIRECTE OPSLAG in localStorage - dit is de ENIGE manier om zeker te zijn dat taken blijven bestaan
      // Gebruik NIET updateTask omdat die async is en race conditions kan veroorzaken
      const { saveTasksToStorage, updateTaskInStorage } = await import('../lib/localStorageTasks');
      const allTasks = getTasksFromStorage();
      
      console.log('🔍 handleSubmit: Starting direct save. Total tasks in storage:', allTasks.length);
      console.log('🔍 handleSubmit: Top3 tasks to save:', top3Ids);
      
      // KRITIEK: Debug - toon top3Tasks met ALLE details
      console.log('🔍 handleSubmit: top3Tasks FULL:', top3Tasks);
      console.log('🔍 handleSubmit: top3Tasks entries:', Object.entries(top3Tasks).map(([slot, task]: any) => ({
        slot,
        slotType: typeof slot,
        taskId: task?.id,
        taskTitle: task?.title,
        taskPriority: task?.priority,
        taskPriorityType: typeof task?.priority,
        taskFull: task
      })));
      
      // KRITIEK: Check specifiek slot 1
      console.log('🔍 handleSubmit: top3Tasks[1] specifically:', {
        exists: top3Tasks[1] !== null && top3Tasks[1] !== undefined,
        task: top3Tasks[1],
        taskId: top3Tasks[1]?.id,
        taskTitle: top3Tasks[1]?.title
      });
      
      // DIRECTE UPDATE: Update elke taak direct in de array
      // Gebruik tasksToProcess in plaats van top3Tasks (kan leeg zijn)
      const updatedTasks = allTasks.map((t: any) => {
        // Zoek of deze taak in tasksToProcess staat
        const top3Entry = Object.entries(tasksToProcess).find(([_, task]: any) => task && task.id === t.id);
        
        // DEBUG: Log elke taak die we checken
        if (top3Entry) {
          console.log(`🔍 Checking task ${t.id} (${t.title}) - FOUND in top3Tasks at slot ${top3Entry[0]}`);
        }
        
        if (top3Entry) {
          const [slotNumber, taskFromState] = top3Entry;
          // KRITIEK: Forceer integer met parseInt(value, 10) - NUCLEAIRE fix
          const priorityStr = String(slotNumber);
          const priority = parseInt(priorityStr, 10);
          
          // KRITIEK: Verifieer dat priority een geldig nummer is
          if (isNaN(priority) || priority < 1 || priority > 3) {
            console.error(`❌ INVALID PRIORITY: slotNumber=${slotNumber}, priority=${priority}`);
            return t; // Return unchanged if invalid
          }
          
          console.log(`📝 DIRECT SAVE: Task ${t.id} (${t.title}) -> priority ${priority} (integer)`);
          console.log(`📝 EnergyLevel check: t.energyLevel=${t.energyLevel}, taskFromState.energyLevel=${taskFromState?.energyLevel}`);
          
          // KRITIEK: Gebruik energyLevel uit taskFromState (state) als die bestaat, anders uit t (localStorage)
          // Dit voorkomt dat energyLevel verloren gaat
          const preservedEnergyLevel = taskFromState?.energyLevel || t.energyLevel || 'medium';
          const preservedDuration = taskFromState?.duration || t.duration || null;
          
          // Behoud ALLE bestaande velden, update alleen priority, notToday en done
          // KRITIEK: Forceer integer met parseInt
          const updated = {
            ...t, // Behoud ALLES (title, duration, etc.)
            energyLevel: preservedEnergyLevel, // Behoud energyLevel expliciet
            duration: preservedDuration, // Behoud duration expliciet
            priority: priority, // ALTIJD integer
            notToday: false,
            done: false,
            updated_at: new Date().toISOString()
          };
          
          console.log(`✅ Updated task priority: ${updated.priority} (type: ${typeof updated.priority}), energyLevel: ${updated.energyLevel}, duration: ${updated.duration}`);
          return updated;
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
      // Gebruik tasksToProcess in plaats van top3Tasks
      for (const [slotNumber, task] of Object.entries(tasksToProcess)) {
        if (task && task.id) {
          const exists = updatedTasks.find((t: any) => t.id === task.id);
          if (!exists) {
            // KRITIEK: Forceer integer met parseInt(value, 10) - NUCLEAIRE fix
            const priorityStr = String(slotNumber);
            const priority = parseInt(priorityStr, 10);
            console.log(`➕ ADD MISSING: Task ${task.id} (${task.title}) -> priority ${priority} (integer)`);
            updatedTasks.push({
              id: task.id,
              title: task.title || 'Untitled Task',
              done: false,
              started: false,
              priority: priority, // ALTIJD integer
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
      const tasksWithPriority = tasksAfterSave.filter((t: any) => {
        if (!t.priority) return false;
        // KRITIEK: Gebruik losse vergelijking (==) voor type-flexibiliteit
        return t.priority == 1 || t.priority == 2 || t.priority == 3;
      });
      
      // KRITIEK: Check specifiek voor priority 1 (gebruik losse vergelijking ==)
      const priority1Task = tasksAfterSave.find((t: any) => {
        return t.priority == 1; // Losse vergelijking vangt "1" == 1 op
      });
      const priority1TaskStrict = tasksAfterSave.find((t: any) => t.priority === 1 && typeof t.priority === 'number');
      
      console.log('✅ VERIFICATION: Tasks in localStorage:', tasksAfterSave.length);
      console.log('✅ VERIFICATION: Tasks with priority 1-3:', tasksWithPriority.map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        priorityType: typeof t.priority,
        energyLevel: t.energyLevel
      })));
      console.log('🔍 VERIFICATION: Priority 1 task (loose):', priority1Task ? {
        id: priority1Task.id,
        title: priority1Task.title,
        priority: priority1Task.priority,
        priorityType: typeof priority1Task.priority
      } : 'NOT FOUND');
      console.log('🔍 VERIFICATION: Priority 1 task (strict number):', priority1TaskStrict ? {
        id: priority1TaskStrict.id,
        title: priority1TaskStrict.title,
        priority: priority1TaskStrict.priority
      } : 'NOT FOUND');
      
      // Toon ALLE taken met hun priority voor debugging
      console.log('🔍 VERIFICATION: ALL tasks with their priorities:', tasksAfterSave.map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        priorityType: typeof t.priority
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

      // Sla check-in op (Supabase bij ingelogde user, anders localStorage)
      await saveCheckIn({
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
    { emoji: "😴", label: "Laag", value: "low", description: "Rustige taken vandaag", hoverClass: "hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700", activeClass: "bg-blue-50 border-blue-200 text-blue-700" },
    { emoji: "🙂", label: "Normaal", value: "medium", description: "Gewone taken", hoverClass: "hover:bg-green-50 hover:border-green-200 hover:text-green-700", activeClass: "bg-green-50 border-green-200 text-green-700" },
    { emoji: "⚡", label: "Hoog", value: "high", description: "Uitdagende taken", hoverClass: "hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700", activeClass: "bg-orange-50 border-orange-200 text-orange-700" }
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
      <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8 mb-6 max-w-3xl mx-auto">
        {/* Pill-shaped progress bar + Stap 1 van 2 in header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-amber-300/80 transition-all duration-300" />
          </div>
          <span className="text-xs font-medium text-gray-500 flex-shrink-0">Stap 1 van 2</span>
        </div>

        <div className="space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-gray-900">
              {userName ? `Hoe voel je je vandaag, ${userName}?` : existingCheckIn ? 'Pas je energie aan' : 'Hoe voel je je vandaag?'}
            </h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Op basis van je energie kiezen we de juiste taken om je dag soepel te starten
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            {energyLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => {
                  setEnergyLevel(level.value);
                  setEnergySelected(true);
                  setShowConfirmation(true);
                  const messages: { [key: string]: string } = {
                    low: '😴 Tijd voor een rustige start',
                    medium: '🙂 Goede balans vandaag',
                    high: '⚡ Energie geladen!'
                  };
                  toast(messages[level.value] || 'Energie gekozen');
                  setTimeout(() => setEnergySelected(false), 1000);
                  setTimeout(() => setShowConfirmation(false), 2000);
                }}
                className={`rounded-2xl flex flex-col items-center justify-center p-4 sm:p-5 min-h-[140px] sm:min-h-[150px] border-2 transition-all duration-300 ${
                  energyLevel === level.value ? level.activeClass : `bg-gray-50 border-transparent ${level.hoverClass}`
                } ${energySelected && energyLevel === level.value ? 'scale-[1.02]' : 'scale-100'}`}
                onMouseEnter={() => setHoveredEnergyLevel(level.value)}
                onMouseLeave={() => setHoveredEnergyLevel(null)}
              >
                <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center shadow-sm mb-2">
                  <span className="text-5xl">{level.emoji}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <span className={`text-lg font-bold ${energyLevel === level.value ? '' : 'text-gray-900'}`}>{level.label}</span>
                  <span className="text-xs text-gray-500">{level.description}</span>
                </div>
              </button>
            ))}
          </div>

          {showConfirmation && energyLevel && (
            <p className="text-center text-sm text-blue-600/90 transition-opacity duration-300">
              ✔️ Helder. We stemmen je dag hierop af.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Als energie is gekozen, toon de taken-selectie
  return (
    <div
      className={`bg-white rounded-3xl shadow-sm p-12 mb-8 max-w-3xl mx-auto transition-all duration-400 ${
        showSecondScreen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Pill-shaped progress bar + Stap 2 van 2 in header */}
      <div className="flex items-center justify-between gap-4 mb-10">
        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-300/80 transition-all duration-500"
            style={{ width: `${(filledSlots / maxSlots) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-500 flex-shrink-0">Stap 2 van 2</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {existingCheckIn ? 'Bewerk je focuspunten' :
             energyLevel === 'low' ? 'Kies je belangrijkste focuspunt' :
             energyLevel === 'medium' ? 'Kies je 2 belangrijkste focuspunten' :
             'Kies je 3 belangrijkste focuspunten'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {existingCheckIn ? 'Pas je prioriteiten aan door taken te verplaatsen' : 'Sleep taken naar de juiste prioriteit'}
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold ${
          filledSlots === maxSlots ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
        }`}>
          {filledSlots === maxSlots ? '🎉 Klaar!' : `${filledSlots}/${maxSlots}`}
        </div>
      </div>

      {/* Energie indicator – zachte stijl */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-50 mb-8">
        <span className="text-lg">{energyLevels.find(l => l.value === energyLevel)?.emoji}</span>
        <span className="text-sm text-gray-600">Energie: {energyLevels.find(l => l.value === energyLevel)?.label}</span>
        <button
          onClick={() => setEnergyLevel(null)}
          className="ml-2 text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
        >
          Wijzigen
        </button>
      </div>

      {/* Top 3 Buckets */}
      <div className="mb-10">
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          {existingCheckIn ? 'Je focus voor vandaag:' : 'Sleep taken naar de juiste plek:'}
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {existingCheckIn
            ? 'Dit zijn de taken die je vandaag hebt gekozen. Je kunt ze nog aanpassen.'
            : 'Kies 1-3 taken die je vandaag wilt doen. Begin met 1, de rest kan later.'}
        </p>

        <div className="grid gap-4">
          {slotConfig.map((slot) => {
            const task = top3Tasks[slot.number];
            const isHovered = hoveredSlot === slot.number;
            // KRITIEK: Check of task bestaat en geldig is (ook als voltooid)
            const isEmpty = !task || !task.id || !task.title;
            
            // Debug logging voor bestaande check-in
            if (existingCheckIn && slot.number <= 3) {
              console.log(`🔍 Slot ${slot.number}:`, {
                task: task ? { id: task.id, title: task.title, done: task.done, priority: task.priority } : 'null',
                isEmpty,
                top3TasksKeys: Object.keys(top3Tasks),
                top3TasksValues: Object.values(top3Tasks).map(t => t?.title || 'null')
              });
            }
            
            
            // Bepaal welke slots beschikbaar zijn op basis van energie-niveau
            // Lage energie: alleen slot 1
            // Normale energie: slot 1 en 2
            // Hoge energie: alle slots (1, 2, 3)
            const isLowEnergy = energyLevel === 'low';
            const isMediumEnergy = energyLevel === 'medium';
            const shouldDisable = (isLowEnergy && slot.number !== 1) || (isMediumEnergy && slot.number === 3);
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
                className="rounded-2xl transition-all duration-200"
                style={{
                  minHeight: 90,
                  padding: 20,
                  background: isHovered ? slot.bgColor : isEmpty ? '#F8FAFC' : slot.bgColor,
                  border: `2px ${isEmpty ? 'dashed' : 'solid'} ${isHovered ? slot.color : slot.borderColor}`,
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
                      {shouldDisable ? (
                        isLowEnergy ? '💤 Niet beschikbaar bij lage energie' : 
                        '💤 Niet beschikbaar bij normale energie'
                      ) : slot.description}
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
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 text-sm font-semibold transition-colors"
                      title="Verwijder uit prioriteit"
                    >
                      ×
                    </button>
                  )}
                </div>

                {task && task.id && task.title ? (
                  <div
                    className={`p-4 rounded-2xl bg-white min-h-[50px] ${recentlyAdded === task.id ? 'animate-pulse' : ''}`}
                    style={{
                      border: `1px solid ${slot.borderColor}`,
                      opacity: task.done ? 0.7 : 1,
                    }}
                  >
                    <div style={{ 
                      fontWeight: 600, 
                      fontSize: 14, 
                      color: task.done ? 'rgba(17, 24, 39, 0.6)' : '#111827', 
                      wordBreak: 'break-word',
                      textDecoration: task.done ? 'line-through' : 'none'
                    }}>
                      {task.title}
                      {task.done && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'rgba(16, 185, 129, 0.8)' }}>✓</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: 'rgba(47,52,65,0.75)', marginTop: 4 }}>
                      {/* KRITIEK: Gebruik originele energyLevel, niet berekende complexity - GELIJK AAN TasksOverview */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: getEnergyColor(task.energyLevel || 'medium'),
                          flexShrink: 0
                        }} />
                        <span>{getEnergyLabel(task.energyLevel || 'medium')}</span>
                      </div>
                      {(task.duration || task.estimatedDuration) && (
                        <span>· {task.duration || task.estimatedDuration} min</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={`text-center py-5 text-sm ${shouldDisable ? 'text-gray-300 italic' : 'text-gray-500'}`}>
                    {shouldDisable ? (
                      isLowEnergy ? 'Niet beschikbaar bij lage energie' : 'Niet beschikbaar bij normale energie'
                    ) : (
                      'Klik een taak aan om hier te zetten'
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Taak suggesties */}
      <div className="mb-10">
        {filteredTasks.length > 0 ? (
          <>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Suggesties voor vandaag ({filteredTasks.length})
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Klik een taak aan om prioriteit te kiezen (1, 2 of 3)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => {
              const complexity = getTaskComplexity(task);
              const isLowEnergy = energyLevel === 'low';
              const taskEnergy = (task.energyLevel || 'medium') as string;
              const isMediumEnergy = energyLevel === 'medium';

              // KRITIEK: Vergrendel regels moeten primair op energyLevel gebaseerd zijn (niet op berekende complexiteit),
              // anders worden sommige "normale" taken toch selecteerbaar bij lage energie.
              const isLocked =
                (isLowEnergy && taskEnergy !== 'low') ||
                (isMediumEnergy && taskEnergy === 'high');

              // UI label (we tonen ze nog wel, maar als "voor later"/vergrendeld)
              const isForLater = isLocked;
              
              return (
                <button
                  type="button"
                  key={task.id}
                  disabled={isLocked}
                  onClick={() => {
                    if (isLocked) return;
                    setPriorityPickerTask(task);
                  }}
                  className={`p-4 rounded-2xl flex flex-col gap-2 min-h-[70px] transition-all duration-200 touch-manipulation text-left w-full ${
                    isLocked ? 'bg-gray-50/50 cursor-not-allowed opacity-50' : 'bg-gray-50 cursor-pointer hover:bg-gray-100 active:bg-gray-200'
                  } ${recentlyAdded === task.id ? 'ring-2 ring-green-200' : ''}`}
                  style={{
                    border: isLocked ? '1px dashed #E5E7EB' : '1px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ 
                      fontSize: 13, 
                      color: isLocked ? 'rgba(17, 24, 39, 0.5)' : '#111827', 
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
                      {(task.duration || task.estimatedDuration) && (
                        <span style={{ fontSize: 11, color: isLocked ? 'rgba(107, 114, 128, 0.5)' : 'rgba(47,52,65,0.6)', whiteSpace: 'nowrap' }}>
                          ⏱ {task.duration || task.estimatedDuration}m
                        </span>
                      )}
                      {isLocked && (
                        <span style={{ 
                          fontSize: 10, 
                          color: 'rgba(107, 114, 128, 0.7)',
                          fontStyle: 'italic',
                          padding: '2px 6px',
                          background: 'rgba(243, 244, 246, 0.8)',
                          borderRadius: 4
                        }}>
                          Vergrendeld
                        </span>
                      )}
                    </div>
                    {/* KRITIEK: Gebruik originele energyLevel, niet berekende complexity - GELIJK AAN TasksOverview */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: getEnergyColor(task.energyLevel || 'medium'),
                        flexShrink: 0
                      }} />
                      <span style={{ 
                        fontSize: 11, 
                        color: isLocked ? 'rgba(107, 114, 128, 0.5)' : 'rgba(47,52,65,0.6)',
                        whiteSpace: 'nowrap'
                      }}>
                        {getEnergyLabel(task.energyLevel || 'medium')}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          </>
        ) : (
          <div className="p-6 rounded-2xl bg-gray-50 text-center border border-dashed border-gray-200">
            <p className="text-sm text-gray-500 mb-2">Geen suggesties beschikbaar</p>
            <p className="text-xs text-gray-400">Voeg eerst taken toe aan je takenlijst</p>
          </div>
        )}
      </div>

      {/* Prioriteit-kiezer modal – via portal op body, altijd midden in viewport (geen scrollen nodig op mobiel) */}
      {priorityPickerTask && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setPriorityPickerTask(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Kies prioriteit"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-900">Kies prioriteit voor:</p>
            <p className="text-sm text-gray-600 break-words line-clamp-3">{priorityPickerTask.title}</p>
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((n) => {
                const disabled = (() => {
                  if (energyLevel === 'low') return n !== 1;
                  if (energyLevel === 'medium') return n === 3;
                  return false;
                })();
                const labels: Record<number, string> = { 1: '1 – Moet vandaag', 2: '2 – Belangrijk', 3: '3 – Extra focus' };
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) handleDrop(n, priorityPickerTask);
                    }}
                    className={`py-3 px-4 rounded-xl text-sm font-medium transition-colors ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'}`}
                  >
                    {labels[n]}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setPriorityPickerTask(null)} className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700">
              Annuleren
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Submit button – volgekleurd, breed, rounded-2xl */}
      <button
        onClick={handleSubmit}
        disabled={!energyLevel || isSubmitting || filledSlots === 0}
        className={`w-full py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-200 ${
          energyLevel && filledSlots > 0 && !isSubmitting
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isSubmitting
          ? 'Opslaan...'
          : filledSlots === 0
            ? 'Kies minimaal 1 prioriteit'
            : existingCheckIn
              ? `✅ Wijzigingen opslaan (${filledSlots}/${maxSlots})`
              : filledSlots < maxSlots
                ? `Je bent er klaar voor! (${filledSlots}/${maxSlots})`
                : '🎉 Start mijn dag'}
      </button>

      <div className="mt-8 pt-6 border-t border-gray-100">
        <p className="text-center text-xs text-gray-400">Stap 2 van 2</p>
      </div>
    </div>
  );
}
