import { describe, expect, it } from "vitest";

import {
  resolveCompletedLocalOnboardingDestination,
  shouldResetAnonymousOnboarding,
} from "./anonymousOnboardingEntry";

describe("shouldResetAnonymousOnboarding", () => {
  it("reset bij een verse sessie zonder voortgang en zonder taken", () => {
    expect(
      shouldResetAnonymousOnboarding({
        hasCompletedOnboarding: false,
        localTaskCount: 0,
      })
    ).toBe(true);
  });

  it("reset NIET als er een afgeronde anonieme onboarding is", () => {
    expect(
      shouldResetAnonymousOnboarding({
        hasCompletedOnboarding: true,
        localTaskCount: 0,
      })
    ).toBe(false);
  });

  it("reset NIET als er lokale taken zijn", () => {
    expect(
      shouldResetAnonymousOnboarding({
        hasCompletedOnboarding: false,
        localTaskCount: 3,
      })
    ).toBe(false);
  });

  it("reset NIET als er zowel voortgang als taken zijn", () => {
    expect(
      shouldResetAnonymousOnboarding({
        hasCompletedOnboarding: true,
        localTaskCount: 2,
      })
    ).toBe(false);
  });
});

describe("resolveCompletedLocalOnboardingDestination", () => {
  const registrerenHref = "/registreren?source=jasper_podcast&utm_source=jasper_podcast";

  it("stuurt anonieme jasper-acquisitie naar /registreren", () => {
    expect(
      resolveCompletedLocalOnboardingDestination({
        hasAuthHint: false,
        signupSource: "jasper_podcast",
        hasJasperAttribution: true,
        registrerenHref,
      })
    ).toBe(registrerenHref);
  });

  it("stuurt anonieme acquisitie naar /registreren ook zonder jasper-flag (bv. tiktok)", () => {
    expect(
      resolveCompletedLocalOnboardingDestination({
        hasAuthHint: false,
        signupSource: "tiktok",
        hasJasperAttribution: false,
        registrerenHref: "/registreren?source=tiktok&utm_source=tiktok",
      })
    ).toBe("/registreren?source=tiktok&utm_source=tiktok");
  });

  it("gebruikt jasper-localStorage-flag als de sessiebron al gewist is", () => {
    expect(
      resolveCompletedLocalOnboardingDestination({
        hasAuthHint: false,
        signupSource: "direct",
        hasJasperAttribution: true,
        registrerenHref,
      })
    ).toBe(registrerenHref);
  });

  it("stuurt een gewone lokale gebruiker zonder attributie naar de app", () => {
    expect(
      resolveCompletedLocalOnboardingDestination({
        hasAuthHint: false,
        signupSource: "direct",
        hasJasperAttribution: false,
        registrerenHref,
      })
    ).toBe("/");
  });

  it("stuurt een gebruiker met auth-hint naar de app (account bestaat al)", () => {
    expect(
      resolveCompletedLocalOnboardingDestination({
        hasAuthHint: true,
        signupSource: "jasper_podcast",
        hasJasperAttribution: true,
        registrerenHref,
      })
    ).toBe("/");
  });
});
