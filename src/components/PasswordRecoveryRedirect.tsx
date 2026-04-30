"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Na een reset-link in de mail: implicit flow zet soms tokens in de hash op /login.
 * Server-middleware ziet de hash niet; deze effect zorgt dat we alsnog naar
 * /auth/wachtwoord-instellen gaan zodra de recovery-sessie staat.
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

    const goToWachtwoordInstellen = () => {
      const p = pathnameRef.current ?? "";
      if (p === "/auth/wachtwoord-instellen" || p.startsWith("/auth/wachtwoord-instellen/")) {
        return;
      }
      router.replace("/auth/wachtwoord-instellen");
    };

    void import("@/lib/supabase/client").then(({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          goToWachtwoordInstellen();
        }
      });
      unsubscribe = () => subscription.unsubscribe();

      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash.includes("type=recovery")) {
        requestAnimationFrame(() => {
          void supabase.auth.getSession().then(({ data }) => {
            if (cancelled) return;
            if (data.session) {
              goToWachtwoordInstellen();
              try {
                window.history.replaceState(
                  null,
                  "",
                  window.location.pathname + window.location.search
                );
              } catch {
                /* ignore */
              }
            }
          });
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router]);

  return null;
}
