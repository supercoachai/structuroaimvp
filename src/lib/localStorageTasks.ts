// LocalStorage helpers voor taken opslag (tijdelijk zonder Supabase)
import { mockTasks, MockTask } from './mockData';
import { notifyTaskUpdate } from './taskSync';

const STORAGE_KEY = 'structuro_tasks';
const STORAGE_KEY_CHECKINS = 'structuro_daily_checkins';

// Verwijder ALLE taken uit localStorage (voor schone start)
export function clearAllTasks(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✅ Alle taken verwijderd uit localStorage');
  } catch (error) {
    console.error('Error clearing tasks:', error);
  }
}

export interface LocalTask {
  id: string;
  title: string;
  done: boolean;
  started: boolean; // Nieuw: telt als succes zodra gestart
  priority: number | null;
  dueAt: string | null;
  duration: number | null;
  source: string;
  completedAt: string | null;
  reminders: number[];
  repeat: string;
  repeatUntil?: string | null;
  repeatWeekdays?: 'all' | 'weekdays' | 'weekends';
  repeatExcludeDates?: string[];
  impact: string;
  energyLevel: string;
  estimatedDuration: number | null;
  microSteps: any[];
  notToday: boolean;
  isDeadline?: boolean;
  category?: string; // 'work' | 'personal' | 'appointment' | 'health'
  created_at: string;
  updated_at: string;
}

// Haal taken op uit localStorage en verwijder duplicaten
// KRITIEK: Schone start script - verwijder corrupte taken en forceer integers
export function getTasksFromStorage(): LocalTask[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const tasks: LocalTask[] = JSON.parse(stored);
      
      // Verwijder duplicaten op basis van ID (unieke ID's)
      const uniqueTasksMap = new Map<string, LocalTask>();
      let hasDuplicates = false;
      let hasTypeIssues = false;
      let hasCorruption = false;
      
      tasks.forEach((task: LocalTask) => {
        // KRITIEK: Schone start - verwijder corrupte taken (zonder titel of id)
        if (!task || !task.id || !task.title || task.title.trim() === '') {
          hasCorruption = true;
          console.warn('🗑️ Removing corrupt task:', task);
          return; // Skip corrupte taken
        }
        
        // KRITIEK: Forceer integer met parseInt(value, 10) - NUCLEAIRE fix
        if (task.priority != null) {
          const priorityStr = String(task.priority);
          const priorityNum = parseInt(priorityStr, 10);
          if (!isNaN(priorityNum)) {
            task.priority = priorityNum; // Forceer integer
            if (typeof task.priority !== 'number') {
              hasTypeIssues = true;
            }
          } else {
            task.priority = null; // Invalid priority wordt null
            hasTypeIssues = true;
          }
        } else {
          task.priority = null; // Zet lege/null priority expliciet op null
        }
        
        // Als taak al bestaat, behoud de meest recente (nieuwste updated_at)
        const existing = uniqueTasksMap.get(task.id);
        if (!existing) {
          uniqueTasksMap.set(task.id, task);
        } else {
          hasDuplicates = true;
          // Vergelijk updated_at en behoud meest recente
          const existingDate = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
          const newDate = task.updated_at ? new Date(task.updated_at).getTime() : 0;
          
          if (newDate > existingDate) {
            uniqueTasksMap.set(task.id, task);
          }
        }
      });
      
      const uniqueTasks = Array.from(uniqueTasksMap.values());
      
      // Als er duplicaten, type-issues of corruptie waren, sla de gecorrigeerde versie terug op
      if (hasDuplicates || hasTypeIssues || hasCorruption || uniqueTasks.length !== tasks.length) {
        if (hasCorruption) {
          console.log('🧹 getTasksFromStorage: Removed corrupt tasks');
        }
        if (hasTypeIssues) {
          console.log('🔧 getTasksFromStorage: Fixed priority type issues (forced integers)');
        }
        saveTasksToStorage(uniqueTasks);
      }
      
      return uniqueTasks;
    }
    // Als localStorage leeg is, return lege array (geen mock data meer)
    // Gebruiker kan zelf taken toevoegen
    return [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return mockTasks;
  }
}

