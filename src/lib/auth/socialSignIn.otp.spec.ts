import { describe, expect, it, vi } from "vitest";

import { verifyLoginEmailOtp, verifySignupEmailOtp } from "./socialSignIn";

function mockClient(result: {
  data?: { user?: { id: string; email?: string }; session?: { user: { id: string; email?: string } } };
  error?: { message: string } | null;
}) {
  return {
    auth: {
      verifyOtp: vi.fn().mockResolvedValue({
        data: result.data ?? { user: null, session: null },
        error: result.error ?? null,
      }),
    },
  };
}

describe("verifyLoginEmailOtp", () => {
  it("weigert ongeldige code-vorm", async () => {
    const supabase = mockClient({});
    await expect(
      verifyLoginEmailOtp(supabase as never, "a@b.nl", "12ab")
    ).rejects.toThrow("invalid_otp");
  });

  it("roept verifyOtp type email aan", async () => {
    const supabase = mockClient({
      data: { user: { id: "u1", email: "a@b.nl" } },
    });
    const user = await verifyLoginEmailOtp(supabase as never, "a@b.nl", "123456");
    expect(user.id).toBe("u1");
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      email: "a@b.nl",
      token: "123456",
      type: "email",
    });
  });
});

describe("verifySignupEmailOtp", () => {
  it("gebruikt type signup", async () => {
    const supabase = mockClient({
      data: { session: { user: { id: "u2", email: "c@d.nl" } } },
    });
    const user = await verifySignupEmailOtp(supabase as never, "c@d.nl", "654321");
    expect(user.id).toBe("u2");
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      email: "c@d.nl",
      token: "654321",
      type: "signup",
    });
  });
});
