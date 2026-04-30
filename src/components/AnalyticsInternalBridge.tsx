"use client";

import { useEffect } from "react";
import { syncAnalyticsExclusionFromSessionEmail } from "@/lib/analyticsInternal";

/**
 * Houd analytics-uitsluiting gelijk met Supabase-sessie (login, logout, token refresh).
 */
export function AnalyticsInternalBridge() {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const apply = (email: string | null | undefined) => {
      syncAnalyticsExclusionFromSessionEmail(email ?? null);
    };

    void import("@/lib/supabase/client").then(({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient();

      void supabase.auth.getSession().then(({ data }) => {
        if (!cancelled) apply(data.session?.user?.email ?? null);
      });

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) apply(session?.user?.email ?? null);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return null;
}
