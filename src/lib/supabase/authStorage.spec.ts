import { afterEach, describe, expect, it, vi } from "vitest";

import {
  collectAuthCookieNamesToClear,
  hasSupabaseAuthHintOnClient,
} from "./authStorage";

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

describe("collectAuthCookieNamesToClear", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("wist structuro-auth chunks en legacy sb-cookies", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdxyz.supabase.co");
    const names = collectAuthCookieNamesToClear(
      "structuro-auth.0=a; structuro-auth.1=b; sb-abcdxyz-auth-token.0=c"
    );
    expect(names).toContain("structuro-auth");
    expect(names).toContain("structuro-auth.0");
    expect(names).toContain("structuro-auth.1");
    expect(names).toContain("sb-abcdxyz-auth-token");
    expect(names).toContain("sb-abcdxyz-auth-token.0");
  });
});
