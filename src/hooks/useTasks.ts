import { useState, useEffect, useCallback } from 'react';
import { 
  getTasksFromStorage, 
  saveTasksToStorage, 
  addTaskToStorage, 
  updateTaskInStorage, 
  deleteTaskFromStorage,
  LocalTask 
} from '../lib/localStorageTasks';
import { subscribeToTaskUpdates } from '../lib/taskSync';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  started: boolean; // Nieuw: telt als succes zodra gestart
  priority: number | null;
  dueAt?: string | null;
  duration?: number | null;
  source?: string;
  completedAt?: string;
  reminders?: number[];
  repeat?: string;
  impact?: string;
  energyLevel?: string;
  estimatedDuration?: number | null;
  microSteps?: any[];
  notToday?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Map LocalTask naar Task interface
function mapLocalTaskToTask(localTask: LocalTask): Task {
  return {
    id: localTask.id,
    title: localTask.title,
    done: localTask.done,
    started: localTask.started ?? false, // Default false als niet aanwezig
    priority: localTask.priority,
    dueAt: localTask.dueAt,
    duration: localTask.duration,
    source: localTask.source,
    completedAt: localTask.completedAt ?? undefined,
    reminders: localTask.reminders,
    repeat: localTask.repeat,
    impact: localTask.impact,
    energyLevel: localTask.energyLevel,
    estimatedDuration: localTask.estimatedDuration,
    microSteps: localTask.microSteps,
    notToday: localTask.notToday,
    created_at: localTask.created_at,
    updated_at: localTask.updated_at,
  };
}

