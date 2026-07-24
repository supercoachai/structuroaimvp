import { describe, expect, it } from "vitest";

import { cycleLocale } from "@/lib/i18n/cycleLocale";

/** Doctrine: cyclus = inzicht + reminder, nooit sturing van voorstellen. */
const STEERING_PATTERNS = [
  /minder taken/i,
  /meer in je pieken/i,
  /stemt .* voorstellen af/i,
  /vraagt het minder/i,
  /laten meebewegen/i,
  /move with your phase/i,
  /How Structuro plans/i,
  /Hoe Structuro plant/i,
  /Smaller steps today/i,
  /Kleinere stappen vandaag/i,
];

describe("cycle discovery doctrine copy", () => {
  it("NL discovery bevat inzicht-framing en geen stuur-promises", () => {
    const nl = cycleLocale.nl;
    expect(nl.discoverHintEyebrow.toLowerCase()).toContain("eenmalig");
    expect(nl.discoverTitle).toMatch(/cyclus meenemen/i);
    expect(nl.discoverEnable).toMatch(/Ja, meenemen/);
    expect(nl.discoverNotNow).toMatch(/Nee, niet nodig/);
    expect(nl.discoverBody.toLowerCase()).toMatch(/inzicht|reminder/);
    expect(nl.discoverBody.toLowerCase()).toMatch(/nooit/);
    expect(nl.discoverHow2Em.toLowerCase()).toContain("nooit in plaats van");
    expect(nl.infoSheetPlanTitle).toMatch(/Wat Structuro doet/);
    expect(nl.infoSheetPlanBody.toLowerCase()).toMatch(/geen sturing/);

    const blob = Object.values(nl).join("\n");
    for (const re of STEERING_PATTERNS) {
      expect(blob, `NL moet niet matchen: ${re}`).not.toMatch(re);
    }
  });

  it("EN discovery mirrors doctrine (insight, no steering)", () => {
    const en = cycleLocale.en;
    expect(en.discoverEnable).toMatch(/Yes, include it/);
    expect(en.discoverNotNow).toMatch(/No, not needed/);
    expect(en.discoverBody.toLowerCase()).toMatch(/insight|reminder/);
    expect(en.infoSheetPlanTitle).toMatch(/What Structuro does/);
    expect(en.infoSheetPlanBody.toLowerCase()).toMatch(/no steering/);

    const blob = Object.values(en).join("\n");
    for (const re of STEERING_PATTERNS) {
      expect(blob, `EN moet niet matchen: ${re}`).not.toMatch(re);
    }
  });
});
