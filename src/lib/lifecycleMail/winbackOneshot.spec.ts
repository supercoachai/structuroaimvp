import { describe, expect, it } from "vitest";

import {
  isWinbackOneshotExcludedEmail,
  pickWinbackOneshot,
  templateForWinbackSegment,
  winbackSegmentForCheckins,
} from "./winbackOneshot";

describe("winbackOneshot", () => {
  it("mapt checkins naar segment + template", () => {
    expect(winbackSegmentForCheckins(0)).toBe("never_started");
    expect(winbackSegmentForCheckins(1)).toBe("warm");
    expect(winbackSegmentForCheckins(2)).toBe("engaged");
    expect(templateForWinbackSegment("never_started")).toBe(
      "s_winback_never_started"
    );
    expect(templateForWinbackSegment("warm")).toBe("s_winback_warm");
    expect(templateForWinbackSegment("engaged")).toBe("s6_winback");
  });

  it("sluit interne en protected info-adressen uit", () => {
    expect(isWinbackOneshotExcludedEmail("info@structuro.eu")).toBe(true);
    expect(isWinbackOneshotExcludedEmail("niels@structuro.ai")).toBe(true);
    expect(isWinbackOneshotExcludedEmail("info@jasperbuitenhuis.nl")).toBe(
      true
    );
    expect(isWinbackOneshotExcludedEmail("user@gmail.com")).toBe(false);
  });

  it("selecteert trial_expired ≥1 jun per checkin-segment", () => {
    const base = {
      email: "a@example.com",
      created_at: "2026-06-15T10:00:00.000Z",
      subscription_status: "trial_expired",
      unsubscribe_lifecycle: false,
      is_test: false,
      checkin_count: 0,
    };
    expect(pickWinbackOneshot(base)?.templateId).toBe(
      "s_winback_never_started"
    );
    expect(pickWinbackOneshot({ ...base, checkin_count: 1 })?.templateId).toBe(
      "s_winback_warm"
    );
    expect(pickWinbackOneshot({ ...base, checkin_count: 4 })?.templateId).toBe(
      "s6_winback"
    );
  });

  it("sluit pre-juni, paid, test, unsub en actief uit", () => {
    const base = {
      email: "a@example.com",
      created_at: "2026-06-15T10:00:00.000Z",
      subscription_status: "trial_expired",
      unsubscribe_lifecycle: false,
      is_test: false,
      checkin_count: 1,
    };
    expect(
      pickWinbackOneshot({ ...base, created_at: "2026-05-31T20:00:00.000Z" })
    ).toBeNull();
    expect(
      pickWinbackOneshot({ ...base, subscription_status: "active" })
    ).toBeNull();
    expect(
      pickWinbackOneshot({ ...base, subscription_status: "trialing" })
    ).toBeNull();
    expect(pickWinbackOneshot({ ...base, is_test: true })).toBeNull();
    expect(
      pickWinbackOneshot({ ...base, unsubscribe_lifecycle: true })
    ).toBeNull();
    expect(
      pickWinbackOneshot(base, { excludeEmails: ["a@example.com"] })
    ).toBeNull();
  });
});
