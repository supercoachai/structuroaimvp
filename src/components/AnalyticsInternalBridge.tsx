"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { syncAnalyticsExclusionFromSessionEmail } from "@/lib/analyticsInternal";

/**
 * Houd analytics-uitsluiting gelijk met Supabase-sessie (login, logout, token refresh).
 */
export function AnalyticsInternalBridge() {
  useEffect(() => {
    const supabase = createClient();

    const apply = (email: string | null | undefined) => {
      syncAnalyticsExclusionFromSessionEmail(email ?? null);
    };

    void supabase.auth.getSession().then(({ data }) => {
      apply(data.session?.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user?.email ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
