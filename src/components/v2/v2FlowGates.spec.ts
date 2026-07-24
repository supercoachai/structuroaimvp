import { beforeEach, describe, expect, it, vi } from "vitest";

import { STRUCTURO_SUPABASE_AUTH_STORAGE_KEY } from "@/lib/supabase/authStorage";

import {
  shouldShowV2CycleDiscovery,
  shouldShowV2CycleModeToggle,
} from "./v2FlowGates";

function installWindow(authHint: boolean) {
  const store = new Map<string, string>();
  if (authHint) {
    store.set(STRUCTURO_SUPABASE_AUTH_STORAGE_KEY, "session");
  }
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("document", { cookie: "" });
  vi.stubGlobal("window", { localStorage });
}

describe("v2FlowGates", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("SSR (geen window): cyclus-discovery false (niet als first-paint state gebruiken)", () => {
    vi.stubGlobal("window", undefined);
    expect(shouldShowV2CycleDiscovery()).toBe(false);
    expect(shouldShowV2CycleModeToggle()).toBe(false);
  });

  it("toont cyclus-discovery alleen voor guests", () => {
    installWindow(false);
    expect(shouldShowV2CycleDiscovery()).toBe(true);
  });

  it("slaat cyclus-discovery over bij account-sessie", () => {
    installWindow(true);
    expect(shouldShowV2CycleDiscovery()).toBe(false);
  });
});
