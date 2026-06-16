"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  clearAuthHashFromUrl,
  parseAuthHashFragment,
} from "@/lib/auth/recoveryHash";
import { PASSWORD_RECOVERY_PATH } from "@/lib/auth/passwordResetRedirect";

const RECOVERY_TARGET = PASSWORD_RECOVERY_PATH;

/**
 * Reset-links zetten tokens in de URL-hash. De server ziet die niet.
 * Dit effect stuurt door zodra Supabase een recovery-sessie heeft gezet.
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
    let unsubscribe: (() => void) | null = null;
    const retryTimers: ReturnType<typeof setTimeout>[] = [];

    const goToWachtwoordInstellen = () => {
      const p = pathnameRef.current ?? "";
      if (p === RECOVERY_TARGET || p.startsWith(`${RECOVERY_TARGET}/`)) {
        return;
      }
      clearAuthHashFromUrl();
      router.replace(RECOVERY_TARGET);
    };

    const trySession = async (
      getSession: () => Promise<{ data: { session: unknown } }>
    ) => {
      const { data } = await getSession();
      if (cancelled) return false;
      if (data.session) {
        goToWachtwoordInstellen();
        return true;
      }
      return false;
    };

    void import("@/lib/supabase/client").then(({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient();
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const parsed = parseAuthHashFragment(hash);

      if (parsed.hasAuthError) {
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          if (parsed.hasRecoveryTokens || hash.includes("type=recovery")) {
            goToWachtwoordInstellen();
          }
        }
      });
      unsubscribe = () => subscription.unsubscribe();

      if (!parsed.hasRecoveryTokens && !hash.includes("type=recovery")) {
        return;
      }

      const poll = async () => {
        if (await trySession(() => supabase.auth.getSession())) return;
        for (const delayMs of [100, 300, 800]) {
          retryTimers.push(
            setTimeout(() => {
              void trySession(() => supabase.auth.getSession());
            }, delayMs)
          );
        }
      };

      void poll();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      for (const timer of retryTimers) clearTimeout(timer);
    };
  }, [router]);

  return null;
}
