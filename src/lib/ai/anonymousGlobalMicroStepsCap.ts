import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

/** Globale noodrem: max anonieme AI-microstappen per UTC-dag (hele app). */
export const ANON_MICRO_STEPS_GLOBAL_DAILY_LIMIT = 100;

export type AnonymousGlobalMicroStepsCap = {
  allowed: boolean;
  remaining: number;
  limit: number;
};

function parsePayload(
  data: unknown,
  fallbackLimit: number,
): AnonymousGlobalMicroStepsCap {
  const payload = (data ?? {}) as {
    allowed?: boolean;
    remaining?: number;
    limit?: number;
  };
  return {
    allowed: Boolean(payload.allowed),
    remaining: typeof payload.remaining === "number" ? payload.remaining : 0,
    limit: typeof payload.limit === "number" ? payload.limit : fallbackLimit,
  };
}

/**
 * Reserveert 1 anonieme AI-call in de globale dagcap.
 * Alleen aanroepen vlak vóór echte AI-generatie (niet voor templates).
 */
export async function consumeAnonymousGlobalMicroStepsCap(
  limit: number = ANON_MICRO_STEPS_GLOBAL_DAILY_LIMIT,
): Promise<AnonymousGlobalMicroStepsCap> {
  const capped = Math.min(Math.max(limit, 1), 10_000);
  const supabase = createServiceRoleClient();
  if (!supabase) {
    throw new Error("service_role_unavailable");
  }

  const { data, error } = await supabase.rpc(
    "consume_anon_ai_micro_steps_global_quota",
    { p_limit: capped },
  );

  if (error) {
    console.error("consume_anon_ai_micro_steps_global_quota:", error);
    throw new Error("global_cap_check_failed");
  }

  return parsePayload(data, capped);
}
