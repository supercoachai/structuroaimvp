/** Legacy marketing-URLs die alleen doorverwijzen (geen app-shell nodig). */
export function isWaitlistMarketingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const legacy =
    pathname === "/wachtlijst" ||
    pathname.startsWith("/wachtlijst/") ||
    pathname === "/inschrijven" ||
    pathname.startsWith("/inschrijven/");
  if (!legacy) return false;
  return !pathname.startsWith("/wachtlijst/admin");
}
