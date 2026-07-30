import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/serviceRole", () => ({
  createServiceRoleClient: vi.fn(),
}));

import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import {
  consumeMicroStepsAiQuota,
  peekMicroStepsAiQuota,
} from "@/lib/ai/microStepsRateLimit";

describe("microStepsRateLimit service role", () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws service_role_unavailable when client missing", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(null);
    await expect(peekMicroStepsAiQuota("u1")).rejects.toThrow(
      "service_role_unavailable"
    );
    await expect(consumeMicroStepsAiQuota("u1")).rejects.toThrow(
      "service_role_unavailable"
    );
  });

  it("passes p_user_id and p_limit via service role client", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({ rpc } as never);
    rpc.mockResolvedValue({
      data: { allowed: true, remaining: 29, limit: 30 },
      error: null,
    });

    await peekMicroStepsAiQuota("user-abc");
    expect(rpc).toHaveBeenCalledWith("peek_ai_micro_steps_quota", {
      p_user_id: "user-abc",
      p_limit: 30,
    });

    await consumeMicroStepsAiQuota("user-abc", 10);
    expect(rpc).toHaveBeenCalledWith("consume_ai_micro_steps_quota", {
      p_user_id: "user-abc",
      p_limit: 10,
    });
  });

  it("throws quota_check_failed on RPC error", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({ rpc } as never);
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(peekMicroStepsAiQuota("user-abc")).rejects.toThrow(
      "quota_check_failed"
    );
  });
});
