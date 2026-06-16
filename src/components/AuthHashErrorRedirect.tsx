"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import {
  clearAuthHashFromUrl,
  parseAuthHashFragment,
} from "@/lib/auth/recoveryHash";

/**
 * Supabase stuurt auth-fouten (bijv. otp_expired) naar de Site URL met #error=… .
 * Als die Site URL /login is, zie je een lege login met een lelijke hash in de adresbalk.
 */
export function AuthHashErrorRedirect() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === "#") return;

    const parsed = parseAuthHashFragment(hash);
    if (!parsed.hasAuthError || parsed.hasRecoveryTokens) return;
    if (pathname?.startsWith("/auth/auth-code-error")) return;

    const params = new URLSearchParams();
    if (parsed.errorCode) params.set("error_code", parsed.errorCode);
    if (parsed.errorDescription) {
      params.set("error_description", parsed.errorDescription);
    }
    if (parsed.type) params.set("error", parsed.type);

    clearAuthHashFromUrl();
    window.location.replace(
      `/auth/auth-code-error?${params.toString()}`
    );
  }, [pathname]);

  return null;
}
