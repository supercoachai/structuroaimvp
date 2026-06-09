import { MICRO_STEPS_DAILY_LIMIT } from "@/lib/ai/microStepsModel";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MicroStepsQuotaResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
};

/** Reserveert 1 AI-call in de dagelijkse quota (max 30). Templates tellen niet mee. */
export async function consumeMicroStepsAiQuota(
  supabase: SupabaseClient,
  limit: number = MICRO_STEPS_DAILY_LIMIT
): Promise<MicroStepsQuotaResult> {
  const { data, error } = await supabase.rpc("consume_ai_micro_steps_quota", {
    p_limit: limit,
  });

  if (error) {
    console.error("consume_ai_micro_steps_quota:", error);
    throw new Error("quota_check_failed");
  }

  const payload = (data ?? {}) as {
    allowed?: boolean;
    remaining?: number;
    limit?: number;
  };

  return {
    allowed: Boolean(payload.allowed),
    remaining:
      typeof payload.remaining === "number" ? payload.remaining : 0,
    limit: typeof payload.limit === "number" ? payload.limit : limit,
  };
}
