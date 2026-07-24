import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/authStorage", () => ({
  hasSupabaseAuthHintOnClient: () => false,
}));

import { markV2FirstValue } from "./v2CycleOptInPrompt";
import {
  canOfferShutdownNotification,
  fireV2ShutdownNotification,
  isShutdownNotificationWindow,
  shouldShowShutdownNudge,
} from "./v2ShutdownNudge";
import type { V2State } from "./V2Context";

const baseState: V2State = {
  name: "",
  energy: "enough",
  things: ["Iets"],
  why: "",
  whyOutcome: "",
  todayDone: false,
  cyclusOptIn: false,
};

function installLocalStorage() {
  const store = new Map<string, string>();
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
  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

describe("shouldShowShutdownNudge", () => {
  beforeEach(() => {
    installLocalStorage();
    vi.useRealTimers();
  });

  it("toont nooit meer als home-kaart", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T21:30:00"));
    markV2FirstValue(new Date("2026-07-24T21:30:00"));
    expect(shouldShowShutdownNudge(baseState)).toBe(false);
  });
});

describe("canOfferShutdownNotification", () => {
  beforeEach(() => {
    installLocalStorage();
    vi.useRealTimers();
  });

  it("nee vóór firstValue", () => {
    expect(canOfferShutdownNotification(baseState)).toBe(false);
  });

  it("ja na firstValue met open dag", () => {
    markV2FirstValue();
    expect(canOfferShutdownNotification(baseState)).toBe(true);
  });

  it("nee als dag al afgesloten", () => {
    markV2FirstValue();
    expect(canOfferShutdownNotification({ ...baseState, todayDone: true })).toBe(false);
  });
});

describe("isShutdownNotificationWindow", () => {
  it("false vóór 21:30", () => {
    expect(isShutdownNotificationWindow(new Date("2026-07-24T21:29:00"))).toBe(false);
  });

  it("true vanaf 21:30", () => {
    expect(isShutdownNotificationWindow(new Date("2026-07-24T21:30:00"))).toBe(true);
  });
});

describe("fireV2ShutdownNotification", () => {
  beforeEach(() => {
    installLocalStorage();
    vi.useRealTimers();
  });

  it("vuurt niet zonder Notification permission", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T21:30:00"));
    markV2FirstValue(new Date("2026-07-24T21:30:00"));
    const NotificationMock = Object.assign(vi.fn(), { permission: "default" as const });
    vi.stubGlobal("Notification", NotificationMock);
    vi.stubGlobal("window", { localStorage: window.localStorage, Notification: NotificationMock });
    expect(fireV2ShutdownNotification(baseState)).toBe(false);
  });

  it("vuurt met granted permission in venster", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T21:30:00"));
    markV2FirstValue(new Date("2026-07-24T21:30:00"));
    const notify = vi.fn();
    const NotificationMock = Object.assign(notify, { permission: "granted" as const });
    vi.stubGlobal("Notification", NotificationMock);
    vi.stubGlobal("window", { localStorage: window.localStorage, Notification: NotificationMock });
    expect(fireV2ShutdownNotification(baseState)).toBe(true);
    expect(notify).toHaveBeenCalledOnce();
  });
});
