import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isDagstartGateExemptPath,
  isV2AppShellDagstartPath,
  shouldRedirectToDagstart,
} from "./dagstartGate";

describe("isV2AppShellDagstartPath", () => {
  it("covers home and core app shell", () => {
    expect(isV2AppShellDagstartPath("/")).toBe(true);
    expect(isV2AppShellDagstartPath("/todo")).toBe(true);
    expect(isV2AppShellDagstartPath("/todo/x")).toBe(true);
    expect(isV2AppShellDagstartPath("/focus")).toBe(true);
    expect(isV2AppShellDagstartPath("/shutdown")).toBe(true);
    expect(isV2AppShellDagstartPath("/dump")).toBe(true);
    expect(isV2AppShellDagstartPath("/settings")).toBe(true);
  });

  it("excludes auth, dagstart and marketing", () => {
    expect(isV2AppShellDagstartPath("/dagstart")).toBe(false);
    expect(isV2AppShellDagstartPath("/login")).toBe(false);
    expect(isV2AppShellDagstartPath("/onboarding")).toBe(false);
    expect(isV2AppShellDagstartPath("/start")).toBe(false);
    expect(isV2AppShellDagstartPath("/abonnement")).toBe(false);
  });
});

describe("isDagstartGateExemptPath", () => {
  it("exempts auth, legal, marketing and api", () => {
    for (const p of [
      "/dagstart",
      "/login",
      "/auth/callback",
      "/onboarding",
      "/registreren",
      "/start",
      "/en/start",
      "/tiktok",
      "/abonnement",
      "/stop-abonnement",
      "/privacy",
      "/terms",
      "/api/tasks",
      "/welkom/install",
    ]) {
      expect(isDagstartGateExemptPath(p)).toBe(true);
    }
  });

  it("does not exempt app shell", () => {
    expect(isDagstartGateExemptPath("/")).toBe(false);
    expect(isDagstartGateExemptPath("/todo")).toBe(false);
    expect(isDagstartGateExemptPath("/focus")).toBe(false);
  });
});

describe("shouldRedirectToDagstart", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("redirects when last date is missing or stale vs Amsterdam today", () => {
    // 2026-07-29 00:30 Amsterdam = 2026-07-28 22:30 UTC (CEST)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T22:30:00.000Z"));

    expect(shouldRedirectToDagstart(null)).toBe(true);
    expect(shouldRedirectToDagstart("")).toBe(true);
    expect(shouldRedirectToDagstart("2026-07-28")).toBe(true);
    expect(shouldRedirectToDagstart("2026-07-29")).toBe(false);
  });
});
