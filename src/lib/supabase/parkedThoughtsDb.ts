"use client";

import { createClient } from "@/lib/supabase/client";

export type ParkedThoughtType = "focus_park" | "dagafsluiter_suggestie";

export type ParkedThoughtRow = {
  id: string;
  user_id: string;
  content: string;
  converted_to_task_id: string | null;
  created_at: string;
  thought_type?: ParkedThoughtType | string;
  suggested_task_energy?: string | null;
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
    .eq("thought_type", "focus_park")
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
    .insert({ user_id: userId, content, thought_type: "focus_park" as const })
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

/** Onvoltooide dagafsluiter-suggesties (max 7 dagen oud), voor dagstart. */
export type DagafsluiterSuggestionRow = {
  id: string;
  content: string;
  suggestedTaskEnergy: "low" | "medium" | "high" | null;
  createdAt: string;
};

export async function fetchDagafsluiterSuggestionsForDagstart(
  userId: string
): Promise<DagafsluiterSuggestionRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parked_thoughts")
    .select("id, content, suggested_task_energy, created_at")
    .eq("user_id", userId)
    .eq("thought_type", "dagafsluiter_suggestie")
    .is("converted_to_task_id", null)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    content: r.content,
    suggestedTaskEnergy: r.suggested_task_energy ?? null,
    createdAt: r.created_at,
  }));
}

export async function insertDagafsluiterSuggestions(
  userId: string,
  items: { content: string; suggestedTaskEnergy: "low" | "medium" | "high" }[]
): Promise<void> {
  if (items.length === 0) return;
  const supabase = createClient();
  const rows = items.map((i) => ({
    user_id: userId,
    content: i.content,
    thought_type: "dagafsluiter_suggestie" as const,
    suggested_task_energy: i.suggestedTaskEnergy,
  }));
  const { error } = await supabase.from("parked_thoughts").insert(rows);
  if (error) throw new Error(error.message);
}

export async function countActiveParkedThoughts(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("parked_thoughts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("thought_type", "focus_park")
    .is("converted_to_task_id", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
