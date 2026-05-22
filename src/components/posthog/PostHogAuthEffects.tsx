"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import { createClient } from "@/lib/supabase/client";
import { isAnalyticsExcludedEmail } from "@/lib/analyticsInternal";
import { useConsent } from "@/lib/posthog/ConsentContext";
import {
  getSignupAttributionSource,
  getStoredSignupCampaign,
  PENDING_SIGNUP_KEY,
  persistSignupAttributionToProfile,
} from "@/lib/posthog/signupAttribution";
import { captureProductEvent } from "@/lib/posthog/track";

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
      captureProductEvent("signup_completed", {
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
  if (ageMs >= 0 && ageMs < 3 * 60 * 1000) {
    captureProductEvent("signup_completed", {
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
        if (consent !== "granted") return;
        const user = session?.user;
        if (!user?.id) return;
        if (isAnalyticsExcludedEmail(user.email ?? null)) {
          try {
            posthog.reset();
          } catch {
            /* ignore */
          }
          return;
        }
        try {
          if (user.email) {
            posthog.identify(user.id, { email: user.email });
          } else {
            posthog.identify(user.id);
          }
        } catch {
          /* ignore */
        }
        tryCaptureSignup(user);
      };

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          try {
            posthog.reset();
          } catch {
            /* ignore */
          }
          return;
        }
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
