"use client";

import { createClient } from "@/lib/supabase/client";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

export type DagstartEnergy = "low" | "medium" | "high";

export async function updateProfileAfterDagstartComplete(
  userId: string,
  energy: DagstartEnergy
): Promise<void> {
  const supabase = createClient();
  const today = getCalendarDateAmsterdam();
  const { error } = await supabase
    .from("profiles")
    .update({
      last_dagstart_date: today,
      dagstart_energy: energy,
      dagstart_completed_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    const msg = error.message ?? "";
    if (
      msg.includes("column") ||
      msg.includes("schema cache") ||
      msg.includes("does not exist")
    ) {
      console.warn(
        "profileDagstartDb: kolommen ontbreken, run migration_profiles_dagstart_gate.sql"
      );
      return;
    }
    throw new Error(error.message);
  }
}
