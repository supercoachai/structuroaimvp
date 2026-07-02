import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { isProtectedTestAccount } from "@/lib/protectedTestAccount";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { captureServerException } from "@/lib/posthog/server";
import { extractPostHogSessionIdFromRequest } from "@/lib/posthog/postHogCookie";

const ROUTE_LABEL = "POST /api/account/delete";

type DeleteFailureCase =
  | "service_role_unavailable"
  | "delete_failed"
  | "auth_delete_failed";

/**
 * De afgehandelde faalpaden (503/500) retourneren JSON zonder te throwen, dus
 * withApiErrorTracking vangt ze niet. Zonder deze expliciete capture is een
 * mislukte AVG-verwijdering onzichtbaar in telemetrie (geen $exception, geen
 * error-tracking issue). We sturen een exception met $session_id mee zodat de
 * faal-branche zichtbaar is én te koppelen aan de session replay.
 */
async function captureDeleteFailure(
  request: Request,
  failureCase: DeleteFailureCase,
  detail?: string
): Promise<void> {
  const sessionId = extractPostHogSessionIdFromRequest(request.headers);
  await captureServerException(
    new Error(`account_delete_failed:${failureCase}`),
    {
      route: ROUTE_LABEL,
      method: "POST",
      sessionId,
      extra: {
        account_delete_failure: failureCase,
        ...(detail ? { detail } : {}),
      },
    }
  );
}

/**
 * Definitieve account-verwijdering (AVG art. 17 - recht op vergetelheid).
 *
 * Stappen:
 *   1. delete_account_data(uuid) wist alle gebruikersrijen + geanonimiseerde auditrij in 1 transactie.
 *   2. auth.admin.deleteUser(uid) verwijdert de auth.users-rij (invalideert alle sessies/JWTs).
 *   3. 204 + Max-Age=0 op de auth-cookies zodat de huidige tab geen stale sessie meestuurt.
 *
 * Beschermd testaccount wordt server-side geweigerd (defense in depth naast de client-guard).
 *
 * Twee stappen (data-RPC, daarna auth-delete) zijn bewust niet één transactie: Supabase auth
 * leeft buiten Postgres. Als stap 2 faalt na stap 1, is de PII-data al weg (AVG voldaan) en
 * blijft hooguit een loze auth-user achter. De call is idempotent: opnieuw POST'en draait de
 * (no-op) data-delete en retry't auth-delete. De route geeft dan 500 zodat de client kan retryen.
 */
async function postDeleteAccount(request: Request): Promise<Response> {
  const service = createServiceRoleClient();
  if (!service) {
    await captureDeleteFailure(request, "service_role_unavailable");
    return NextResponse.json(
      { error: "service_role_unavailable" },
      { status: 503 }
    );
  }

  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (isProtectedTestAccount(user.email ?? null)) {
    return NextResponse.json({ error: "protected_account" }, { status: 403 });
  }

  const uid = user.id;

  const { error: rpcError } = await service.rpc("delete_account_data", {
    p_user_id: uid,
  });
  if (rpcError) {
    console.error("[account/delete] rpc", rpcError.message);
    await captureDeleteFailure(request, "delete_failed", rpcError.message);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  const { error: adminError } = await service.auth.admin.deleteUser(uid);
  if (adminError) {
    console.error("[account/delete] admin.deleteUser", adminError.message);
    await captureDeleteFailure(request, "auth_delete_failed", adminError.message);
    return NextResponse.json({ error: "auth_delete_failed" }, { status: 500 });
  }

  const response = new NextResponse(null, { status: 204 });
  for (const name of ["sb-access-token", "sb-refresh-token"]) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return response;
}

export const POST = withApiErrorTracking("POST /api/account/delete", postDeleteAccount);
