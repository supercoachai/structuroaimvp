// LocalStorage helpers voor taken opslag (tijdelijk zonder Supabase)
import { mockTasks, MockTask } from './mockData';

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
  impact: string;
  energyLevel: string;
  estimatedDuration: number | null;
  microSteps: string[];
  notToday: boolean;
  created_at: string;
  updated_at: string;
}

// Haal taken op uit localStorage en verwijder duplicaten
export function getTasksFromStorage(): LocalTask[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const tasks: LocalTask[] = JSON.parse(stored);
      
      // Verwijder duplicaten op basis van ID (unieke ID's)
      const uniqueTasksMap = new Map<string, LocalTask>();
      let hasDuplicates = false;
      
      tasks.forEach((task: LocalTask) => {
        if (!task || !task.id) {
          // Skip invalid tasks
          hasDuplicates = true;
          return;
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
      
      // Als er duplicaten waren, sla de unieke versie terug op
      if (hasDuplicates || uniqueTasks.length !== tasks.length) {
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
    
    // KRITIEK: Trigger MULTIPLE events om zeker te zijn dat alle listeners worden getriggerd
    if (typeof window !== 'undefined') {
      // Event 1: Direct
      window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
      
      // Event 2: Na korte delay (voor componenten die later mounten)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
      }, 50);
      
      // Event 3: Na langere delay (voor race conditions)
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
  
  // Controleer of er al een taak bestaat met dezelfde titel en source (binnen laatste 5 seconden)
  const recentDuplicate = tasks.find(t => 
    t.title === newTask.title && 
    t.source === newTask.source &&
    t.created_at && 
    new Date().getTime() - new Date(t.created_at).getTime() < 5000
  );
  
  if (recentDuplicate) {
    // Update bestaande taak in plaats van nieuwe toe te voegen
    return updateTaskInStorage(recentDuplicate.id, newTask) || newTask;
  }
  
  tasks.push(newTask);
  saveTasksToStorage(tasks);
  return newTask;
}

// Update een taak - BEHOUD alle bestaande velden, update alleen wat nodig is
// BELANGRIJK: Deze functie is de Single Source of Truth voor task updates
export function updateTaskInStorage(taskId: string, updates: Partial<LocalTask>): LocalTask | null {
  const tasks = getTasksFromStorage();
  const index = tasks.findIndex(t => t.id === taskId);
  
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
        priority: updates.priority || null,
        dueAt: updates.dueAt || null,
        duration: updates.duration || null,
        source: updates.source || 'regular',
        completedAt: updates.completedAt || null,
        reminders: updates.reminders || [],
        repeat: updates.repeat || 'none',
        impact: updates.impact || '🌱',
        energyLevel: updates.energyLevel || 'medium',
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
  const updatedTask = {
    ...existingTask, // Behoud alle bestaande velden (title, duration, energyLevel, etc.)
    ...updates,      // Pas alleen de geüpdatete velden toe
    id: existingTask.id, // Zorg dat ID altijd behouden blijft
    updated_at: new Date().toISOString()
  };
  
  tasks[index] = updatedTask;
  saveTasksToStorage(tasks); // Deze functie triggert al een event
  
  // BELANGRIJK: Trigger ook expliciet een custom event voor same-tab sync
  if (typeof window !== 'undefined') {
    const { notifyTaskUpdate } = require('./taskSync');
    notifyTaskUpdate();
  }
  
  console.log(`✅ Task updated in storage:`, { 
    id: updatedTask.id, 
    title: updatedTask.title, 
    priority: updatedTask.priority,
    energyLevel: updatedTask.energyLevel 
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
