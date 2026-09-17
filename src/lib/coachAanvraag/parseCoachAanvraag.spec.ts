import { describe, expect, it } from "vitest";

import {
  coachAanvraagMail,
  parseCoachAanvraag,
} from "./parseCoachAanvraag";

const valid = {
  naam: "Lisa de Vries",
  praktijk: "Praktijk Stil",
  website: "https://praktijkstil.nl",
  email: "lisa@praktijkstil.nl",
  toelichting: "Tussen sessies zakt de start eruit.",
  besloten: true,
};

describe("parseCoachAanvraag", () => {
  it("accepteert een complete aanvraag", () => {
    const parsed = parseCoachAanvraag(valid);
    expect(parsed).toEqual({
      ok: true,
      honeypot: false,
      fields: {
        naam: "Lisa de Vries",
        praktijk: "Praktijk Stil",
        website: "https://praktijkstil.nl",
        email: "lisa@praktijkstil.nl",
        toelichting: "Tussen sessies zakt de start eruit.",
        utmContent: "",
      },
    });
  });

  it("slikt honeypot stil in als gelukt, zonder velden", () => {
    const parsed = parseCoachAanvraag({ ...valid, company: "bot" });
    expect(parsed).toEqual({ ok: true, honeypot: true });
  });

  it("wijst af zonder naam, mail of vinkje", () => {
    expect(parseCoachAanvraag({ ...valid, naam: "" }).ok).toBe(false);
    expect(parseCoachAanvraag({ ...valid, email: "niet-mail" }).ok).toBe(false);
    expect(parseCoachAanvraag({ ...valid, besloten: false }).ok).toBe(false);
  });

  it("zet utm_content schoon in het onderwerp", () => {
    const parsed = parseCoachAanvraag({
      ...valid,
      utmContent: "coach_niels!",
    });
    expect(parsed.ok && !parsed.honeypot && parsed.fields.utmContent).toBe(
      "coach_niels"
    );
    if (!parsed.ok || parsed.honeypot) return;
    expect(coachAanvraagMail(parsed.fields).subject).toContain("(coach_niels)");
    expect(coachAanvraagMail(parsed.fields).text).toContain("Lisa de Vries");
  });
});
