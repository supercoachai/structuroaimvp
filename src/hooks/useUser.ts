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

    const done = (u: User | null) => {
      if (!cancelled) {
        setUser(u ?? null);
        setLoading(false);
      }
    };

    const getInitial = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        if (cancelled) return;
        const supabase = createClient();

        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("auth_timeout")), AUTH_TIMEOUT_MS)
        );
        /** getSession leest lokaal; getUser triggert iedere keer /user en veroorzaakt stormen bij veel mounts. */
        const userPromise = supabase.auth
          .getSession()
          .then(({ data: { session } }) => session?.user ?? null, (err: unknown) => {
            console.warn("useUser: getSession afgewezen", err);
            return null;
          });
        const u = await Promise.race([userPromise, timeoutPromise]);
        done(u);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) {
            setUser(session?.user ?? null);
            setLoading(false);
          }
        });
        unsubscribe = () => subscription.unsubscribe();
      } catch (err) {
        console.warn("useUser: auth check failed or timed out, continuing without user", err);
        done(null);
      }
    };

    getInitial();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return { user, loading };
}
