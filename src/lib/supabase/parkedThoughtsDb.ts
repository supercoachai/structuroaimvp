"use client";

import { createClient } from "@/lib/supabase/client";

export type ParkedThoughtRow = {
  id: string;
  user_id: string;
  content: string;
  converted_to_task_id: string | null;
  created_at: string;
};

export type ParkedThought = {
  id: string;
  content: string;
  convertedToTaskId: string | null;
  createdAt: string;
};

function rowToThought(row: ParkedThoughtRow): ParkedThought {
  return {
    id: row.id,
    content: row.content,
    convertedToTaskId: row.converted_to_task_id,
    createdAt: row.created_at,
  };
}

export async function fetchParkedThoughts(userId: string): Promise<ParkedThought[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parked_thoughts")
    .select("*")
    .eq("user_id", userId)
    .is("converted_to_task_id", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToThought(r as ParkedThoughtRow));
}

export async function insertParkedThought(
  userId: string,
  content: string
): Promise<ParkedThought> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parked_thoughts")
    .insert({ user_id: userId, content })
    .select()
    .single();

  if (error) {
    if (error.message.includes("10")) {
      throw new Error("max_reached");
    }
    throw new Error(error.message);
  }
  return rowToThought(data as ParkedThoughtRow);
}

export async function convertThoughtToTask(
  thoughtId: string,
  taskId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("parked_thoughts")
    .update({ converted_to_task_id: taskId })
    .eq("id", thoughtId);

  if (error) throw new Error(error.message);
}

export async function deleteParkedThought(thoughtId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("parked_thoughts")
    .delete()
    .eq("id", thoughtId);

  if (error) throw new Error(error.message);
}

export async function countActiveParkedThoughts(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("parked_thoughts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("converted_to_task_id", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
