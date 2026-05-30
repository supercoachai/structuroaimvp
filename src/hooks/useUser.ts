"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";

const AUTH_TIMEOUT_MS = 8000;

export function useUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    /** Laatste bekende user; voorkomt dat INITIAL_SESSION met null getSession overschrijft. */
    let resolvedUser: User | null = null;

    const applyUser = (next: User | null) => {
      resolvedUser = next;
      setUser(next);
    };

    const finishLoading = () => {
      if (!cancelled) setLoading(false);
    };

    const getInitial = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        if (cancelled) return;
        const supabase = createClient();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (cancelled) return;
            const next = session?.user ?? null;

            /**
             * Supabase kan bij subscribe INITIAL_SESSION sturen met session:null terwijl
             * cookies nog geparsed worden. Nooit een reeds opgeloste user wegvegen.
             */
            if (event === "INITIAL_SESSION" && next === null && resolvedUser !== null) {
              finishLoading();
              return;
            }

            applyUser(next);
            finishLoading();
          }
        );
        unsubscribe = () => subscription.unsubscribe();

        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("auth_timeout")), AUTH_TIMEOUT_MS)
        );
        const userPromise = supabase.auth
          .getSession()
          .then(({ data: { session } }) => session?.user ?? null, (err: unknown) => {
            console.warn("useUser: getSession afgewezen", err);
            return null;
          });

        const u = await Promise.race([userPromise, timeoutPromise]);
        if (cancelled) return;

        applyUser(u);
        finishLoading();
      } catch (err) {
        console.warn("useUser: auth check failed or timed out, continuing without user", err);
        if (!cancelled) {
          applyUser(null);
          finishLoading();
        }
      }
    };

    void getInitial();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return { user, loading };
}
