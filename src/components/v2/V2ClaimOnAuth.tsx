"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

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
import { peekV2OnboardingUiPhase } from "./v2OnboardingPhaseGate";
import { markV2ShellWelcomeSeen } from "./v2ShellWelcome";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";

/**
 * Na OAuth/login: migreer V2 localStorage → Supabase vóór wipe.
 * Lost het dataverlies op bij "Bewaar met Google" en /login.
 *
 * Op /onboarding tijdens account-save: alleen migreren, geen hard redirect.
 * OnboardingV2Client bezit de post-account UX (naamstap).
 */
export default function V2ClaimOnAuth() {
  const pathname = usePathname();
  const { resetAllLocalData, ready } = useV2();
  const ranForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (pathname?.startsWith("/login") || pathname?.startsWith("/registreren")) {
      return;
    }

    let cancelled = false;
    const supabase = createClient();
    if (!supabase) return;

    const runForUser = async (userId: string) => {
      if (cancelled || ranForUser.current === userId) return;
      if (!hasV2LocalDataToMigrate()) return;

      ranForUser.current = userId;
      try {
        const result = await migrateV2LocalDataToSupabase(userId);
        if (cancelled) return;
        if (!result.migrated) {
          ranForUser.current = null;
          return;
        }

        // Vers geclaimd account: de "nieuwe update"-welkomsheet overslaan.
        markV2ShellWelcomeSeen(userId);

        // In onboarding-account/name flow: SPA houdt de stappen; geen hard reload.
        const onOnboarding =
          pathname === "/onboarding" ||
          Boolean(pathname?.startsWith("/onboarding/"));
        const postAccountUi =
          peekV2PostAccountNamePending() ||
          peekV2OnboardingUiPhase() === "account" ||
          peekV2OnboardingUiPhase() === "name" ||
          (typeof window !== "undefined" &&
            new URLSearchParams(window.location.search).get("name") === "1");

        if (onOnboarding && postAccountUi) {
          // Migrate wist localStorage al. Geen resetAllLocalData: dat wist ook
          // React-journey (energie) die goHome nog nodig heeft voor claim.
          return;
        }

        resetAllLocalData();
        if (postAccountUi) {
          window.location.assign(V2_POST_ACCOUNT_NAME_PATH);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("signup_source")
          .eq("id", userId)
          .maybeSingle();
        const source =
          typeof profile?.signup_source === "string"
            ? profile.signup_source
            : null;
        window.location.assign(
          isEventSignupSource(source) ? "/" : "/abonnement",
        );
      } catch (err) {
        console.warn("[V2ClaimOnAuth] migrate failed", err);
        ranForUser.current = null;
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
      const userId = session?.user?.id;
      if (!userId) return;
      void runForUser(userId);
    });

    void supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id;
      if (userId) void runForUser(userId);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [ready, pathname, resetAllLocalData]);

  return null;
}
