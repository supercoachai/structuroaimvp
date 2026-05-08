import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** True: lokaal / expliciete dev-flag; anti-misbruik-checks mogen dan worden overgeslagen als er geen key is. */
export function subscriptionGuardsAllowMissingServiceRoleKey(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.STRUCTURO_DEV_SKIP_SUBSCRIPTION === "1"
  );
}

export type CheckoutServiceRoleGate =
  | { ok: true; admin: SupabaseClient }
  | { ok: true; admin: null; skippedGuardsNoAdmin: true }
  | { ok: false; response: NextResponse };

/**
 * Checkout: fail-closed op preview/productie zonder key.
 * Development of STRUCTURO_DEV_SKIP_SUBSCRIPTION: waarschuwing, geen prior-refund query (geen stille fail-open elders).
 */
export function gateCheckoutServiceRole(): CheckoutServiceRoleGate {
  const admin = createServiceRoleClient();
  if (admin) return { ok: true, admin };
  if (subscriptionGuardsAllowMissingServiceRoleKey()) {
    console.warn(
      "[checkout] SUPABASE_SERVICE_ROLE_KEY ontbreekt: prior-refund check wordt overgeslagen (alleen development / STRUCTURO_DEV_SKIP_SUBSCRIPTION=1)."
    );
    return { ok: true, admin: null, skippedGuardsNoAdmin: true };
  }
  console.error(
    "[checkout] SUPABASE_SERVICE_ROLE_KEY ontbreekt: weiger checkout (zet key op preview/productie)."
  );
  return {
    ok: false,
    response: NextResponse.json({ error: "service_role_key_missing" }, { status: 500 }),
  };
}

export type RefundServiceRoleGate =
  | { ok: true; admin: SupabaseClient }
  | { ok: false; response: NextResponse };

/**
 * Self-service refund gebruikt service role voor cross-profile query + update; zonder key altijd 500 (ook in dev).
 */
export function gateRefundServiceRole(): RefundServiceRoleGate {
  const admin = createServiceRoleClient();
  if (admin) return { ok: true, admin };
  console.error(
    "[refund] SUPABASE_SERVICE_ROLE_KEY ontbreekt: self-service refund kan niet (vereist service role)."
  );
  return {
    ok: false,
    response: NextResponse.json(
      { success: false, error: "service_role_key_missing" },
      { status: 500 }
    ),
  };
}
