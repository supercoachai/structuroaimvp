import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PUSH_SOFT_PROMPT_DONE_KEY,
  isPushSoftPromptDone,
  isPushSoftPromptPathBlocked,
  markPushSoftPromptDone,
  shouldShowPushSoftPrompt,
} from "./pushSoftPrompt";

function stubLocalStorage(initial?: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(initial ?? {}));
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", { localStorage });
}

describe("pushSoftPrompt", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blokkeert consent/auth/install paden", () => {
    expect(isPushSoftPromptPathBlocked("/consent")).toBe(true);
    expect(isPushSoftPromptPathBlocked("/login")).toBe(true);
    expect(isPushSoftPromptPathBlocked("/welkom/install")).toBe(true);
    expect(isPushSoftPromptPathBlocked("/auth/callback")).toBe(true);
    expect(isPushSoftPromptPathBlocked("/")).toBe(false);
    expect(isPushSoftPromptPathBlocked("/settings")).toBe(false);
  });

  it("toont niet zonder privacy setup of bij granted", () => {
    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: false,
        permission: "default",
        pathname: "/",
        softPromptDone: false,
      })
    ).toBe(false);

    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "granted",
        pathname: "/",
        softPromptDone: false,
      })
    ).toBe(false);
  });

  it("toont één keer bij default permission op home", () => {
    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "default",
        pathname: "/",
        softPromptDone: false,
      })
    ).toBe(true);

    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "default",
        pathname: "/",
        softPromptDone: true,
      })
    ).toBe(false);
  });

  it("markPushSoftPromptDone voorkomt herhaalde show", () => {
    stubLocalStorage();
    expect(isPushSoftPromptDone()).toBe(false);
    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "default",
        pathname: "/",
      })
    ).toBe(true);

    markPushSoftPromptDone();
    expect(isPushSoftPromptDone()).toBe(true);
    expect(window.localStorage.getItem(PUSH_SOFT_PROMPT_DONE_KEY)).toBe("1");

    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "default",
        pathname: "/",
      })
    ).toBe(false);
  });

  it("toont niet bij unsupported", () => {
    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "unsupported",
        pathname: "/",
        softPromptDone: false,
      })
    ).toBe(false);
  });
});
