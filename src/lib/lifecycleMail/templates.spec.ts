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
  subscription_current_period_end: null,
  last_dagstart_date: null,
  unsubscribe_lifecycle: false,
  is_test: false,
  app_trial_override_until: null,
  checkout_started_at: null,
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
    expect(mail.ctaPath).toBe("/?dagstart=open");
    expect(mail.cohortKey).toBe("hello:u1");
    expect(mail.html).toContain("Naar dagstart");
    expect(mail.html).toContain("Welkom bij Structuro");
    expect(mail.text).toContain("Naar dagstart");
    expect(mail.html).not.toContain("—");
  });

  it("S0 checkout resume: geruststelling + CTA abonnement", () => {
    const mail = renderLifecycleMail(
      "s0_checkout_resume",
      { ...base, checkin_count: 1, last_checkin_date: "2026-07-15" },
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.subject).toMatch(/7-daagse proef$/i);
    expect(mail.subject.toLowerCase()).not.toMatch(/belast\s*$/);
    expect(mail.html.toLowerCase()).not.toContain("belast");
    expect(mail.ctaPath).toBe("/abonnement");
    expect(mail.html).toContain("7-daagse proef");
    expect(mail.html).toContain("dagstart");
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

  it("S0 welcome wijst naar v1 dagstart tijdens lockdown", () => {
    const mail = renderLifecycleMail(
      "s0_welcome",
      base,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.ctaPath).toBe("/?dagstart=open");
  });

  it("S5 wijst naar /abonnement met why, prijs en garantie-subline", () => {
    const mail = renderLifecycleMail(
      "s5_paywall",
      base,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.ctaPath).toBe("/abonnement");
    expect(mail.cohortKey).toBe("paywall:u1");
    expect(mail.html).toContain("Ja, ik ga door");
    expect(mail.html).toContain("€12,99 per maand");
    expect(mail.html).toContain("Geld terug, geen vragen");
    expect(mail.html).toContain("vandaag te beginnen");
    expect(mail.text).toContain("Geld terug, geen vragen");
    expect(mail.html).not.toContain("—");
  });

  it("S5 Jasper noemt podcast-proef en 7,99-aanbieding", () => {
    const mail = renderLifecycleMail(
      "s5_paywall",
      { ...base, signup_source: "jasper_podcast", preferred_name: "Mariska" },
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.ctaPath).toBe("/abonnement");
    expect(mail.subject.toLowerCase()).toContain("podcast");
    expect(mail.html).toContain("podcast met Jasper");
    expect(mail.html).toContain("7,99");
    expect(mail.html).toContain("eerste 3 maanden");
    expect(mail.html).toContain("12,99");
    expect(mail.html).toContain("Ga door met Structuro");
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
    expect(mail.text).toContain("3 dagen");
    expect(mail.text).toContain("Geen creditcard nodig");
  });

  it("S0 hello voor card-cohort: 7 dagen, geen creditcard-claim", () => {
    const mail = renderLifecycleMail(
      "s0_hello",
      { ...base, created_at: "2026-07-29T10:00:00.000Z" },
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.text).toContain("7 dagen");
    expect(mail.text).not.toContain("Geen creditcard nodig");
    expect(mail.text).toContain("Opzeggen doe je later");
  });

  it("S4 card-trialing noemt bedrag, datum en stop-CTA", () => {
    const mail = renderLifecycleMail(
      "s4_pre_paywall",
      {
        ...base,
        subscription_status: "trialing",
        subscription_current_period_end: "2026-08-05T10:00:00.000Z",
        checkin_count: 4,
      },
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x",
      new Date("2026-08-04T12:00:00.000Z"),
      { cancelUrl: "https://www.structuro.ai/stop-abonnement?token=abc" }
    );
    expect(mail.html).toContain("Stop abonnement");
    expect(mail.html).toContain("€12,99");
    expect(mail.html).toContain("één klik opzeggen");
    expect(mail.html).not.toContain("Geen automatische charge");
    expect(mail.ctaPath).toContain("/stop-abonnement");
    expect(mail.subject).toMatch(/eindigt op/i);
  });

  it("S4 zonder card-trial: kies-CTA en trust-subline", () => {
    const mail = renderLifecycleMail(
      "s4_pre_paywall",
      { ...base, checkin_count: 5 },
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.html).toContain("Kies of je doorgaat");
    expect(mail.html).toContain("5 dagstarts");
    expect(mail.html).toContain("Geen automatische charge");
    expect(mail.text).toContain("Geen automatische charge");
  });

  it("S6 winback telt geen opens en deelt preview met body", () => {
    const mail = renderLifecycleMail(
      "s6_winback",
      { ...base, checkin_count: 3 },
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.ctaPath).toBe("/");
    expect(mail.html).toContain("Open Structuro");
    expect(mail.html).toContain("Geen inhalen nodig");
    expect(mail.text).toContain("Geen inhalen nodig");
    expect(mail.html).not.toContain("opende Structuro");
    expect(mail.text).not.toContain("opende Structuro");
    expect(mail.html).toContain("&zwnj;&nbsp;");
    expect(mail.html).not.toContain("—");
  });

  it("soft never-started winback noemt account zonder checkin-schuld", () => {
    const mail = renderLifecycleMail(
      "s_winback_never_started",
      { ...base, checkin_count: 0 },
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.cohortKey).toBe("winback-never:u1");
    expect(mail.subject).toContain("je maakte ooit een account");
    expect(mail.text).toContain("Je maakte ooit een Structuro-account");
    expect(mail.text).toContain("Beginnen is het zware deel");
    expect(mail.html).not.toContain("—");
    expect(mail.text).not.toContain("—");
  });

  it("WARM winback noemt één dagstart", () => {
    const mail = renderLifecycleMail(
      "s_winback_warm",
      { ...base, checkin_count: 1 },
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=x"
    );
    expect(mail.cohortKey).toBe("winback-warm:u1");
    expect(mail.subject).toContain("je begon met één dagstart");
    expect(mail.text).toContain("één dagstart");
    expect(mail.html).not.toContain("—");
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
    expect(mail.text).toContain("Je proefperiode loopt bijna af");
  });
});
