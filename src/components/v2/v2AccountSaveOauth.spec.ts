import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  consumeAccountSaveOauthPending,
  startGoogleAccountSaveOauth,
  V2_ACCOUNT_SAVE_OAUTH_PENDING_KEY,
} from "./v2AccountSaveOauth";
import { peekV2PostAccountNamePending } from "./v2PostAccountName";

function installStorage() {
  const session = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => {
      session.set(k, String(v));
    },
    removeItem: (k: string) => {
      session.delete(k);
    },
    clear: () => session.clear(),
  };
  vi.stubGlobal("sessionStorage", sessionStorage);
  vi.stubGlobal("window", {
    sessionStorage,
    location: { origin: "https://onboarding.test" },
  });
  return sessionStorage;
}

/**
 * Regressietest voor de "terug van Google"-bug: de naamstap mocht nooit
 * zichtbaar zijn zonder sessie. Root cause was dat het account-save-scherm
 * de naam-pending vlag al zette vóórdat Google-redirect plaatsvond, zodat
 * een afgebroken login + terug-navigatie de vlag liet staan.
 */
describe("v2AccountSaveOauth", () => {
  beforeEach(() => {
    installStorage();
  });

  it("start Google OAuth zet alleen de oauth-pending vlag, nooit de naam-pending vlag", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
    const supabase = { auth: { signInWithOAuth } } as unknown as Parameters<
      typeof startGoogleAccountSaveOauth
    >[0];

    await startGoogleAccountSaveOauth(supabase, "/onboarding?name=1");

    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" }),
    );
    expect(sessionStorage.getItem(V2_ACCOUNT_SAVE_OAUTH_PENDING_KEY)).toBe(
      "1",
    );
    expect(peekV2PostAccountNamePending()).toBe(false);
    expect(consumeAccountSaveOauthPending()).toBe(true);
  });

  it("propageert een OAuth-fout zonder de naam-pending vlag te zetten", async () => {
    const signInWithOAuth = vi
      .fn()
      .mockResolvedValue({ error: new Error("boom") });
    const supabase = { auth: { signInWithOAuth } } as unknown as Parameters<
      typeof startGoogleAccountSaveOauth
    >[0];

    await expect(
      startGoogleAccountSaveOauth(supabase, "/onboarding?name=1"),
    ).rejects.toThrow("boom");
    expect(peekV2PostAccountNamePending()).toBe(false);
  });
});
