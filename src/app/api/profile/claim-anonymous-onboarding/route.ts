import { NextResponse } from "next/server";

import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";
import { ONBOARDING_VERSION_CURRENT } from "@/lib/onboardingVersion";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { DagstartEnergy } from "@/lib/supabase/profileDagstartDb";

export const runtime = "nodejs";

function parseEnergy(raw: unknown): DagstartEnergy {
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return "medium";
}

/**
 * Na e-mail/passkey-signup vanuit anonieme acquisitie (/jasper, /start, /tiktok):
 * zelfde service-role upsert als /auth/callback, zodat onboarding_completed en
 * last_dagstart_date betrouwbaar gezet worden (geen fragile client .update()).
 */
async function postClaimAnonymousOnboarding(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { energy?: unknown; displayName?: unknown };
  try {
    body = (await request.json()) as { energy?: unknown; displayName?: unknown };
  } catch {
    body = {};
  }

  const energy = parseEnergy(body.energy);
  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim().slice(0, 200) : "";

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  const today = getCalendarDateAmsterdam();
  const { error: writeError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      onboarding_completed: true,
      onboarding_version: ONBOARDING_VERSION_CURRENT,
      last_dagstart_date: today,
      dagstart_energy: energy,
      dagstart_completed_at: new Date().toISOString(),
      ...(displayName.length >= 2
        ? { display_name: displayName, preferred_name: displayName }
        : {}),
      ...(user.email ? { email: user.email } : {}),
    },
    { onConflict: "id" }
  );

  if (writeError) {
    return NextResponse.json({ error: writeError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, last_dagstart_date: today });
}

export const POST = withApiErrorTracking(
  "POST /api/profile/claim-anonymous-onboarding",
  postClaimAnonymousOnboarding
);