// Map Task naar LocalTask interface
function mapTaskToLocalTask(task: Partial<Task>): Partial<LocalTask> {
  return {
    id: task.id,
    title: task.title,
    done: task.done,
    started: task.started ?? false, // Default false als niet aanwezig
    priority: task.priority,
    dueAt: task.dueAt || null,
    duration: task.duration || null,
    source: task.source || 'regular',
    completedAt: task.completedAt || null,
    reminders: task.reminders || [],
    repeat: task.repeat || 'none',
    impact: task.impact || '🌱',
    energyLevel: task.energyLevel || 'medium',
    estimatedDuration: task.estimatedDuration || null,
    microSteps: task.microSteps || [],
    notToday: task.notToday || false,
  };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const fetchTasks = useCallback(async () => {
    // BELANGRIJK: Verwijder isAddingTask check - we moeten ALTIJD de laatste data kunnen ophalen
    // De isAddingTask flag wordt alleen gebruikt om dubbele optimistic updates te voorkomen
    
    try {
      setLoading(true);
      
      // Haal ALTIJD de volledige array op uit localStorage (direct, synchroon)
      const localTasks = getTasksFromStorage();
      
      console.log('🔄 fetchTasks: Loaded', localTasks.length, 'tasks from localStorage');
      
      if (localTasks.length === 0) {
        setTasks([]);
        setError(null);
        setLoading(false);
        return;
      }
      
      // Map alle taken - BEHOUD ALLES
      const mappedTasks = localTasks.map(mapLocalTaskToTask);
      
      // Extra check: filter duplicaten op basis van ID (behoud meest recente)
      const uniqueTasksMap = new Map<string, Task>();
      mappedTasks.forEach(task => {
        if (task.id) {
          const existing = uniqueTasksMap.get(task.id);
          if (!existing) {
            uniqueTasksMap.set(task.id, task);
          } else {
            const existingDate = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
            const newDate = task.updated_at ? new Date(task.updated_at).getTime() : 0;
            if (newDate > existingDate) {
              uniqueTasksMap.set(task.id, task);
            }
          }
        }
      });
      
      const uniqueTasks = Array.from(uniqueTasksMap.values());
      
      console.log('✅ fetchTasks: Setting', uniqueTasks.length, 'unique tasks in state');
      
      setTasks(uniqueTasks);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('❌ Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []); // Verwijder isAddingTask dependency

  useEffect(() => {
    // Cleanup duplicaten bij mount (direct, niet async)
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('structuro_tasks');
        if (stored) {
          const tasks = JSON.parse(stored);
          const uniqueMap = new Map<string, any>();
          
          tasks.forEach((task: any) => {
            if (task && task.id) {
              const existing = uniqueMap.get(task.id);
              if (!existing) {
                uniqueMap.set(task.id, task);
              } else {
                // Behoud meest recente
                const existingDate = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
                const newDate = task.updated_at ? new Date(task.updated_at).getTime() : 0;
                if (newDate > existingDate) {
                  uniqueMap.set(task.id, task);
                }
              }
            }
          });
          
          const uniqueTasks = Array.from(uniqueMap.values());
          if (uniqueTasks.length !== tasks.length) {
            localStorage.setItem('structuro_tasks', JSON.stringify(uniqueTasks));
            window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
          }
        }
      } catch (error) {
        console.error('Error cleaning duplicates on mount:', error);
      }
    }
    
    fetchTasks();
    
    // BELANGRIJK: Luister naar task updates - ALTIJD, niet alleen als !isAddingTask
    const unsubscribe = subscribeToTaskUpdates(() => {
      console.log('🔄 useTasks: Task update event received, refreshing...');
      setTimeout(() => {
        fetchTasks();
      }, 10);
    });
    
    // BELANGRIJK: Luister ook naar localStorage storage events - ALTIJD
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'structuro_tasks' && e.newValue) {
        console.log('🔄 useTasks: localStorage changed, refreshing...');
        setTimeout(() => {
          fetchTasks();
        }, 10);
      }
    };
    
    // BELANGRIJK: Luister ook naar custom events direct
    const handleCustomEvent = () => {
      console.log('🔄 useTasks: Custom event received, refreshing...');
      setTimeout(() => {
        fetchTasks();
      }, 10);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('structuro_tasks_updated', handleCustomEvent);
    }
    
    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('structuro_tasks_updated', handleCustomEvent);
      }
    };
  }, [fetchTasks]); // Verwijder isAddingTask dependency

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    try {
      setIsAddingTask(true);
      const localTaskData = mapTaskToLocalTask(task);
      const newTask = addTaskToStorage(localTaskData as Omit<LocalTask, 'id' | 'created_at' | 'updated_at'>);
      const mappedTask = mapLocalTaskToTask(newTask);
      
      // Voeg direct toe aan state (optimistic update) met duplicaat check
      setTasks((prev) => {
        // Check of taak al bestaat (voorkom duplicaat)
        if (prev.some(t => t.id === mappedTask.id)) {
          return prev;
        }
        return [mappedTask, ...prev];
      });
      
      // BELANGRIJK: Trigger expliciet een sync event zodat andere pagina's direct updaten
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
      }
      
      // Reset flag na korte delay en sync met localStorage
      setTimeout(() => {
        setIsAddingTask(false);
        // Haal taken opnieuw op om zeker te zijn dat alles gesynchroniseerd is
        // Maar alleen als we niet al bezig zijn met toevoegen
        const localTasks = getTasksFromStorage();
        const mappedTasks = localTasks.map(mapLocalTaskToTask);
        const uniqueTasksMap = new Map<string, Task>();
        mappedTasks.forEach(t => {
          if (t.id && !uniqueTasksMap.has(t.id)) {
            uniqueTasksMap.set(t.id, t);
          }
        });
        setTasks(Array.from(uniqueTasksMap.values()));
      }, 50);
      
      return mappedTask;
    } catch (err: any) {
      setIsAddingTask(false);
      const errorMessage = err?.message || err?.toString() || 'Onbekende fout bij toevoegen van taak';
      setError(errorMessage);
      console.error('Error adding task:', err, 'Task data:', task);
      throw new Error(errorMessage);
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      const localUpdates = mapTaskToLocalTask(updates);
      const updatedTask = updateTaskInStorage(id, localUpdates as Partial<LocalTask>);
      
      if (!updatedTask) {
        throw new Error('Task not found');
      }
      
      const mappedTask = mapLocalTaskToTask(updatedTask);
      
      // Optimistische update: behoud alle bestaande velden van de taak en merge met updates
      setTasks((prev) => {
        const existingTask = prev.find(t => t.id === id);
        if (existingTask) {
          // Merge bestaande taak met updates om alle velden te behouden
          const mergedTask = { ...existingTask, ...mappedTask };
          return prev.map((t) => (t.id === id ? mergedTask : t));
        } else {
          // Als taak niet bestaat, voeg toe
          return [...prev, mappedTask];
        }
      });
      
      return mappedTask;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const deleted = deleteTaskFromStorage(id);
      if (!deleted) {
        throw new Error('Task not found');
      }
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateTasks = useCallback(async (newTasks: Task[]) => {
    try {
      const localTasks = newTasks.map(task => {
        const localData = mapTaskToLocalTask(task);
        return {
          ...localData,
          id: task.id,
          created_at: task.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as LocalTask;
      });
      saveTasksToStorage(localTasks); // Deze functie triggert al een event
      setTasks(newTasks);
      
      // BELANGRIJK: Trigger expliciet een sync event voor extra zekerheid
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    updateTasks,
  };
}

