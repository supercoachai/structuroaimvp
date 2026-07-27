import { describe, expect, it } from "vitest";

import {
  greetingLine,
  personalizedSubject,
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
  it("S0 hello is directe welkom met CTA naar dagstart", () => {
    const mail = renderLifecycleMail(
      "s0_hello",
      base,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.subject).toBe("Sam, welkom bij Structuro");
    expect(mail.ctaPath).toBe("/v2/dagstart");
    expect(mail.cohortKey).toBe("hello:u1");
    expect(mail.html).toContain("Naar dagstart");
    expect(mail.html).toContain("Welkom bij Structuro");
    expect(mail.text).toContain("Naar dagstart");
    expect(mail.html).not.toContain("—");
  });

  it("S0 welcome nudge heeft CTA Begin vandaag", () => {
    const mail = renderLifecycleMail(
      "s0_welcome",
      base,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.subject).toBe("Sam, je account staat klaar");
    expect(mail.text).toContain("Begin vandaag");
    expect(mail.text).not.toContain("—");
    expect(mail.html).toContain("Begin vandaag");
    expect(mail.html).toContain("Afmelden");
    expect(mail.html).toContain("Hoi Sam,");
    expect(mail.text).toContain("Hoi Sam,");
  });

  it("S0 welcome wijst naar /v2/dagstart", () => {
    const mail = renderLifecycleMail(
      "s0_welcome",
      base,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.ctaPath).toBe("/v2/dagstart");
  });

  it("S5 wijst naar /v2/abonnement met why, prijs en garantie-subline", () => {
    const mail = renderLifecycleMail(
      "s5_paywall",
      base,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.ctaPath).toBe("/v2/abonnement");
    expect(mail.cohortKey).toBe("paywall:u1");
    expect(mail.html).toContain("Ja, ik ga door");
    expect(mail.html).toContain("€12,99 per maand");
    expect(mail.html).toContain("Geld terug, geen vragen");
    expect(mail.html).toContain("vandaag te beginnen");
    expect(mail.text).toContain("Geld terug, geen vragen");
    expect(mail.html).not.toContain("—");
  });

  it("S0 hello noemt alleen-vandaag principe", () => {
    const mail = renderLifecycleMail(
      "s0_hello",
      base,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.text).toContain("Alleen vandaag");
    expect(mail.text).toContain("geen lijst die groeit");
  });

  it("S4 gebruikt checkins en trust-subline", () => {
    const mail = renderLifecycleMail(
      "s4_pre_paywall",
      { ...base, checkin_count: 5 },
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.html).toContain("Kies of je doorgaat");
    expect(mail.html).toContain("5 keer");
    expect(mail.html).toContain("Geen automatische charge");
    expect(mail.text).toContain("Geen automatische charge");
  });

  it("gebruikt logo-header, sans body, teksthandtekening zonder foto", () => {
    const mail = renderLifecycleMail(
      "s4_pre_paywall",
      base,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    // Wordmark mag serif (Georgia); body blijft sans-serif.
    expect(mail.html).toContain("Georgia");
    expect(mail.html).toContain("sans-serif");
    expect(mail.html).toContain("#FDFBF4");
    expect(mail.html).toContain("#2D5A56");
    expect(mail.html).toContain("#1A2340");
    expect(mail.html).toContain("font-size:16px");
    expect(mail.html).toContain("/v2/logo-mark.png");
    expect(mail.html).toContain("Niels van den Hurk");
    expect(mail.html).toContain("Founder Structuro");
    expect(mail.html).not.toContain("niels-email-avatar");
    expect(mail.html).not.toContain("niels.jpg");
    expect(mail.html).not.toContain("/jasper/");
    expect(mail.html).not.toContain("text-transform:uppercase");
    expect(mail.html).not.toContain("—");
    expect(mail.text).not.toContain("—");
  });

  it("skip placeholder-namen: geen kale Hoi,", () => {
    expect(resolveGreetingName({ ...base, preferred_name: "Gebruiker" })).toBeNull();
    expect(resolveGreetingName({ ...base, preferred_name: null })).toBeNull();
    expect(resolveGreetingName({ ...base, preferred_name: "  " })).toBeNull();
    expect(resolveGreetingName({ ...base, preferred_name: "Niels Hurkx" })).toBe(
      "Niels"
    );
    expect(greetingLine({ ...base, preferred_name: "Gebruiker" })).toBeNull();
    expect(greetingLine({ ...base, preferred_name: "Sam" })).toBe("Hoi Sam,");
    expect(personalizedSubject(null, "Morgen kies je of je door wilt")).toBe(
      "Morgen kies je of je door wilt"
    );
    expect(personalizedSubject("Sam", "Morgen kies je of je door wilt")).toBe(
      "Sam, morgen kies je of je door wilt"
    );

    const mail = renderLifecycleMail(
      "s4_pre_paywall",
      { ...base, preferred_name: "Gebruiker" },
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.html).not.toContain("Hoi,");
    expect(mail.html).not.toContain("Hoi Gebruiker");
    expect(mail.text).not.toContain("Hoi,");
    expect(mail.text).not.toContain("Hoi Gebruiker");
    expect(mail.subject).toBe("Morgen kies je of je door wilt");
    expect(mail.text.startsWith("Je proefperiode")).toBe(true);
  });
});
