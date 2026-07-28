/**
 * v2 rollout gate.
 *
 * Productie: standaard UIT. Alle `/v2` en `/v2/*` alleen voor team/test.
 * Vanavond openen: `STRUCTURO_V2_PUBLIC=1` én `NEXT_PUBLIC_STRUCTURO_V2_PUBLIC=1`
 * in Vercel (zelfde patroon als registratie-launch).
 *
 * Lokaal (`NODE_ENV=development`): open, tenzij expliciet `STRUCTURO_V2_PUBLIC=0`
 * (server) of `NEXT_PUBLIC_STRUCTURO_V2_PUBLIC=0` (client).
 *
 * Lab-index (`/v2`) en `/v2/jasper` blijven ook ná openen team/test-only.
 */

/** Server/middleware: mag de v2-shell publiek? */
export function isV2PublicEnabled(): boolean {
  if (process.env.NODE_ENV === "development") {
    return (
      process.env.STRUCTURO_V2_PUBLIC !== "0" &&
      process.env.NEXT_PUBLIC_STRUCTURO_V2_PUBLIC !== "0"
    );
  }
  return (
    process.env.STRUCTURO_V2_PUBLIC === "1" ||
    process.env.NEXT_PUBLIC_STRUCTURO_V2_PUBLIC === "1"
  );
}

/** Client cutovers (PrivacySetup, post-auth, signup). */
export function isV2PublicEnabledClient(): boolean {
  if (process.env.NODE_ENV === "development") {
    return process.env.NEXT_PUBLIC_STRUCTURO_V2_PUBLIC !== "0";
  }
  return process.env.NEXT_PUBLIC_STRUCTURO_V2_PUBLIC === "1";
}

export function isV2AppPath(pathname: string): boolean {
  return pathname === "/v2" || pathname.startsWith("/v2/");
}

/**
 * Interne lab-directory (niet acquisitie/productpad), ook als v2 publiek is.
 * Exact `/v2` toont de scherm-directory. `/v2/jasper` is private podcast-variant.
 */
export function isV2LabPath(pathname: string): boolean {
  if (pathname === "/v2" || pathname === "/v2/") return true;
  if (pathname === "/v2/jasper" || pathname.startsWith("/v2/jasper/")) {
    return true;
  }
  return false;
}

/**
 * One-click cancel moet blijven werken tijdens lockdown (mail-CTA met token).
 */
export function isV2LockdownExemptPath(pathname: string): boolean {
  return (
    pathname === "/v2/stop-abonnement" ||
    pathname.startsWith("/v2/stop-abonnement/")
  );
}

/** Map een /v2-pad naar het v1-equivalent (ingelogde bounce). */
export function mapV2PathToV1(pathname: string): string {
  if (
    pathname === "/v2" ||
    pathname === "/v2/" ||
    pathname === "/v2/home" ||
    pathname.startsWith("/v2/home/")
  ) {
    return "/";
  }
  if (pathname === "/v2/onboarding" || pathname.startsWith("/v2/onboarding/")) {
    return "/onboarding";
  }
  if (pathname === "/v2/abonnement" || pathname.startsWith("/v2/abonnement/")) {
    return "/abonnement";
  }
  if (pathname === "/v2/login" || pathname.startsWith("/v2/login/")) {
    return "/login";
  }
  if (pathname === "/v2/register" || pathname.startsWith("/v2/register/")) {
    return "/login";
  }
  if (pathname === "/v2/dagstart" || pathname.startsWith("/v2/dagstart/")) {
    return "/";
  }
  if (pathname === "/v2/privacy" || pathname.startsWith("/v2/privacy/")) {
    return "/privacy";
  }
  if (pathname === "/v2/terms" || pathname.startsWith("/v2/terms/")) {
    return "/terms";
  }
  if (pathname === "/v2/settings" || pathname.startsWith("/v2/settings/")) {
    return "/settings";
  }
  if (pathname === "/v2/focus" || pathname.startsWith("/v2/focus/")) {
    return "/focus";
  }
  if (pathname === "/v2/todo" || pathname.startsWith("/v2/todo/")) {
    return "/todo";
  }
  if (pathname === "/v2/shutdown" || pathname.startsWith("/v2/shutdown/")) {
    return "/shutdown";
  }
  if (pathname === "/v2/install" || pathname.startsWith("/v2/install/")) {
    return "/";
  }
  if (pathname === "/v2/dump" || pathname.startsWith("/v2/dump/")) {
    return "/";
  }
  return "/";
}

/**
 * Bounce-doel wanneer v2 gelockt is.
 * Anon: `/`, `/start`, `/login` of `/abonnement` naar gelang pad.
 * Ingelogd: v1-equivalent.
 */
export function resolveV2LockdownBouncePath(
  pathname: string,
  isLoggedIn: boolean
): string {
  if (isLoggedIn) return mapV2PathToV1(pathname);

  if (pathname === "/v2/login" || pathname.startsWith("/v2/login/")) {
    return "/login";
  }
  if (pathname === "/v2/register" || pathname.startsWith("/v2/register/")) {
    return "/login";
  }
  if (pathname === "/v2/onboarding" || pathname.startsWith("/v2/onboarding/")) {
    return "/start";
  }
  if (pathname === "/v2/abonnement" || pathname.startsWith("/v2/abonnement/")) {
    return "/abonnement";
  }
  return "/";
}

/** Live-shell home: v2 als publiek, anders v1-root. */
export function resolveLiveHomePath(): string {
  return isV2PublicEnabled() ? "/v2/home" : "/";
}

export function resolveLiveHomePathClient(): string {
  return isV2PublicEnabledClient() ? "/v2/home" : "/";
}

/** Paywall-pad: v2 als publiek, anders v1. */
export function resolveLivePaywallPath(): string {
  return isV2PublicEnabled() ? "/v2/abonnement" : "/abonnement";
}

export function resolveLivePaywallPathClient(): string {
  return isV2PublicEnabledClient() ? "/v2/abonnement" : "/abonnement";
}
