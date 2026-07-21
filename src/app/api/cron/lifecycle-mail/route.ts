import { NextResponse } from "next/server";

import { runLifecycleBatch } from "@/lib/lifecycleMail/runBatch";
import type { LifecycleWave } from "@/lib/lifecycleMail/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function assertCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function parseWave(raw: string | null): LifecycleWave | null {
  if (raw === "welcome" || raw === "morning" || raw === "evening") return raw;
  return null;
}

/**
 * Lifecycle mail batch.
 *
 * GET /api/cron/lifecycle-mail?wave=welcome|morning|evening
 * Optional: &dryRun=1 &full=1 (S1–S6) &limit=50
 *
 * Auth: Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: Request) {
  if (!assertCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const wave = parseWave(url.searchParams.get("wave"));
  if (!wave) {
    return NextResponse.json(
      { error: "Missing or invalid wave (welcome|morning|evening)" },
      { status: 400 }
    );
  }

  const dryRun =
    url.searchParams.get("dryRun") === "1" ||
    url.searchParams.get("dry_run") === "1";
  const p0Only = url.searchParams.get("full") !== "1";
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 200;

  try {
    const result = await runLifecycleBatch({
      wave,
      dryRun,
      p0Only,
      limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 200,
    });
    return NextResponse.json({
      ok: true,
      wave: result.wave,
      dryRun: result.dryRun,
      audience: result.audience,
      note: result.note,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      outcomes: result.outcomes.slice(0, 100),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/lifecycle-mail]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
