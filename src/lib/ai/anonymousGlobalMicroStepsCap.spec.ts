import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/serviceRole", () => ({
  createServiceRoleClient: vi.fn(),
}));

import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import {
  ANON_MICRO_STEPS_GLOBAL_DAILY_LIMIT,
  consumeAnonymousGlobalMicroStepsCap,
} from "./anonymousGlobalMicroStepsCap";

describe("consumeAnonymousGlobalMicroStepsCap", () => {
  beforeEach(() => {
    vi.mocked(createServiceRoleClient).mockReset();
  });

  it("consume’t via service_role RPC met default limiet 100", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { allowed: true, remaining: 99, limit: 100 },
      error: null,
    });
    vi.mocked(createServiceRoleClient).mockReturnValue({
      rpc,
    } as never);

    const result = await consumeAnonymousGlobalMicroStepsCap();
    expect(result).toEqual({
      allowed: true,
      remaining: 99,
      limit: ANON_MICRO_STEPS_GLOBAL_DAILY_LIMIT,
    });
    expect(rpc).toHaveBeenCalledWith(
      "consume_anon_ai_micro_steps_global_quota",
      { p_limit: ANON_MICRO_STEPS_GLOBAL_DAILY_LIMIT },
    );
  });

  it("gooit als service_role ontbreekt", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(null);
    await expect(consumeAnonymousGlobalMicroStepsCap()).rejects.toThrow(
      "service_role_unavailable",
    );
  });

  it("gooit bij RPC-fout", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "boom" },
      }),
    } as never);
    await expect(consumeAnonymousGlobalMicroStepsCap()).rejects.toThrow(
      "global_cap_check_failed",
    );
  });
});
