"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getTasksFromStorage,
  saveTasksToStorage,
  addTaskToStorage,
  updateTaskInStorage,
  deleteTaskFromStorage,
  LocalTask
} from '../lib/localStorageTasks';
import { useUser } from '../hooks/useUser';
import {
  fetchTasksFromSupabase,
  addTaskToSupabase,
  updateTaskInSupabase,
  deleteTaskFromSupabase,
  subscribeToTasks,
} from '../lib/supabase/tasksDb';

// Task interface (export voor gebruik in andere componenten)
export interface Task {
  id: string;
  title: string;
  done: boolean;
  started: boolean;
  priority: number | null;
  dueAt?: string | null;
  duration?: number | null;
  source?: string;
  completedAt?: string;
  reminders?: number[];
  repeat?: string;
  repeatUntil?: string | null;
  repeatWeekdays?: 'all' | 'weekdays' | 'weekends';
  repeatExcludeDates?: string[];
  impact?: string;
  energyLevel?: string;
  estimatedDuration?: number | null;
  microSteps?: any[];
  notToday?: boolean;
  isDeadline?: boolean;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

// Map LocalTask naar Task
// KRITIEK: Converteer priority altijd naar Number (type-safety)
function mapLocalTaskToTask(localTask: LocalTask): Task {
  // Converteer priority naar number (null blijft null)
  let priority: number | null = null;
  if (localTask.priority != null) {
    const priorityNum = typeof localTask.priority === 'string' 
      ? parseInt(localTask.priority, 10) 
      : Number(localTask.priority);
    priority = isNaN(priorityNum) ? null : priorityNum;
  }
  
  return {
    id: localTask.id,
    title: localTask.title,
    done: localTask.done,
    started: localTask.started ?? false,
    priority: priority, // ALTIJD number of null
    dueAt: localTask.dueAt || undefined,
    duration: localTask.duration || undefined,
    source: localTask.source,
    completedAt: localTask.completedAt || undefined,
    reminders: localTask.reminders,
    repeat: localTask.repeat,
    repeatUntil: localTask.repeatUntil ?? undefined,
    repeatWeekdays: localTask.repeatWeekdays ?? 'all',
    repeatExcludeDates: localTask.repeatExcludeDates ?? undefined,
    impact: localTask.impact,
    energyLevel: localTask.energyLevel,
    estimatedDuration: localTask.estimatedDuration,
    microSteps: localTask.microSteps,
    notToday: localTask.notToday,
    isDeadline: (localTask as any).isDeadline,
    category: (localTask as any).category,
    created_at: localTask.created_at,
    updated_at: localTask.updated_at,
  };
}

// Map Task naar LocalTask
// KRITIEK: Forceer ALTIJD integer met parseInt(value, 10) voor opslaan
function mapTaskToLocalTask(task: Partial<Task>): Partial<LocalTask> {
  // KRITIEK: Forceer integer met parseInt - dit is de NUCLEAIRE fix
  let priority: number | null = null;
  if (task.priority != null) {
    const priorityStr = String(task.priority);
    const priorityNum = parseInt(priorityStr, 10);
    priority = isNaN(priorityNum) ? null : priorityNum;
  }
  
  return {
    id: task.id,
    title: task.title,
    done: task.done,
    started: task.started ?? false,
    priority: priority, // ALTIJD number of null
    dueAt: task.dueAt || null,
    duration: task.duration || null,
    source: task.source || 'regular',
    completedAt: task.completedAt || null,
    reminders: task.reminders || [],
    repeat: task.repeat || 'none',
    repeatUntil: task.repeatUntil ?? null,
    repeatWeekdays: task.repeatWeekdays ?? 'all',
    repeatExcludeDates: task.repeatExcludeDates ?? undefined,
    impact: task.impact || '🌱',
    energyLevel: task.energyLevel !== undefined && task.energyLevel !== null ? task.energyLevel : 'medium',
    estimatedDuration: task.estimatedDuration || null,
    microSteps: (task.microSteps as any[]) || [],
    notToday: task.notToday || false,
    isDeadline: (task as any).isDeadline,
    category: (task as any).category,
  };
}

// Map PARTIAL Task updates naar LocalTask updates.
// KRITIEK: Bij updates mogen we nooit defaults/nulls invullen voor velden die niet geüpdatet worden,
// anders raken duration/energyLevel/etc. "kwijt" bij een simpele update zoals { started: true }.
function mapTaskUpdatesToLocalTask(updates: Partial<Task>): Partial<LocalTask> {
  const local: Partial<LocalTask> = {};

  // Alleen meenemen als het veld daadwerkelijk in updates zit (ook als de waarde null is)
  if ('id' in updates) local.id = updates.id;
  if ('title' in updates) local.title = updates.title;
  if ('done' in updates) local.done = updates.done;
  if ('started' in updates) local.started = updates.started;
  if ('dueAt' in updates) local.dueAt = updates.dueAt ?? null;
  if ('duration' in updates) local.duration = updates.duration ?? null;
  if ('estimatedDuration' in updates) local.estimatedDuration = updates.estimatedDuration ?? null;
  if ('source' in updates) local.source = updates.source;
  if ('completedAt' in updates) local.completedAt = updates.completedAt ?? null;
  if ('reminders' in updates) local.reminders = updates.reminders ?? [];
  if ('repeat' in updates) local.repeat = updates.repeat ?? 'none';
  if ('repeatUntil' in updates) (local as any).repeatUntil = updates.repeatUntil ?? null;
  if ('repeatWeekdays' in updates) (local as any).repeatWeekdays = updates.repeatWeekdays ?? 'all';
  if ('repeatExcludeDates' in updates) (local as any).repeatExcludeDates = updates.repeatExcludeDates ?? undefined;
  if ('impact' in updates) local.impact = updates.impact ?? '🌱';
  if ('microSteps' in updates) local.microSteps = (updates.microSteps as any[]) ?? [];
  if ('notToday' in updates) local.notToday = updates.notToday ?? false;
  if ('isDeadline' in updates) (local as any).isDeadline = updates.isDeadline ?? false;
  if ('category' in updates) (local as any).category = updates.category ?? undefined;

  // Priority: parseInt only if provided
  if ('priority' in updates) {
    let priority: number | null = null;
    if (updates.priority != null) {
      const priorityStr = String(updates.priority);
      const priorityNum = parseInt(priorityStr, 10);
      priority = isNaN(priorityNum) ? null : priorityNum;
    }
    local.priority = priority;
  }

  // EnergyLevel: only if provided
  if ('energyLevel' in updates) {
    local.energyLevel = updates.energyLevel != null ? updates.energyLevel : undefined;
  }

  return local;
}

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (task: Omit<Task, 'id'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  updateTasks: (newTasks: Task[]) => Promise<void>;
  fetchTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loading = authLoading || tasksLoading;

  const FETCH_TASKS_TIMEOUT_MS = 10000;

  const fetchTasks = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      setTasksLoading(true);
      setError(null);

      if (user) {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('fetch_tasks_timeout')), FETCH_TASKS_TIMEOUT_MS)
        );
        const list = await Promise.race([
          fetchTasksFromSupabase(user.id),
          timeoutPromise,
        ]);
        setTasks(list);
        console.log('🔄 TaskContext: Loaded', list.length, 'tasks from Supabase (user)', user.id);
      } else {
        const localTasks = getTasksFromStorage();
        const mappedTasks = localTasks.map(mapLocalTaskToTask);
        const uniqueTasksMap = new Map<string, Task>();
        mappedTasks.forEach(task => {
          if (task.id) {
            const existing = uniqueTasksMap.get(task.id);
            if (!existing) uniqueTasksMap.set(task.id, task);
            else if ((task.updated_at ?? '') > (existing.updated_at ?? '')) {
              uniqueTasksMap.set(task.id, task);
            }
          }
        });
        setTasks(Array.from(uniqueTasksMap.values()));
        console.log('🔄 TaskContext: Loaded', localTasks.length, 'tasks from localStorage');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Fout bij laden taken');
      console.error('❌ TaskContext: Error fetching tasks:', err);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    fetchTasks();
  }, [authLoading, fetchTasks]);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToTasks(user.id, setTasks);
    return unsub;
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || user) return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'structuro_tasks' && e.newValue) fetchTasks();
    };
    const handleCustomEvent = () => fetchTasks();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('structuro_tasks_updated', handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('structuro_tasks_updated', handleCustomEvent);
    };
  }, [user, fetchTasks]);

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    try {
      if (user) {
        const newTask = await addTaskToSupabase(user.id, task);
        setTasks((prev) => (prev.some(t => t.id === newTask.id) ? prev : [newTask, ...prev]));
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        return newTask;
      }
      const localTaskData = mapTaskToLocalTask(task);
      const newTask = addTaskToStorage(localTaskData as Omit<LocalTask, 'id' | 'created_at' | 'updated_at'>);
      const mappedTask = mapLocalTaskToTask(newTask);
      setTasks((prev) => (prev.some(t => t.id === mappedTask.id) ? prev : [mappedTask, ...prev]));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        setTimeout(() => fetchTasks(), 50);
      }
      return mappedTask;
    } catch (err: any) {
      const msg = err?.message || err?.toString() || 'Onbekende fout bij toevoegen van taak';
      setError(msg);
      console.error('TaskContext: Error adding task:', err);
      throw new Error(msg);
    }
  }, [user?.id, fetchTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      if (user) {
        const updated = await updateTaskInSupabase(user.id, id, updates);
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        return updated;
      }
      const localUpdates = mapTaskUpdatesToLocalTask(updates);
      const updatedTask = updateTaskInStorage(id, localUpdates as Partial<LocalTask>);
      if (!updatedTask) throw new Error('Task not found');
      const mappedTask = mapLocalTaskToTask(updatedTask);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...mappedTask } : t)));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        const updatedTasks = getTasksFromStorage();
        window.dispatchEvent(new StorageEvent('storage', { key: 'structuro_tasks', newValue: JSON.stringify(updatedTasks), storageArea: window.localStorage }));
      }
      return mappedTask;
    } catch (err: any) {
      setError(err?.message);
      console.error('TaskContext: Error updating task:', err);
      throw err;
    }
  }, [user?.id]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      if (user) {
        await deleteTaskFromSupabase(user.id, id);
        setTasks((prev) => prev.filter((t) => t.id !== id));
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        return;
      }
      const deleted = deleteTaskFromStorage(id);
      if (!deleted) throw new Error('Task not found');
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        window.dispatchEvent(new StorageEvent('storage', { key: 'structuro_tasks', newValue: JSON.stringify(getTasksFromStorage()), storageArea: window.localStorage }));
      }
    } catch (err: any) {
      setError(err?.message);
      console.error('TaskContext: Error deleting task:', err);
      throw err;
    }
  }, [user?.id]);

  const updateTasks = useCallback(async (newTasks: Task[]) => {
    try {
      if (user) {
        for (const task of newTasks) {
          await updateTaskInSupabase(user.id, task.id, task);
        }
        setTasks(newTasks);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        return;
      }
      const localTasks = newTasks.map(task => ({
        ...mapTaskToLocalTask(task),
        id: task.id,
        created_at: task.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as LocalTask));
      saveTasksToStorage(localTasks);
      setTasks(newTasks);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        window.dispatchEvent(new StorageEvent('storage', { key: 'structuro_tasks', newValue: JSON.stringify(localTasks), storageArea: window.localStorage }));
      }
    } catch (err: any) {
      setError(err?.message);
      console.error('TaskContext: Error updating tasks:', err);
      throw err;
    }
  }, [user?.id]);

  const value: TaskContextType = {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    updateTasks,
    fetchTasks,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

// Hook om TaskContext te gebruiken
export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}
