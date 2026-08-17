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

  it("blokkeert consent/auth/install/abonnement paden", () => {
    expect(isPushSoftPromptPathBlocked("/consent")).toBe(true);
    expect(isPushSoftPromptPathBlocked("/login")).toBe(true);
    expect(isPushSoftPromptPathBlocked("/welkom/install")).toBe(true);
    expect(isPushSoftPromptPathBlocked("/auth/callback")).toBe(true);
    expect(isPushSoftPromptPathBlocked("/abonnement")).toBe(true);
    expect(isPushSoftPromptPathBlocked("/abonnement?start_trial=1")).toBe(true);
    expect(isPushSoftPromptPathBlocked("/stop-abonnement")).toBe(true);
    expect(isPushSoftPromptPathBlocked("/")).toBe(false);
    expect(isPushSoftPromptPathBlocked("/dagstart")).toBe(false);
    expect(isPushSoftPromptPathBlocked("/settings")).toBe(false);
  });

  it("toont niet zonder privacy setup, app-toegang of bij granted", () => {
    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: false,
        permission: "default",
        pathname: "/",
        hasAppAccess: true,
        softPromptDone: false,
      })
    ).toBe(false);

    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "default",
        pathname: "/",
        hasAppAccess: false,
        softPromptDone: false,
      })
    ).toBe(false);

    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "granted",
        pathname: "/",
        hasAppAccess: true,
        softPromptDone: false,
      })
    ).toBe(false);
  });

  it("toont één keer bij default permission op home na trial", () => {
    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "default",
        pathname: "/",
        hasAppAccess: true,
        softPromptDone: false,
      })
    ).toBe(true);

    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "default",
        pathname: "/dagstart",
        hasAppAccess: true,
        softPromptDone: false,
      })
    ).toBe(true);

    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "default",
        pathname: "/",
        hasAppAccess: true,
        softPromptDone: true,
      })
    ).toBe(false);
  });

  it("toont niet op /abonnement ook met app-toegang", () => {
    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "default",
        pathname: "/abonnement",
        hasAppAccess: true,
        softPromptDone: false,
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
        hasAppAccess: true,
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
        hasAppAccess: true,
      })
    ).toBe(false);
  });

  it("toont niet bij unsupported", () => {
    expect(
      shouldShowPushSoftPrompt({
        privacySetupCompleted: true,
        permission: "unsupported",
        pathname: "/",
        hasAppAccess: true,
        softPromptDone: false,
      })
    ).toBe(false);
  });
});
