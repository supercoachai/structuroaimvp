/**
 * Na v2-register: altijd eerst waarde (onboarding), niet PWA-tutorial.
 * Install blijft bereikbaar via settings (/welkom/install?from=settings).
 */
export function v2RouteAfterRegister(): "/onboarding" {
  return "/onboarding";
}
