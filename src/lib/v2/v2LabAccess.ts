/**
 * Interne v2-lab routes (niet acquisitie/productpad).
 * Exact `/v2` toont de scherm-directory met private testlinks.
 * `/v2/jasper` is een private podcast-variant.
 *
 * Acquisitie blijft v1 (`/start` → `/onboarding`). Lab alleen voor team/test.
 */

export function isV2LabPath(pathname: string): boolean {
  if (pathname === "/v2" || pathname === "/v2/") return true;
  if (pathname === "/v2/jasper" || pathname.startsWith("/v2/jasper/")) {
    return true;
  }
  return false;
}
