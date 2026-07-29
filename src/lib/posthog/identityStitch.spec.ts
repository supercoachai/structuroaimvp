import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const identify = vi.fn();
const alias = vi.fn();
const getDistinctId = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    identify: (...args: unknown[]) => identify(...args),
    alias: (...args: unknown[]) => alias(...args),
    get_distinct_id: () => getDistinctId(),
  },
}));

function installLocalStorageMock() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("window", { localStorage: localStorageMock });
}

installLocalStorageMock();

import {
  ANON_DISTINCT_STORAGE_KEY,
  IDENTIFIED_USER_STORAGE_KEY,
  aliasAnonymousFromMetadataIfNeeded,
  clearIdentityStitchOnLogout,
  linkAnonymousDistinctToUser,
  persistAnonymousDistinctIdForStitch,
} from "./identityStitch";

describe("identityStitch", () => {
  beforeEach(() => {
    localStorage.clear();
    identify.mockClear();
    alias.mockClear();
    getDistinctId.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("identifyt één keer zonder alias", () => {
    getDistinctId.mockReturnValue("anon-abc-12345");
    linkAnonymousDistinctToUser("user-1");
    expect(alias).not.toHaveBeenCalled();
    expect(identify).toHaveBeenCalledTimes(1);
    expect(identify).toHaveBeenCalledWith("user-1");
    expect(localStorage.getItem(IDENTIFIED_USER_STORAGE_KEY)).toBe("user-1");
    expect(localStorage.getItem(ANON_DISTINCT_STORAGE_KEY)).toBeNull();
  });

  it("skipt herhaalde identify zonder nieuwe props", () => {
    getDistinctId.mockReturnValue("user-1");
    localStorage.setItem(IDENTIFIED_USER_STORAGE_KEY, "user-1");
    linkAnonymousDistinctToUser("user-1");
    linkAnonymousDistinctToUser("user-1");
    expect(identify).not.toHaveBeenCalled();
    expect(alias).not.toHaveBeenCalled();
  });

  it("mag identify herhalen om person props te zetten na consent", () => {
    getDistinctId.mockReturnValue("user-1");
    localStorage.setItem(IDENTIFIED_USER_STORAGE_KEY, "user-1");
    linkAnonymousDistinctToUser("user-1", { email: "a@b.nl" });
    expect(alias).not.toHaveBeenCalled();
    expect(identify).toHaveBeenCalledTimes(1);
    expect(identify).toHaveBeenCalledWith("user-1", { email: "a@b.nl" });
  });

  it("persistAnonymousDistinctIdForStitch stopt na identify", () => {
    getDistinctId.mockReturnValue("anon-xyz-99999");
    persistAnonymousDistinctIdForStitch();
    expect(localStorage.getItem(ANON_DISTINCT_STORAGE_KEY)).toBe("anon-xyz-99999");

    localStorage.setItem(IDENTIFIED_USER_STORAGE_KEY, "user-1");
    getDistinctId.mockReturnValue("user-1");
    persistAnonymousDistinctIdForStitch();
    expect(localStorage.getItem(ANON_DISTINCT_STORAGE_KEY)).toBe("anon-xyz-99999");
  });

  it("clearIdentityStitchOnLogout wist flags", () => {
    localStorage.setItem(IDENTIFIED_USER_STORAGE_KEY, "user-1");
    localStorage.setItem(ANON_DISTINCT_STORAGE_KEY, "anon");
    clearIdentityStitchOnLogout();
    expect(localStorage.getItem(IDENTIFIED_USER_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ANON_DISTINCT_STORAGE_KEY)).toBeNull();
  });

  it("aliasAnonymousFromMetadataIfNeeded snapshots anon id voor latere wipe", () => {
    getDistinctId.mockReturnValue("other-device-anon-999");
    aliasAnonymousFromMetadataIfNeeded("user-1", {
      posthog_anon_id: "anon-from-meta-12345",
    });
    expect(alias).toHaveBeenCalledWith("anon-from-meta-12345");
    expect(localStorage.getItem("structuro_ph_aliased_user-1")).toBe(
      "anon-from-meta-12345"
    );

    alias.mockClear();
    // Metadata weg, maar al gealiased → geen tweede alias.
    aliasAnonymousFromMetadataIfNeeded("user-1", {});
    expect(alias).not.toHaveBeenCalled();
  });

  it("aliasAnonymousFromMetadataIfNeeded gebruikt snapshot als metadata leeg is", () => {
    getDistinctId.mockReturnValue("other-device-anon-999");
    localStorage.setItem(
      "structuro_ph_pending_anon_user-2",
      "pending-anon-88888"
    );
    aliasAnonymousFromMetadataIfNeeded("user-2", null);
    expect(alias).toHaveBeenCalledWith("pending-anon-88888");
  });
});
