import type { Locale } from "./types";
import {
  privacyBodyEnV11,
  privacyBodyNlV11,
  termsBodyEnV11,
  termsBodyNlV11,
} from "./legalBodiesNlV11";

/**
 * Teksten voor /privacy en /terms (LegalStaticPage).
 * NL en EN: privacy v1.1, terms v1.1.
 */
export const legalLocaleBundles: Record<Locale, { legal: Record<string, string> }> = {
  nl: {
    legal: {
      backLogin: "Terug naar inloggen",
      backSettings: "Terug naar instellingen",
      backHome: "Terug naar home",
      privacyTitle: "Privacybeleid",
      privacyUpdated: "Versie 1.1, geldig vanaf 26 mei 2026.",
      privacyBody: privacyBodyNlV11,
      termsTitle: "Algemene voorwaarden",
      termsUpdated: "Versie 1.1, geldig vanaf 26 mei 2026.",
      termsBody: termsBodyNlV11,
    },
  },
  en: {
    legal: {
      backLogin: "Back to sign in",
      backSettings: "Back to settings",
      backHome: "Back to home",
      privacyTitle: "Privacy policy",
      privacyUpdated: "Version 1.1, effective from 26 May 2026.",
      privacyBody: privacyBodyEnV11,
      termsTitle: "Terms of use",
      termsUpdated: "Version 1.1, effective from 26 May 2026.",
      termsBody: termsBodyEnV11,
    },
  },
};
