"use client";

import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  captureAnonymousEvent,
  logPosthogEvent,
} from "@/lib/posthog/track";

/**
 * Fired `app_opened` één keer per dag per gebruiker.
 *
 * Doel: betrouwbare DAU-metric, ongeacht of iemand de dagstart afmaakt.
 *
 * Eigenschappen:
 *  - Anoniem (gaat via captureAnonymousEvent): werkt ook zonder cookie-consent,
 *    er worden geen persoonsgegevens meegestuurd, alleen de event-naam + datum.
 *  - Eén event per kalenderdag per Supabase user_id, geguard via localStorage.
 *  - Alleen voor ingelogde users; anonieme bezoekers tellen we via PostHog pageviews.
 *  - Werkt zowel bij eerste page-load met bestaande sessie als bij inloggen
 *    vanuit een uitgelogde tab (via onAuthStateChange).
 */
export function AppOpenedTracker() {
  const firedForUser = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const tryFire = (userId: string | undefined) => {
      if (cancelled) return;
      if (!userId) {
        logPosthogEvent("anonymous", "app_opened", "no-user");
        return;
      }
      if (firedForUser.current === userId) return;

      const today = new Date().toISOString().slice(0, 10);
      const storageKey = `structuro_app_opened_${today}_${userId}`;

      try {
        if (localStorage.getItem(storageKey)) {
          firedForUser.current = userId;
          logPosthogEvent("anonymous", "app_opened", "already-sent-today", {
            date: today,
          });
          return;
        }
      } catch {
        return;
      }

      firedForUser.current = userId;
      captureAnonymousEvent("app_opened", { date: today });

      try {
        localStorage.setItem(storageKey, "1");
      } catch {
        /* localStorage geblokkeerd: in dat geval kan het event nog een keer
           firen binnen dezelfde dag. PostHog dedupliceert op user_id niveau. */
      }
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      tryFire(session?.user?.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        tryFire(session?.user?.id);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
