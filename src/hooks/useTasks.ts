import { useState, useEffect, useCallback } from 'react';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: number | null;
  dueAt?: string | null;
  duration?: number;
  source?: string;
  completedAt?: string | null;
  reminders?: number[];
  repeat?: string;
  impact?: string;
  energyLevel?: string;
  estimatedDuration?: number;
  microSteps?: string[];
  notToday?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      // Map database fields to camelCase
      const mappedTasks = data.map((task: any) => ({
        id: task.id,
        title: task.title,
        done: task.done,
        priority: task.priority,
        dueAt: task.due_at,
        duration: task.duration,
        source: task.source,
        completedAt: task.completed_at,
        reminders: task.reminders,
        repeat: task.repeat,
        impact: task.impact,
        energyLevel: task.energy_level,
        estimatedDuration: task.estimated_duration,
        microSteps: task.micro_steps || [],
        notToday: task.not_today || false,
        created_at: task.created_at,
        updated_at: task.updated_at,
      }));
      setTasks(mappedTasks);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (!response.ok) {
        throw new Error('Failed to add task');
      }
      const newTask = await response.json();
      // Map to camelCase
      const mappedTask = {
        ...newTask,
        dueAt: newTask.due_at,
        completedAt: newTask.completed_at,
        energyLevel: newTask.energy_level,
        estimatedDuration: newTask.estimated_duration,
        microSteps: newTask.micro_steps || [],
        notToday: newTask.not_today || false,
      };
      setTasks((prev) => [mappedTask, ...prev]);
      return mappedTask;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      const updatedTask = await response.json();
      // Map to camelCase
      const mappedTask = {
        ...updatedTask,
        dueAt: updatedTask.due_at,
        completedAt: updatedTask.completed_at,
        energyLevel: updatedTask.energy_level,
        estimatedDuration: updatedTask.estimated_duration,
        microSteps: updatedTask.micro_steps || [],
        notToday: updatedTask.not_today || false,
      };
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? mappedTask : t))
      );
      return mappedTask;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateTasks = useCallback(async (newTasks: Task[]) => {
    try {
      // Batch update via API
      const response = await fetch('/api/tasks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: newTasks }),
      });
      if (!response.ok) {
        throw new Error('Failed to update tasks');
      }
      const updatedTasks = await response.json();
      // Map to camelCase
      const mappedTasks = updatedTasks.map((task: any) => ({
        ...task,
        dueAt: task.due_at,
        completedAt: task.completed_at,
        energyLevel: task.energy_level,
        estimatedDuration: task.estimated_duration,
        microSteps: task.micro_steps || [],
        notToday: task.not_today || false,
      }));
      setTasks(mappedTasks);
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

