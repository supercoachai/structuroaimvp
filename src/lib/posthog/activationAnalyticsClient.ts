/** Server-backup voor activatie-events (autoritatief, user.id als distinct_id). */

async function postActivationServerBackup(
  route: "dagstart-completed" | "shutdown-completed",
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(`/api/analytics/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch {
    /* ignore */
  }
}

export function trackDagstartCompletedServerBackup(payload: {
  energy_level: string;
  tasks_selected_count: number;
  top3_task_ids?: string[] | null;
  has_cycle_phase?: boolean;
  source?: string;
}): void {
  void postActivationServerBackup("dagstart-completed", payload);
}

export function trackShutdownCompletedServerBackup(payload: {
  tasks_completed_count: number;
  tasks_moved_count: number;
  satisfaction_level?: string | null;
}): void {
  void postActivationServerBackup("shutdown-completed", payload);
}
