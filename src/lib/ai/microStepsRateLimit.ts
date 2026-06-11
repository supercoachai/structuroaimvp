import { MICRO_STEPS_DAILY_LIMIT } from "@/lib/ai/microStepsModel";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/** Controleert dagelijkse quota zonder verbruik (vóór AI-generatie). */
export async function peekMicroStepsAiQuota(
  supabase: SupabaseClient,
  limit: number = MICRO_STEPS_DAILY_LIMIT
): Promise<MicroStepsQuotaResult> {
  const capped = Math.min(Math.max(limit, 1), MICRO_STEPS_DAILY_LIMIT);
  const { data, error } = await supabase.rpc("peek_ai_micro_steps_quota", {
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
  supabase: SupabaseClient,
  limit: number = MICRO_STEPS_DAILY_LIMIT
): Promise<MicroStepsQuotaResult> {
  const capped = Math.min(Math.max(limit, 1), MICRO_STEPS_DAILY_LIMIT);
  const { data, error } = await supabase.rpc("consume_ai_micro_steps_quota", {
    p_limit: capped,
  });

  if (error) {
    console.error("consume_ai_micro_steps_quota:", error);
    throw new Error("quota_check_failed");
  }

  return parseQuotaPayload(data, capped);
}
