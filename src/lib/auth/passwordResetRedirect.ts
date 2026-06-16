import { resolveTrustedAppOrigin } from "@/lib/safeRedirect";

export const PASSWORD_RECOVERY_PATH = "/auth/wachtwoord-instellen";

export function isPasswordRecoverySetupPath(pathname: string): boolean {
  return (
    pathname === PASSWORD_RECOVERY_PATH ||
    pathname.startsWith(`${PASSWORD_RECOVERY_PATH}/`)
  );
}

/**
 * PKCE recovery links landen op /auth/callback?code=…&next=… .
 * Implicit (legacy) links landen op callback?next=…#access_token=…&type=recovery .
 */
export function buildPasswordResetRedirectUrl(requestOrigin: string): string {
  const origin = resolveTrustedAppOrigin(requestOrigin);
  const next = encodeURIComponent(PASSWORD_RECOVERY_PATH);
  return `${origin}/auth/callback?next=${next}`;
}
