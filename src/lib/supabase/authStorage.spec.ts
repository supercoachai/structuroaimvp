import { afterEach, describe, expect, it, vi } from "vitest";

import { hasSupabaseAuthHintOnClient } from "./authStorage";

function stubBrowser(cookies: string, storage: Record<string, string> = {}) {
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", {
    cookie: cookies,
  });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage[key] ?? null,
  });
}

describe("hasSupabaseAuthHintOnClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("herkent structuro-auth cookie", () => {
    stubBrowser("structuro-auth=session; path=/");
    expect(hasSupabaseAuthHintOnClient()).toBe(true);
  });

  it("herkent legacy sb-*-auth-token cookie", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdxyz.supabase.co");
    stubBrowser("sb-abcdxyz-auth-token=legacy; path=/");
    expect(hasSupabaseAuthHintOnClient()).toBe(true);
  });

  it("is false zonder cookie of storage", () => {
    stubBrowser("");
    expect(hasSupabaseAuthHintOnClient()).toBe(false);
  });
});
