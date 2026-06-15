/** Legacy marketing-URLs die alleen doorverwijzen (geen app-shell nodig). */
export function isWaitlistMarketingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === "/wachtlijst" ||
    pathname.startsWith("/wachtlijst/") ||
    pathname === "/inschrijven" ||
    pathname.startsWith("/inschrijven/")
  );
}

/**
 * Publieke acquisitie-routes (TikTok, registreren, toekomstige campagne-LP's).
 * Cookieless analytics + server-side landing-tracking, geen privacy-setup vereist.
 */
export function isAcquisitionMarketingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (isWaitlistMarketingPath(pathname)) return true;
  if (pathname === "/registreren" || pathname.startsWith("/registreren/")) return true;
  if (pathname === "/tiktok" || pathname.startsWith("/tiktok/")) return true;
  if (pathname === "/start" || pathname.startsWith("/start/")) return true;
  return false;
}

/** Aanbevolen landings-URL voor TikTok Promote (UTM's voor PostHog-filter). */
export { tiktokPromoteLandingUrl as TIKTOK_PROMOTE_LANDING_URL } from "@/lib/acquisition/bridgePaths";
export { buildOrganicStartUrl as ORGANIC_START_LANDING_URL_BUILDER } from "@/lib/acquisition/bridgePaths";
