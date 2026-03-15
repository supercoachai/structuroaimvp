"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const AUTH_TIMEOUT_MS = 8000;

export function useUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const done = (u: User | null) => {
      if (!cancelled) {
        setUser(u ?? null);
        setLoading(false);
      }
    };

    const getInitial = async () => {
      try {
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("auth_timeout")), AUTH_TIMEOUT_MS)
        );
        const userPromise = supabase.auth.getUser().then(({ data: { user: u } }) => u ?? null);
        const u = await Promise.race([userPromise, timeoutPromise]);
        done(u);
      } catch (err) {
        console.warn("useUser: auth check failed or timed out, continuing without user", err);
        done(null);
      }
    };

    getInitial();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
