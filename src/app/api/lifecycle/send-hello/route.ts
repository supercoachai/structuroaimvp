import { NextResponse } from "next/server";

import { sendLifecycleHelloMail } from "@/lib/lifecycleMail/sendOne";
import { createClient } from "@/lib/supabase/server";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Directe welkom-mail na signup (client of server).
 * Idempotent: tweede call is already_sent / skip.
 */
async function postSendHello() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await sendLifecycleHelloMail(user.id);
  return NextResponse.json({
    ok: true,
    status: result.status,
    templateId: result.templateId,
    dryRun: result.dryRun,
    audience: result.audience,
    note: result.note,
    error: result.error,
  });
}

export const POST = withApiErrorTracking(
  "POST /api/lifecycle/send-hello",
  postSendHello
);
