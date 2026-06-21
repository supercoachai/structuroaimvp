import { NextResponse } from "next/server";

import { captureShutdownCompletedServer } from "@/lib/posthog/activationAnalyticsServer";
import { captureServerException } from "@/lib/posthog/server";
import { createClient } from "@/lib/supabase/server";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

async function postShutdownCompleted(request: Request) {
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

  const tasks_completed_count =
    typeof b.tasks_completed_count === "number" && Number.isFinite(b.tasks_completed_count)
      ? Math.max(0, Math.floor(b.tasks_completed_count))
      : 0;
  const tasks_moved_count =
    typeof b.tasks_moved_count === "number" && Number.isFinite(b.tasks_moved_count)
      ? Math.max(0, Math.floor(b.tasks_moved_count))
      : 0;
  const satisfaction_level =
    typeof b.satisfaction_level === "string" && b.satisfaction_level.trim()
      ? b.satisfaction_level.trim().slice(0, 32)
      : null;

  try {
    await captureShutdownCompletedServer(user.id, {
      tasks_completed_count,
      tasks_moved_count,
      satisfaction_level,
    });
  } catch (error) {
    await captureServerException(error, {
      route: "POST /api/analytics/shutdown-completed",
      method: "POST",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking(
  "POST /api/analytics/shutdown-completed",
  postShutdownCompleted
);
