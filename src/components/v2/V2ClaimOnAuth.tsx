"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  hasV2LocalDataToMigrate,
  migrateV2LocalDataToSupabase,
} from "@/lib/migrateV2LocalDataToSupabase";
import { createClient } from "@/lib/supabase/client";

import { useV2 } from "./V2Context";
import {
  peekV2PostAccountNamePending,
  V2_POST_ACCOUNT_NAME_PATH,
} from "./v2PostAccountName";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";

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
          // Post-auth naamstap wint van v1-root redirect.
          const askName =
            peekV2PostAccountNamePending() ||
            (typeof window !== "undefined" &&
              new URLSearchParams(window.location.search).get("name") === "1");
          if (askName) {
            window.location.assign(V2_POST_ACCOUNT_NAME_PATH);
            return;
          }
          // Jasper / café: geen kaart-poort; overige v2-cohort → checkout.
          const { data: profile } = await supabase
            .from("profiles")
            .select("signup_source")
            .eq("id", user.id)
            .maybeSingle();
          const source =
            typeof profile?.signup_source === "string"
              ? profile.signup_source
              : null;
          window.location.assign(
            isEventSignupSource(source) ? "/v2/home" : "/v2/abonnement"
          );
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
