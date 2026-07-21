/**
 * Na v2-register: altijd eerst waarde (onboarding), niet PWA-tutorial.
 * Install blijft bereikbaar via settings (/v2/install?from=settings).
 */
export function v2RouteAfterRegister(): "/v2/onboarding" {
  return "/v2/onboarding";
}
