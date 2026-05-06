import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const TABLES_WITH_USER_ID = [
  "tasks",
  "daily_checkins",
  "daily_shutdowns",
  "parked_thoughts",
  "gamification_data",
  "user_insights",
  "push_subscriptions",
  "shutdown_reminder_sends",
] as const;

export async function POST() {
  let service;
  try {
    service = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Service role niet geconfigureerd";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.id;

  try {
    for (const table of TABLES_WITH_USER_ID) {
      const { error } = await service.from(table).delete().eq("user_id", uid);
      if (error && !String(error.message).includes("does not exist")) {
        console.error(`[account/delete] ${table}`, error.message);
      }
    }

    const { error: profErr } = await service.from("profiles").delete().eq("id", uid);
    if (profErr && !String(profErr.message).includes("does not exist")) {
      console.error("[account/delete] profiles", profErr.message);
    }

    const { error: admErr } = await service.auth.admin.deleteUser(uid);
    if (admErr) {
      return NextResponse.json({ error: admErr.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
