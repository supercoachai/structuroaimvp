"use client";

import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/context/TaskContext";

export type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  done: boolean;
  started?: boolean;
  priority: number | null;
  due_at: string | null;
  duration: number | null;
  source: string;
  completed_at: string | null;
  reminders: number[];
  repeat: string;
  impact: string;
  energy_level: string;
  estimated_duration: number | null;
  micro_steps: unknown[];
  not_today: boolean;
  is_deadline?: boolean;
  category?: string;
  repeat_until?: string | null;
  repeat_weekdays?: string;
  repeat_exclude_dates?: string[];
  created_at: string;
  updated_at: string;
};

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    done: row.done,
    started: row.started ?? false,
    priority: row.priority,
    dueAt: row.due_at ?? undefined,
    duration: row.duration ?? undefined,
    source: row.source,
    completedAt: row.completed_at ?? undefined,
    reminders: row.reminders ?? [],
    repeat: row.repeat,
    repeatUntil: row.repeat_until ?? undefined,
    repeatWeekdays: (row.repeat_weekdays as Task["repeatWeekdays"]) ?? "all",
    repeatExcludeDates: Array.isArray(row.repeat_exclude_dates) ? row.repeat_exclude_dates : undefined,
    impact: row.impact,
    energyLevel: row.energy_level,
    estimatedDuration: row.estimated_duration ?? undefined,
    microSteps: Array.isArray(row.micro_steps) ? row.micro_steps : [],
    notToday: row.not_today,
    isDeadline: row.is_deadline,
    category: row.category,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function taskToRow(task: Partial<Task>, userId: string): Partial<TaskRow> & { user_id: string } {
  const row: Partial<TaskRow> & { user_id: string } = {
    user_id: userId,
    title: task.title ?? "",
    done: task.done ?? false,
    started: task.started ?? false,
    priority: task.priority ?? null,
    due_at: task.dueAt ?? null,
    duration: task.duration ?? null,
    source: task.source ?? "regular",
    completed_at: task.completedAt ?? null,
    reminders: task.reminders ?? [],
    repeat: task.repeat ?? "none",
    impact: task.impact ?? "🌱",
    energy_level: task.energyLevel ?? "medium",
    estimated_duration: task.estimatedDuration ?? null,
    micro_steps: Array.isArray(task.microSteps) ? task.microSteps : [],
    not_today: task.notToday ?? false,
    is_deadline: task.isDeadline,
    category: task.category,
    repeat_until: task.repeatUntil ?? null,
    repeat_weekdays: task.repeatWeekdays ?? "all",
    repeat_exclude_dates: task.repeatExcludeDates,
  };
  return row;
}

export async function fetchTasksFromSupabase(userId: string): Promise<Task[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToTask(row as TaskRow));
}

export async function addTaskToSupabase(
  userId: string,
  task: Omit<Task, "id">
): Promise<Task> {
  const supabase = createClient();
  const insert = taskToRow(task, userId);
  const { data, error } = await supabase
    .from("tasks")
    .insert(insert as Record<string, unknown>)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToTask(data as TaskRow);
}

export async function updateTaskInSupabase(
  userId: string,
  taskId: string,
  updates: Partial<Task>
): Promise<Task> {
  const supabase = createClient();
  const rowUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) rowUpdates.title = updates.title;
  if (updates.done !== undefined) rowUpdates.done = updates.done;
  if (updates.started !== undefined) rowUpdates.started = updates.started;
  if (updates.priority !== undefined) rowUpdates.priority = updates.priority;
  if (updates.dueAt !== undefined) rowUpdates.due_at = updates.dueAt;
  if (updates.duration !== undefined) rowUpdates.duration = updates.duration;
  if (updates.source !== undefined) rowUpdates.source = updates.source;
  if (updates.completedAt !== undefined) rowUpdates.completed_at = updates.completedAt;
  if (updates.reminders !== undefined) rowUpdates.reminders = updates.reminders;
  if (updates.repeat !== undefined) rowUpdates.repeat = updates.repeat;
  if (updates.impact !== undefined) rowUpdates.impact = updates.impact;
  if (updates.energyLevel !== undefined) rowUpdates.energy_level = updates.energyLevel;
  if (updates.estimatedDuration !== undefined) rowUpdates.estimated_duration = updates.estimatedDuration;
  if (updates.microSteps !== undefined) rowUpdates.micro_steps = updates.microSteps;
  if (updates.notToday !== undefined) rowUpdates.not_today = updates.notToday;
  if (updates.isDeadline !== undefined) rowUpdates.is_deadline = updates.isDeadline;
  if (updates.category !== undefined) rowUpdates.category = updates.category;
  if (updates.repeatUntil !== undefined) rowUpdates.repeat_until = updates.repeatUntil;
  if (updates.repeatWeekdays !== undefined) rowUpdates.repeat_weekdays = updates.repeatWeekdays;
  if (updates.repeatExcludeDates !== undefined) rowUpdates.repeat_exclude_dates = updates.repeatExcludeDates;

  const { data, error } = await supabase
    .from("tasks")
    .update(rowUpdates)
    .eq("id", taskId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToTask(data as TaskRow);
}

export async function deleteTaskFromSupabase(
  userId: string,
  taskId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export function subscribeToTasks(
  userId: string,
  onPayload: (tasks: Task[]) => void
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel("tasks-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        const list = await fetchTasksFromSupabase(userId);
        onPayload(list);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
