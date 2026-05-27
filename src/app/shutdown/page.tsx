"use client";

import { useState, useEffect, useRef } from "react";
import DayShutdown from "../../components/DayShutdown";
import { createClient } from "../../lib/supabase/client";
import { useRouter } from "next/navigation";
import { trackShutdownStarted } from "@/utils/events";
import { useI18n } from "@/lib/i18n";
import { captureProductEvent } from "@/lib/posthog/track";
import { useUser } from "@/hooks/useUser";
import { hasStructuroLocalModeCookieOnClient } from "@/lib/localOnboardingCookie";
import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

const FADE_MS = 280;
const SHUTDOWN_LOOKUP_TIMEOUT_MS = 6000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("shutdown_lookup_timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default function ShutdownPage() {
  const { t } = useI18n();
  const { user, loading: userLoading } = useUser();
  const [view, setView] = useState<"loading" | "form" | "complete">("loading");
  const [formExiting, setFormExiting] = useState(false);
  const [completionFadeIn, setCompletionFadeIn] = useState(false);
  const router = useRouter();
  const shutdownGaStartedRef = useRef(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (userLoading) return;

    const localMode = hasStructuroLocalModeCookieOnClient();
    const authHint = hasSupabaseAuthHintOnClient();

    if (!user && !localMode && !authHint) {
      if (!redirectingRef.current) {
        redirectingRef.current = true;
        router.replace("/login");
      }
      return;
    }

    if (!user) {
      setView("form");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const today = getCalendarDateAmsterdam();
        const result = await withTimeout(
          (async () => {
            const { data: row, error } = await supabase
              .from("daily_shutdowns")
              .select("id")
              .eq("user_id", user.id)
              .eq("date", today)
              .maybeSingle();
            if (error) throw error;
            return row;
          })(),
          SHUTDOWN_LOOKUP_TIMEOUT_MS
        );

        if (cancelled) return;
        setView(result ? "complete" : "form");
      } catch (err) {
        console.warn("ShutdownPage: kon dagafsluiting-status niet ophalen, toon formulier.", err);
        if (!cancelled) setView("form");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, userLoading, router]);

  useEffect(() => {
    if (view !== "form" || shutdownGaStartedRef.current) return;
    shutdownGaStartedRef.current = true;
    trackShutdownStarted();
    captureProductEvent("shutdown_started");
  }, [view]);

  useEffect(() => {
    if (view !== "complete") return;
    setCompletionFadeIn(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setCompletionFadeIn(true));
    });
    return () => cancelAnimationFrame(id);
  }, [view]);

  const handleComplete = () => {
    setFormExiting(true);
    setCompletionFadeIn(false);
    window.setTimeout(() => {
      setView("complete");
      setFormExiting(false);
      window.setTimeout(() => {
        router.push("/");
      }, 2000);
    }, FADE_MS);
  };

  if (view === "loading") {
    return (
      <div className="st-art flex h-full min-h-0 flex-1 flex-col items-center justify-center px-4">
        <p className="text-sm text-[var(--st-muted)]">{t("common.loadingDots")}</p>
      </div>
    );
  }

  if (view === "complete") {
    return (
      <div className="dagafsluiting-eod-root st-art flex h-full min-h-0 flex-1 flex-col items-center justify-center px-3 py-3 sm:px-4 sm:py-5">
        <div
          className={`dagafsluiting-eod-app w-full max-w-[480px] px-6 py-10 text-center transition-opacity ease-out sm:px-8 ${
            completionFadeIn ? "opacity-100 duration-300" : "opacity-0 duration-0"
          }`}
        >
          <p className="text-2xl font-medium tracking-tight text-[var(--st-ink)]">
            {t("shutdownPage.doneTitle")}
          </p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--st-muted)]">
            {t("shutdownPage.doneSubtitle")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dagafsluiting-eod-root st-art flex h-full min-h-0 flex-1 flex-col px-3 py-3 sm:px-4 sm:py-5">
      <div
        className={`mx-auto flex h-full min-h-0 w-full max-w-[480px] flex-col transition-opacity ease-out ${
          formExiting ? "pointer-events-none opacity-0 duration-300" : "opacity-100 duration-300"
        }`}
      >
        <DayShutdown onComplete={handleComplete} />
      </div>
    </div>
  );
}
