import { MICRO_STEPS_DAILY_LIMIT } from "@/lib/ai/microStepsModel";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export type MicroStepsQuotaResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
};

function parseQuotaPayload(
  data: unknown,
  fallbackLimit: number
): MicroStepsQuotaResult {
  const payload = (data ?? {}) as {
    allowed?: boolean;
    remaining?: number;
    limit?: number;
  };

  return {
    allowed: Boolean(payload.allowed),
    remaining:
      typeof payload.remaining === "number" ? payload.remaining : 0,
    limit:
      typeof payload.limit === "number" ? payload.limit : fallbackLimit,
  };
}

function requireServiceRoleClient() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    throw new Error("service_role_unavailable");
  }
  return supabase;
}

/** Controleert dagelijkse quota zonder verbruik (vóór AI-generatie). */
export async function peekMicroStepsAiQuota(
  userId: string,
  limit: number = MICRO_STEPS_DAILY_LIMIT
): Promise<MicroStepsQuotaResult> {
  const capped = Math.min(Math.max(limit, 1), MICRO_STEPS_DAILY_LIMIT);
  const supabase = requireServiceRoleClient();
  const { data, error } = await supabase.rpc("peek_ai_micro_steps_quota", {
    p_user_id: userId,
    p_limit: capped,
  });

  if (error) {
    console.error("peek_ai_micro_steps_quota:", error);
    throw new Error("quota_check_failed");
  }

  return parseQuotaPayload(data, capped);
}

/** Reserveert 1 AI-call in de dagelijkse quota (max 30). Templates tellen niet mee. */
export async function consumeMicroStepsAiQuota(
  userId: string,
  limit: number = MICRO_STEPS_DAILY_LIMIT
): Promise<MicroStepsQuotaResult> {
  const capped = Math.min(Math.max(limit, 1), MICRO_STEPS_DAILY_LIMIT);
  const supabase = requireServiceRoleClient();
  const { data, error } = await supabase.rpc("consume_ai_micro_steps_quota", {
    p_user_id: userId,
    p_limit: capped,
  });

  if (error) {
    console.error("consume_ai_micro_steps_quota:", error);
    throw new Error("quota_check_failed");
  }

  return parseQuotaPayload(data, capped);
}
