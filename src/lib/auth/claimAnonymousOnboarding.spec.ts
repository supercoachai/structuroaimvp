import { beforeEach, describe, expect, it, vi } from "vitest";

const hasCompletedAnonymousOnboarding = vi.fn<() => boolean>();
const getTodayCheckIn = vi.fn<() => { energy_level?: string } | null>();
const migrateLocalTasksToSupabase = vi.fn<(userId: string) => Promise<number>>();
const setDagstartCookieOnClient = vi.fn<() => void>();
const clearStructuroLocalModeCookie = vi.fn<() => void>();
const clearLocalOnboardingDoneCookieOnClient = vi.fn<() => void>();
const fetchMock = vi.fn<typeof fetch>();

vi.mock("@/lib/auth/anonymousOnboardingEntry", () => ({
  hasCompletedAnonymousOnboarding: () => hasCompletedAnonymousOnboarding(),
}));

vi.mock("@/lib/localStorageTasks", () => ({
  getTodayCheckIn: () => getTodayCheckIn(),
}));

vi.mock("@/lib/migrateLocalTasksToSupabase", () => ({
  migrateLocalTasksToSupabase: (userId: string) =>
    migrateLocalTasksToSupabase(userId),
}));

vi.mock("@/lib/dagstartCookie", () => ({
  setDagstartCookieOnClient: () => setDagstartCookieOnClient(),
}));

vi.mock("@/lib/localModeSession", () => ({
  clearStructuroLocalModeCookie: () => clearStructuroLocalModeCookie(),
}));

vi.mock("@/lib/localOnboardingCookie", () => ({
  clearLocalOnboardingDoneCookieOnClient: () =>
    clearLocalOnboardingDoneCookieOnClient(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}));

import { claimAnonymousOnboardingForAccount } from "./claimAnonymousOnboarding";

const USER = "user-abc";

describe("claimAnonymousOnboardingForAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasCompletedAnonymousOnboarding.mockReturnValue(true);
    getTodayCheckIn.mockReturnValue({ energy_level: "medium" });
    migrateLocalTasksToSupabase.mockResolvedValue(1);
    fetchMock.mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn().mockReturnValue("Niels"),
      },
    });
  });

  it("claimt via API met energie uit lokale check-in", async () => {
    const claimed = await claimAnonymousOnboardingForAccount(USER);

    expect(claimed).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/profile/claim-anonymous-onboarding",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ energy: "medium", displayName: "Niels" }),
      })
    );
    expect(setDagstartCookieOnClient).toHaveBeenCalledTimes(1);
  });

  it("gebruikt medium als fallback zonder lokale check-in", async () => {
    getTodayCheckIn.mockReturnValue(null);

    await claimAnonymousOnboardingForAccount(USER);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/profile/claim-anonymous-onboarding",
      expect.objectContaining({
        body: JSON.stringify({ energy: "medium", displayName: "Niels" }),
      })
    );
    expect(setDagstartCookieOnClient).toHaveBeenCalledTimes(1);
  });

  it("leest energie vóór taak-migratie", async () => {
    const callOrder: string[] = [];
    getTodayCheckIn.mockImplementation(() => {
      callOrder.push("read-checkin");
      return { energy_level: "low" };
    });
    migrateLocalTasksToSupabase.mockImplementation(async () => {
      callOrder.push("migrate");
      return 0;
    });
    fetchMock.mockImplementation(async () => {
      callOrder.push("persist-api");
      return { ok: true } as Response;
    });

    await claimAnonymousOnboardingForAccount(USER);

    expect(callOrder).toEqual(["read-checkin", "persist-api", "migrate"]);
  });

  it("doet niets zonder afgeronde anonieme onboarding", async () => {
    hasCompletedAnonymousOnboarding.mockReturnValue(false);

    const claimed = await claimAnonymousOnboardingForAccount(USER);

    expect(claimed).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
