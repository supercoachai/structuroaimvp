/** Marketing-wachtlijst zonder app-shell (structuro.ai). */
export function isWaitlistMarketingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === "/wachtlijst" ||
    pathname.startsWith("/wachtlijst/") ||
    pathname === "/inschrijven" ||
    pathname.startsWith("/inschrijven/")
  );
}
