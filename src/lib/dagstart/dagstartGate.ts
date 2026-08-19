import { isDagstartNodig } from "@/lib/checkDagstart";

/**
 * V2 app-shell routes waar een ingelogde user na middernacht Amsterdam
 * opnieuw door `/dagstart` moet als vandaag nog niet klaar is.
 * Welkom op `/` voor uitgelogde users blijft mogelijk (geen sessie = geen gate).
 */
const V2_APP_SHELL_DAGSTART_PATHS = [
  "/todo",
  "/focus",
  "/shutdown",
  "/dump",
  "/settings",
] as const;

/** True voor `/` en app-shell paden die dagstart-afdwingen voor authenticated users. */
export function isV2AppShellDagstartPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return V2_APP_SHELL_DAGSTART_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/**
 * Paden die nooit naar `/dagstart` gebounced worden (auth, marketing, legal, API, flow zelf).
 */
export function isDagstartGateExemptPath(pathname: string): boolean {
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname === "/dagstart" || pathname.startsWith("/dagstart/")) return true;
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) return true;
  if (pathname === "/onboardingpro" || pathname.startsWith("/onboardingpro/")) {
    return true;
  }
  if (pathname === "/registreren" || pathname.startsWith("/registreren/")) {
    return true;
  }
  if (pathname === "/consent" || pathname.startsWith("/consent/")) return true;
  if (pathname === "/abonnement" || pathname.startsWith("/abonnement/")) {
    return true;
  }
  if (
    pathname === "/stop-abonnement" ||
    pathname.startsWith("/stop-abonnement/")
  ) {
    return true;
  }
  if (pathname === "/privacy" || pathname.startsWith("/privacy/")) return true;
  if (pathname === "/terms" || pathname.startsWith("/terms/")) return true;
  if (pathname === "/welkom" || pathname.startsWith("/welkom/")) return true;
  if (pathname === "/start" || pathname.startsWith("/start/")) return true;
  if (pathname === "/en/start" || pathname.startsWith("/en/start/")) return true;
  if (pathname === "/tiktok" || pathname.startsWith("/tiktok/")) return true;
  if (pathname === "/en/tiktok" || pathname.startsWith("/en/tiktok/")) {
    return true;
  }
  if (pathname === "/instagram" || pathname.startsWith("/instagram/")) {
    return true;
  }
  if (pathname === "/social" || pathname.startsWith("/social/")) return true;
  if (pathname === "/wachtlijst" || pathname.startsWith("/wachtlijst/")) {
    return true;
  }
  if (pathname === "/inschrijven" || pathname.startsWith("/inschrijven/")) {
    return true;
  }
  if (pathname === "/adhd-cafe" || pathname.startsWith("/adhd-cafe/")) {
    return true;
  }
  if (pathname === "/jasper" || pathname.startsWith("/jasper/")) return true;
  return false;
}

/**
 * Hard redirect nodig wanneer profile.last_dagstart_date ≠ vandaag (Amsterdam).
 * Null/leeg telt als "niet gedaan".
 */
export function shouldRedirectToDagstart(
  lastDagstartDate: string | null | undefined
): boolean {
  return isDagstartNodig(lastDagstartDate);
}
