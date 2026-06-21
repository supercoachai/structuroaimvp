import { NextResponse } from "next/server";

import { createRouteHandlerSupabaseClient } from "@/lib/supabase/routeHandlerClient";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

/**
 * Markeer profiles.password_setup_completed = true voor de ingelogde gebruiker.
 *
 * Waarom server-side i.p.v. een directe browser-update: supabase.auth.updateUser()
 * met een nieuw wachtwoord rouleert de sessie-JWT. Een PostgREST-update die daar
 * direct op volgt vanuit de browser kan met een verouderde token vertrekken,
 * waardoor RLS auth.uid() niet matcht en de update stil 0 rijen raakt. De vlag
 * blijft dan false en de middleware stuurt de gebruiker eindeloos terug naar
 * /auth/wachtwoord-aanmaken (waar hetzelfde wachtwoord een 422 "same_password"
 * geeft). De cookie-sessie hier is stabiel en de service-role-write omzeilt RLS.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  const supabase = await createRouteHandlerSupabaseClient(response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json(
      { ok: false, error: "no_session" },
      { status: 401 }
    );
  }

  const admin = createServiceRoleClient();
  const writer = admin ?? supabase;
  const { error } = await writer
    .from("profiles")
    .update({ password_setup_completed: true })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return response;
}
