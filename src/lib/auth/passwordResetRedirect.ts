import { resolveTrustedAppOrigin } from "@/lib/safeRedirect";

export const PASSWORD_RECOVERY_PATH = "/auth/wachtwoord-instellen";

export function isPasswordRecoverySetupPath(pathname: string): boolean {
  return (
    pathname === PASSWORD_RECOVERY_PATH ||
    pathname.startsWith(`${PASSWORD_RECOVERY_PATH}/`)
  );
}

/**
 * Direct naar de client-pagina. PKCE levert ?code=; implicit levert #type=recovery.
 * Client-side exchange werkt betrouwbaarder dan server callback + httpOnly cookies.
 */
export function buildPasswordResetRedirectUrl(requestOrigin: string): string {
  const origin = resolveTrustedAppOrigin(requestOrigin);
  return `${origin}${PASSWORD_RECOVERY_PATH}`;
}
