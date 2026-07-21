import { describe, expect, it } from "vitest";

import { renderLifecycleMail } from "./templates";
import type { LifecycleCandidate } from "./types";

const base: LifecycleCandidate = {
  user_id: "u1",
  email: "a@example.com",
  preferred_name: "Sam",
  created_at: "2026-07-15T10:00:00.000Z",
  signup_source: null,
  subscription_status: "none",
  last_dagstart_date: null,
  unsubscribe_lifecycle: false,
  is_test: false,
  app_trial_override_until: null,
  checkin_count: 0,
  last_checkin_date: null,
};

describe("lifecycleMail templates", () => {
  it("S0 heeft één CTA en geen em-dash", () => {
    const mail = renderLifecycleMail(
      "s0_welcome",
      base,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.subject).toBe("Je account staat klaar");
    expect(mail.text).toContain("Naar dagstart");
    expect(mail.text).not.toContain("—");
    expect(mail.html).toContain("Naar dagstart");
    expect(mail.html).toContain("Afmelden");
  });

  it("S5 wijst naar /abonnement", () => {
    const mail = renderLifecycleMail(
      "s5_paywall",
      base,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.ctaPath).toBe("/abonnement");
    expect(mail.cohortKey).toBe("paywall:u1");
  });
});
