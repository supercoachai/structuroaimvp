import { captureServerEvent } from "./server";
import type { ServerEventRequestContext } from "./serverEventContext";

export type DagstartCompletedServerPayload = {
  energy_level: string;
  tasks_selected_count: number;
  top3_task_ids?: string[] | null;
  has_cycle_phase?: boolean;
  source?: string;
};

export type ShutdownCompletedServerPayload = {
  tasks_completed_count: number;
  tasks_moved_count: number;
  satisfaction_level?: string | null;
};

/** Autoritatief: distinct_id = user.id, gelijk aan Supabase daily_checkins. */
export async function captureDagstartCompletedServer(
  userId: string,
  payload: DagstartCompletedServerPayload,
  requestContext?: ServerEventRequestContext | null
): Promise<void> {
  await captureServerEvent(
    userId,
    "dagstart_completed",
    {
      ...payload,
      channel: "server",
      funnel: "activation",
      authoritative: true,
    },
    requestContext
  );
}

export async function captureShutdownCompletedServer(
  userId: string,
  payload: ShutdownCompletedServerPayload,
  requestContext?: ServerEventRequestContext | null
): Promise<void> {
  await captureServerEvent(
    userId,
    "shutdown_completed",
    {
      ...payload,
      channel: "server",
      funnel: "activation",
      authoritative: true,
    },
    requestContext
  );
}
