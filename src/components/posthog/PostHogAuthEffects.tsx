"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import { createClient } from "@/lib/supabase/client";
import { markReturningUser } from "@/lib/auth/returningUser";
import { isAnalyticsExcludedEmail } from "@/lib/analyticsInternal";
import { useConsent } from "@/lib/posthog/ConsentContext";
import {
  getSignupAttributionSource,
  getStoredSignupCampaign,
  PENDING_SIGNUP_KEY,
  persistSignupAttributionToProfile,
} from "@/lib/posthog/signupAttribution";
import { getFirstTouchSetOnceForPostHog } from "@/lib/posthog/firstTouchAttribution";
import {
  clearIdentityStitchOnLogout,
  linkAnonymousDistinctToUser,
  aliasAnonymousFromMetadataIfNeeded,
} from "@/lib/posthog/identityStitch";
import { captureActivationFunnelEvent } from "@/lib/posthog/track";

function signupDoneKey(uid: string) {
  return `structuro_ph_signup_done_${uid}`;
}

function tryCaptureSignup(user: {
  id: string;
  created_at?: string;
  email?: string | null;
}) {
  void persistSignupAttributionToProfile(user.id);

  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        source?: string;
        utm_campaign?: string | null;
      };
      captureActivationFunnelEvent("signup_completed", {
        channel: "client",
        source: parsed.source ?? getSignupAttributionSource(),
        utm_campaign: parsed.utm_campaign ?? getStoredSignupCampaign(),
      });
      sessionStorage.removeItem(PENDING_SIGNUP_KEY);
      sessionStorage.setItem(signupDoneKey(user.id), "1");
      return;
    }
  } catch {
    /* ignore */
  }

  try {
    if (sessionStorage.getItem(signupDoneKey(user.id))) return;
  } catch {
    return;
  }

  const createdMs = new Date(user.created_at ?? 0).getTime();
  if (!Number.isFinite(createdMs)) return;
  const ageMs = Date.now() - createdMs;
  if (ageMs >= 0 && ageMs < 30 * 60 * 1000) {
    captureActivationFunnelEvent("signup_completed", {
      channel: "client",
      source: getSignupAttributionSource(),
      utm_campaign: getStoredSignupCampaign(),
    });
    try {
      sessionStorage.setItem(signupDoneKey(user.id), "1");
    } catch {
      /* ignore */
    }
  }
}

export function PostHogAuthEffects() {
  const { consent } = useConsent();

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    const run = async () => {
      const supabase = createClient();

      const applySession = (
        session: import("@supabase/supabase-js").Session | null
      ) => {
        const user = session?.user;
        if (!user?.id) return;

        markReturningUser();

        if (isAnalyticsExcludedEmail(user.email ?? null)) {
          try {
            clearIdentityStitchOnLogout();
            posthog.reset();
          } catch {
            /* ignore */
          }
          return;
        }

        // Cross-device magic link: lees posthog_anon_id uit user_metadata
        // meteen bij eerste session apply (SIGNED_IN / INITIAL_SESSION /
        // getSession), vóór andere writes. Latere updateUser({ data })
        // merge't meestal, maar sommige configs overschrijven metadata.
        try {
          aliasAnonymousFromMetadataIfNeeded(
            user.id,
            user.user_metadata as Record<string, unknown> | null | undefined
          );
        } catch {
          /* ignore */
        }

        // Funnel-event vóór identify: signup_completed vuurt zo nog met de
        // anonieme distinct_id en sluit aan op acquisitie-events. identify()
        // merget die daarna in user.id (zonder herhaald alias()).
        tryCaptureSignup(user);

        try {
          // $email is functionele identity voor ingelogde users (niet marketing).
          // Altijd zetten als session email beschikbaar is, ongeacht cookie consent.
          const personProps: Record<string, unknown> = {};
          if (user.email) {
            personProps.$email = user.email;
          }
          const meta = user.user_metadata as Record<string, unknown> | null | undefined;
          const rawName =
            (typeof meta?.full_name === "string" && meta.full_name) ||
            (typeof meta?.name === "string" && meta.name) ||
            (typeof meta?.given_name === "string" && meta.given_name) ||
            "";
          const trimmedName = rawName.trim();
          if (trimmedName) {
            personProps.$name = trimmedName;
          }
          linkAnonymousDistinctToUser(
            user.id,
            Object.keys(personProps).length > 0 ? personProps : undefined,
            getFirstTouchSetOnceForPostHog() ?? undefined
          );
        } catch {
          /* ignore */
        }
      };

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          try {
            clearIdentityStitchOnLogout();
            posthog.reset();
          } catch {
            /* ignore */
          }
          return;
        }
        // TOKEN_REFRESHED vuurt vaak; identity hoeft daar niet opnieuw.
        if (event === "TOKEN_REFRESHED") return;
        applySession(session);
      });
      subscription = data.subscription;

      const { data: sessionData } = await supabase.auth.getSession();
      applySession(sessionData.session ?? null);
    };

    void run();

    return () => {
      subscription?.unsubscribe();
    };
  }, [consent]);

  return null;
}
