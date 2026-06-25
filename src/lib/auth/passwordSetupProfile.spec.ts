import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  markPasswordSetupCompleted,
  markPasswordSetupCompletedReliably,
} from "./passwordSetupProfile";

describe("markPasswordSetupCompletedReliably", () => {
  const userId = "user-123";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when the server route succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true } as Response)
    );

    const supabase = {
      from: vi.fn(),
    } as unknown as Parameters<typeof markPasswordSetupCompletedReliably>[0];

    const result = await markPasswordSetupCompletedReliably(supabase, userId);

    expect(result.error).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("falls back to the direct profile update when the server route fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false } as Response)
    );

    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const from = vi.fn().mockReturnValue({ update });
    const supabase = { from } as unknown as Parameters<
      typeof markPasswordSetupCompletedReliably
    >[0];

    const result = await markPasswordSetupCompletedReliably(supabase, userId);

    expect(result.error).toBeNull();
    expect(from).toHaveBeenCalledWith("profiles");
    expect(update).toHaveBeenCalledWith({ password_setup_completed: true });
  });
});

describe("markPasswordSetupCompleted", () => {
  it("updates the profile row for the given user", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    const supabase = { from } as unknown as Parameters<
      typeof markPasswordSetupCompleted
    >[0];

    const result = await markPasswordSetupCompleted(supabase, "user-abc");

    expect(result.error).toBeNull();
    expect(eq).toHaveBeenCalledWith("id", "user-abc");
  });
});
