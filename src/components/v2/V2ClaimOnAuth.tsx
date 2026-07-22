"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  hasV2LocalDataToMigrate,
  migrateV2LocalDataToSupabase,
} from "@/lib/migrateV2LocalDataToSupabase";
import { createClient } from "@/lib/supabase/client";

import { useV2 } from "./V2Context";

/**
 * Na OAuth/login: migreer V2 localStorage → Supabase vóór wipe.
 * Lost het dataverlies op bij "Bewaar met Google" en /v2/login.
 */
export default function V2ClaimOnAuth() {
  const pathname = usePathname();
  const router = useRouter();
  const { resetAllLocalData, ready } = useV2();
  const ran = useRef(false);

  useEffect(() => {
    if (!ready || ran.current) return;
    if (pathname?.startsWith("/v2/login") || pathname?.startsWith("/v2/register")) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (!hasV2LocalDataToMigrate()) return;

      const supabase = createClient();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id || cancelled) return;

      ran.current = true;
      try {
        const result = await migrateV2LocalDataToSupabase(user.id);
        if (cancelled) return;
        if (result.migrated) {
          resetAllLocalData();
          // Cloud-data leeft in de v1-app; stuur daarheen na geslaagde migratie.
          window.location.assign("/");
          return;
        }
      } catch (err) {
        console.warn("[V2ClaimOnAuth] migrate failed", err);
        ran.current = false;
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [ready, pathname, resetAllLocalData, router]);

  return null;
}
