import { NextResponse } from "next/server";

import { captureDagstartCompletedServer } from "@/lib/posthog/activationAnalyticsServer";
import { captureServerException } from "@/lib/posthog/server";
import { extractRequestClientContext } from "@/lib/posthog/serverEventContext";
import { createClient } from "@/lib/supabase/server";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

function sanitizeEnergy(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return null;
}

async function postDagstartCompleted(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const energy_level = sanitizeEnergy(b.energy_level);
  if (!energy_level) {
    return NextResponse.json({ error: "invalid_energy_level" }, { status: 400 });
  }

  const tasks_selected_count =
    typeof b.tasks_selected_count === "number" && Number.isFinite(b.tasks_selected_count)
      ? Math.max(0, Math.min(3, Math.floor(b.tasks_selected_count)))
      : 0;

  const top3_task_ids = Array.isArray(b.top3_task_ids)
    ? b.top3_task_ids
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .slice(0, 3)
    : null;

  try {
    await captureDagstartCompletedServer(
      user.id,
      {
        energy_level,
        tasks_selected_count,
        top3_task_ids,
        has_cycle_phase: b.has_cycle_phase === true,
        source: typeof b.source === "string" ? b.source.slice(0, 64) : "app",
      },
      extractRequestClientContext(request)
    );
  } catch (error) {
    await captureServerException(error, {
      route: "POST /api/analytics/dagstart-completed",
      method: "POST",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking(
  "POST /api/analytics/dagstart-completed",
  postDagstartCompleted
);
