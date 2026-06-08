import { createClient } from "@/lib/supabase/server";
import { fetchRetentionStatsForUser } from "@/lib/retentionStatsServer";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function getRetentionStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stats = await fetchRetentionStatsForUser(supabase, user.id);
  return NextResponse.json(stats);
}

export const GET = withApiErrorTracking(
  "GET /api/abonnement/retention-stats",
  getRetentionStats
);