// Sla taken op in localStorage
export function saveTasksToStorage(tasks: LocalTask[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const tasksJson = JSON.stringify(tasks);
    localStorage.setItem(STORAGE_KEY, tasksJson);
    
    // KRITIEK: Directe sync - dispatch storage event voor onmiddellijke her-render
    if (typeof window !== 'undefined') {
      // Event 1: Custom event (same-tab)
      window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
      
      // Event 2: Storage event (cross-tab sync) - NUCLEAIRE fix
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: tasksJson,
        storageArea: window.localStorage
      }));
      
      // Event 3: Na korte delay (voor componenten die later mounten)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
      }, 50);
      
      // Event 4: Na langere delay (voor race conditions)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
      }, 200);
      
      console.log('📢 saveTasksToStorage: Events triggered for', tasks.length, 'tasks');
    }
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

// Voeg een taak toe (controleert op duplicaten)
export function addTaskToStorage(task: Omit<LocalTask, 'id' | 'created_at' | 'updated_at'>): LocalTask {
  const tasks = getTasksFromStorage();
  
  // Genereer unieke ID
  let newId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Zorg dat ID echt uniek is (check of het al bestaat)
  let attempts = 0;
  while (tasks.some(t => t.id === newId) && attempts < 10) {
    newId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    attempts++;
  }
  
  const newTask: LocalTask = {
    ...task,
    id: newId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Controleer op dubbele submit (zelfde titel + source binnen 5 sec) – niet voor medicatie/events met dueAt
  const isRecurringWithDue = (newTask.source === 'medication' || newTask.source === 'event') && newTask.dueAt;
  const recentDuplicate = !isRecurringWithDue
    ? tasks.find(t =>
        t.title === newTask.title &&
        t.source === newTask.source &&
        t.created_at &&
        new Date().getTime() - new Date(t.created_at).getTime() < 5000
      )
    : null;

  if (recentDuplicate) {
    return updateTaskInStorage(recentDuplicate.id, newTask) || newTask;
  }
  
  tasks.push(newTask);
  saveTasksToStorage(tasks);
  return newTask;
}

// Update een taak - BEHOUD alle bestaande velden, update alleen wat nodig is
// BELANGRIJK: Deze functie is de Single Source of Truth voor task updates
// KRITIEK: Converteer priority altijd naar Number
export function updateTaskInStorage(taskId: string, updates: Partial<LocalTask>): LocalTask | null {
  const tasks = getTasksFromStorage();
  const index = tasks.findIndex(t => t.id === taskId);
  
  // KRITIEK: Forceer ALTIJD integer met parseInt(value, 10) - NUCLEAIRE fix
  let priority: number | null = null;
  if (updates.priority != null) {
    const priorityStr = String(updates.priority);
    const priorityNum = parseInt(priorityStr, 10);
    priority = isNaN(priorityNum) ? null : priorityNum;
  }
  
  if (index === -1) {
    console.warn(`❌ Task ${taskId} not found in storage. Available tasks:`, tasks.map((t: any) => ({ id: t.id, title: t.title })));
    // Probeer taak toe te voegen als die niet bestaat (fallback)
    if (updates.title) {
      console.log(`⚠️ Attempting to add missing task: ${updates.title}`);
      const newTask: LocalTask = {
        id: taskId,
        title: updates.title,
        done: updates.done || false,
        started: updates.started || false,
        priority: priority, // Gebruik geconverteerde priority
        dueAt: updates.dueAt || null,
        duration: updates.duration || null,
        source: updates.source || 'regular',
        completedAt: updates.completedAt || null,
        reminders: updates.reminders || [],
        repeat: updates.repeat || 'none',
        impact: updates.impact || '🌱',
        energyLevel: updates.energyLevel !== undefined && updates.energyLevel !== null ? updates.energyLevel : 'medium',
        estimatedDuration: updates.estimatedDuration || null,
        microSteps: updates.microSteps || [],
        notToday: updates.notToday || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      tasks.push(newTask);
      saveTasksToStorage(tasks);
      console.log(`✅ Added missing task to storage:`, newTask);
      return newTask;
    }
    return null;
  }
  
  // BELANGRIJK: Behoud ALLE bestaande velden, merge alleen de updates
  // Dit zorgt ervoor dat energyLevel, title, etc. behouden blijven bij priority updates
  const existingTask = tasks[index];
  
  // KRITIEK: Als updates.energyLevel undefined is, behoud de bestaande energyLevel
  // Dit voorkomt dat energyLevel wordt overschreven naar undefined
  const safeUpdates = { ...updates };
  if (!safeUpdates.hasOwnProperty('energyLevel') || safeUpdates.energyLevel === undefined) {
    // Behoud bestaande energyLevel als deze niet expliciet wordt geüpdatet
    safeUpdates.energyLevel = existingTask.energyLevel || 'medium';
  }
  
  // KRITIEK: Verifieer dat existingTask alle essentiële velden heeft
  if (!existingTask || !existingTask.id || !existingTask.title) {
    console.error('❌ KRITIEKE FOUT: existingTask mist essentiële velden!', {
      existingTask,
      taskId,
      index,
      tasksLength: tasks.length
    });
    return null;
  }
  
  // KRITIEK: Als priority expliciet wordt geüpdatet (inclusief null), gebruik die waarde
  // Anders behoud de bestaande priority
  if (updates.hasOwnProperty('priority')) {
    // Priority wordt expliciet geüpdatet (kan null zijn om priority te verwijderen)
    safeUpdates.priority = priority; // Gebruik de geconverteerde priority (kan null zijn)
  } else {
    // Behoud bestaande priority als deze niet expliciet wordt geüpdatet
    safeUpdates.priority = existingTask.priority;
  }
  
  // KRITIEK: Zorg dat we ALLE velden behouden en alleen de updates toepassen
  // Gebruik expliciete defaults voor alle velden om te voorkomen dat velden ontbreken
  const updatedTask: LocalTask = {
    id: existingTask.id || taskId, // Zorg dat ID altijd behouden blijft
    title: existingTask.title || 'Untitled Task', // Zorg dat title altijd behouden blijft
    done: safeUpdates.done !== undefined ? safeUpdates.done : (existingTask.done ?? false),
    started: safeUpdates.started !== undefined ? safeUpdates.started : (existingTask.started ?? false),
    priority: safeUpdates.priority !== undefined ? safeUpdates.priority : (existingTask.priority ?? null),
    dueAt: safeUpdates.dueAt !== undefined ? safeUpdates.dueAt : (existingTask.dueAt ?? null),
    duration: safeUpdates.duration !== undefined ? safeUpdates.duration : (existingTask.duration ?? null),
    source: safeUpdates.source !== undefined ? safeUpdates.source : (existingTask.source || 'regular'),
    completedAt: safeUpdates.completedAt !== undefined ? safeUpdates.completedAt : (existingTask.completedAt ?? null),
    reminders: safeUpdates.reminders !== undefined ? safeUpdates.reminders : (existingTask.reminders || []),
    repeat: safeUpdates.repeat !== undefined ? safeUpdates.repeat : (existingTask.repeat || 'none'),
    repeatUntil: (safeUpdates as any).repeatUntil !== undefined ? (safeUpdates as any).repeatUntil : (existingTask as any).repeatUntil ?? null,
    repeatWeekdays: (safeUpdates as any).repeatWeekdays !== undefined ? (safeUpdates as any).repeatWeekdays : (existingTask as any).repeatWeekdays ?? 'all',
    repeatExcludeDates: (safeUpdates as any).repeatExcludeDates !== undefined ? (safeUpdates as any).repeatExcludeDates : (existingTask as any).repeatExcludeDates ?? undefined,
    impact: safeUpdates.impact !== undefined ? safeUpdates.impact : (existingTask.impact || '🌱'),
    energyLevel: safeUpdates.energyLevel !== undefined && safeUpdates.energyLevel !== null ? safeUpdates.energyLevel : (existingTask.energyLevel || 'medium'),
    estimatedDuration: safeUpdates.estimatedDuration !== undefined ? safeUpdates.estimatedDuration : (existingTask.estimatedDuration ?? null),
    microSteps: safeUpdates.microSteps !== undefined ? safeUpdates.microSteps : (existingTask.microSteps || []),
    notToday: safeUpdates.notToday !== undefined ? safeUpdates.notToday : (existingTask.notToday ?? false),
    isDeadline: (safeUpdates as any).isDeadline !== undefined ? (safeUpdates as any).isDeadline : (existingTask as any).isDeadline ?? false,
    category: (safeUpdates as any).category !== undefined ? (safeUpdates as any).category : (existingTask as any).category,
    created_at: existingTask.created_at || new Date().toISOString(), // Behoud originele created_at of maak nieuwe
    updated_at: new Date().toISOString()
  };
  
  // KRITIEK: Verifieer dat de taak nog steeds alle essentiële velden heeft
  if (!updatedTask.title || !updatedTask.id) {
    console.error('❌ KRITIEKE FOUT: Taak verliest essentiële velden na update!', {
      id: updatedTask.id,
      title: updatedTask.title,
      priority: updatedTask.priority,
      originalTask: existingTask,
      safeUpdates,
      updatedTask,
      taskId,
      index
    });
    // Herstel de taak met alle originele velden + updates
    const restoredTask: LocalTask = {
      id: existingTask.id || taskId,
      title: existingTask.title || 'Untitled Task',
      done: existingTask.done ?? false,
      started: existingTask.started ?? false,
      priority: priority !== undefined ? priority : (existingTask.priority ?? null),
      dueAt: existingTask.dueAt ?? null,
      duration: existingTask.duration ?? null,
      source: existingTask.source || 'regular',
      completedAt: existingTask.completedAt ?? null,
      reminders: existingTask.reminders || [],
      repeat: existingTask.repeat || 'none',
      impact: existingTask.impact || '🌱',
      energyLevel: existingTask.energyLevel || 'medium',
      estimatedDuration: existingTask.estimatedDuration ?? null,
      microSteps: existingTask.microSteps || [],
      notToday: existingTask.notToday ?? false,
      isDeadline: (existingTask as any).isDeadline ?? false,
      created_at: existingTask.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    console.log('✅ Taak hersteld met alle originele velden:', restoredTask);
    return restoredTask;
  }
  
  // KRITIEK: Verifieer dat de taak nog steeds bestaat in de array VOORDAT we opslaan
  if (index >= tasks.length) {
    console.error('❌ KRITIEKE FOUT: Index buiten bereik!', { index, tasksLength: tasks.length, taskId });
    return null;
  }
  
  tasks[index] = updatedTask;
  
  // KRITIEK: Verifieer dat de taak nog steeds in de array staat NA de update
  const taskStillExists = tasks.find((t: any) => t.id === taskId);
  if (!taskStillExists) {
    console.error('❌ KRITIEKE FOUT: Taak verdwenen na update!', { taskId, updatedTask });
    // Herstel: voeg de taak terug toe
    tasks.push(updatedTask);
    console.log('✅ Taak hersteld in array');
  }
  
  saveTasksToStorage(tasks); // Deze functie triggert al een event
  
  // BELANGRIJK: Trigger ook expliciet een custom event voor same-tab sync
  if (typeof window !== 'undefined') {
    notifyTaskUpdate();
  }
  
  // KRITIEK: Verifieer dat de taak nog steeds bestaat in localStorage NA opslaan
  const tasksAfterSave = getTasksFromStorage();
  const taskExistsAfterSave = tasksAfterSave.find((t: any) => t.id === taskId);
  if (!taskExistsAfterSave) {
    console.error('❌ KRITIEKE FOUT: Taak verdwenen uit localStorage na opslaan!', { taskId, updatedTask });
    // Probeer opnieuw op te slaan
    tasksAfterSave.push(updatedTask);
    saveTasksToStorage(tasksAfterSave);
    console.log('✅ Taak opnieuw opgeslagen in localStorage');
  }
  
  console.log(`✅ Task updated in storage:`, { 
    id: updatedTask.id, 
    title: updatedTask.title, 
    priority: updatedTask.priority,
    energyLevel: updatedTask.energyLevel,
    totalTasksInStorage: tasksAfterSave.length
  });
  return updatedTask;
}

// Verwijder een taak
export function deleteTaskFromStorage(taskId: string): boolean {
  const tasks = getTasksFromStorage();
  const filtered = tasks.filter(t => t.id !== taskId);
  
  if (filtered.length === tasks.length) return false;
  
  saveTasksToStorage(filtered);
  return true;
}

// Haal check-ins op
export function getCheckInsFromStorage(): any[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CHECKINS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading check-ins from localStorage:', error);
    return [];
  }
}

// Sla check-in op
export function saveCheckInToStorage(checkIn: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    const checkIns = getCheckInsFromStorage();
    const today = new Date().toISOString().split('T')[0];
    
    // Vervang bestaande check-in voor vandaag
    const filtered = checkIns.filter((ci: any) => ci.date !== today);
    filtered.push({
      ...checkIn,
      date: today,
      created_at: new Date().toISOString()
    });
    
    localStorage.setItem(STORAGE_KEY_CHECKINS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error saving check-in to localStorage:', error);
  }
}

// Haal check-in voor vandaag op
export function getTodayCheckIn(): any | null {
  const checkIns = getCheckInsFromStorage();
  const today = new Date().toISOString().split('T')[0];
  return checkIns.find((ci: any) => ci.date === today) || null;
}

// Check of er vandaag al een check-in is gedaan
export function hasCheckedInToday(): boolean {
  return getTodayCheckIn() !== null;
}
