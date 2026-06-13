import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

export const runtime = "nodejs";

async function postDisplayName(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { displayName?: unknown };
  try {
    body = (await request.json()) as { displayName?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  const patch = raw
    ? {
        display_name: raw,
        preferred_name: raw,
        ...(user.email ? { email: user.email } : {}),
      }
    : {
        display_name: null,
        preferred_name: null,
        ...(user.email ? { email: user.email } : {}),
      };

  const { error: writeError } = await admin.from("profiles").upsert(
    { id: user.id, ...patch },
    { onConflict: "id" }
  );

  if (writeError) {
    return NextResponse.json({ error: writeError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking("POST /api/profile/display-name", postDisplayName);
