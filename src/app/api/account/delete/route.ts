import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * Atomair account-verwijderverzoek (must-fix #2 uit docs/compliance-review.md).
 *
 * Stappen:
 *   1. RPC `delete_account_data(uuid)` wist alle gebruikersrijen + auditlog in 1 transactie.
 *   2. `auth.admin.signOut(jwt, 'global')` invalideert alle JWTs voor de huidige user
 *      (best-effort; valt stil als sessie-JWT niet leesbaar is). `deleteUser` maakt later
 *      sowieso alle sessies ongeldig.
 *   3. `auth.admin.deleteUser(uid)` verwijdert de auth.users-rij.
 *   4. Response 204 met `Set-Cookie Max-Age=0` voor sb-access-token / sb-refresh-token,
 *      zodat de huidige tab geen stale cookie meer mee stuurt.
 *
 * Voorkomt partial-delete (audit §C.4) en stale-session na succesvolle wis.
 */
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

  let currentJwt: string | null = null;
  try {
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession();
    currentJwt = session?.access_token ?? null;
  } catch {
    /* signOut wordt overgeslagen; deleteUser invalideert tokens alsnog */
  }

  try {
    const { error: rpcErr } = await service.rpc("delete_account_data", {
      p_user_id: uid,
    });
    if (rpcErr) {
      console.error("[account/delete] rpc", rpcErr.message);
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }

    if (currentJwt) {
      const { error: signOutErr } = await service.auth.admin.signOut(
        currentJwt,
        "global"
      );
      if (signOutErr) {
        console.error("[account/delete] signOut", signOutErr.message);
      }
    }

    const { error: admErr } = await service.auth.admin.deleteUser(uid);
    if (admErr) {
      console.error("[account/delete] admin", admErr.message);
      return NextResponse.json({ error: admErr.message }, { status: 500 });
    }

    const res = new NextResponse(null, { status: 204 });
    for (const name of ["sb-access-token", "sb-refresh-token"]) {
      res.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
