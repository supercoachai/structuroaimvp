"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { parseAuthHashFragment } from "@/lib/auth/recoveryHash";
import { PASSWORD_RECOVERY_PATH } from "@/lib/auth/passwordResetRedirect";
import { establishSessionFromAuthHash } from "@/lib/auth/waitForAuthSession";

const RECOVERY_TARGET = PASSWORD_RECOVERY_PATH;

/**
 * Reset-links zetten tokens in de URL-hash. De server ziet die niet.
 * Zet sessie expliciet vóór redirect, anders gaat de hash verloren.
 */
export function PasswordRecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname ?? "";
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    void import("@/lib/supabase/client").then(({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient();
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const parsed = parseAuthHashFragment(hash);

      if (parsed.hasAuthError) return;
      if (!parsed.hasAuthTokens && !parsed.hasRecoveryTokens) return;

      const p = pathnameRef.current ?? "";
      if (p === RECOVERY_TARGET || p.startsWith(`${RECOVERY_TARGET}/`)) {
        return;
      }

      void (async () => {
        await establishSessionFromAuthHash(supabase);
        if (cancelled) return;
        router.replace(RECOVERY_TARGET);
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return null;
}
