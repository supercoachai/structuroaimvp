import { describe, expect, it } from "vitest";

import {
  greetingLine,
  renderLifecycleMail,
  resolveGreetingName,
} from "./templates";
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
    expect(mail.html).toContain("Hoi Sam,");
    expect(mail.text).toContain("Hoi Sam,");
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

  it("gebruikt sans-serif brand styling (geen Georgia body)", () => {
    const mail = renderLifecycleMail(
      "s4_pre_paywall",
      base,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.html).not.toContain("Georgia");
    expect(mail.html).toContain("sans-serif");
    expect(mail.html).toContain("#FDFBF4");
    expect(mail.html).toContain("#2D5A56");
    expect(mail.html).toContain("#1A2340");
    expect(mail.html).toContain("font-size:16px");
    expect(mail.html).not.toContain("—");
    expect(mail.text).not.toContain("—");
  });

  it("heeft founder-contactkaart met foto en naam", () => {
    const mail = renderLifecycleMail(
      "s4_pre_paywall",
      base,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.html).toContain("/jasper/niels.jpg");
    expect(mail.html).toContain("Niels van den Hurk");
    expect(mail.html).toContain("Founder Structuro");
    expect(mail.html).toContain("border-radius:50%");
    expect(mail.text).toContain("Niels van den Hurk");
    expect(mail.text).toContain("Founder Structuro");
    expect(mail.text).not.toMatch(/^Groet,\nNiels$/m);
  });

  it("skip placeholder-namen in aanhef", () => {
    expect(resolveGreetingName({ ...base, preferred_name: "Gebruiker" })).toBeNull();
    expect(resolveGreetingName({ ...base, preferred_name: null })).toBeNull();
    expect(resolveGreetingName({ ...base, preferred_name: "  " })).toBeNull();
    expect(resolveGreetingName({ ...base, preferred_name: "Niels Hurkx" })).toBe(
      "Niels"
    );
    expect(greetingLine({ ...base, preferred_name: "Gebruiker" })).toBe("Hoi,");
    expect(greetingLine({ ...base, preferred_name: "Sam" })).toBe("Hoi Sam,");

    const mail = renderLifecycleMail(
      "s4_pre_paywall",
      { ...base, preferred_name: "Gebruiker" },
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.html).toContain("Hoi,");
    expect(mail.html).not.toContain("Hoi Gebruiker");
    expect(mail.text).toContain("Hoi,");
    expect(mail.text).not.toContain("Hoi Gebruiker");
  });
});
