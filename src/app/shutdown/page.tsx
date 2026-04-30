"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import DayShutdown from "../../components/DayShutdown";
import AppLayout from "../../components/layout/AppLayout";
import { createClient } from "../../lib/supabase/client";
import { useRouter } from "next/navigation";
import { trackShutdownStarted } from "@/utils/events";
import { useI18n } from "@/lib/i18n";

const FADE_MS = 280;

export default function ShutdownPage() {
  const { t } = useI18n();
  const [view, setView] = useState<"loading" | "form" | "complete">("loading");
  const [formExiting, setFormExiting] = useState(false);
  const [completionFadeIn, setCompletionFadeIn] = useState(false);
  const router = useRouter();
  const shutdownGaStartedRef = useRef(false);

  const checkIfAlreadyShutdown = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!user) {
        router.push("/login");
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("daily_shutdowns")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

      setView(data ? "complete" : "form");
    } catch {
      setView("form");
    }
  }, [router]);

  useEffect(() => {
    void checkIfAlreadyShutdown();
  }, [checkIfAlreadyShutdown]);

  useEffect(() => {
    if (view !== "form" || shutdownGaStartedRef.current) return;
    shutdownGaStartedRef.current = true;
    trackShutdownStarted();
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
      <AppLayout>
        <div className="flex min-h-[100dvh] items-center justify-center">
          <p className="text-base text-slate-500">{t("common.loadingDots")}</p>
        </div>
      </AppLayout>
    );
  }

  if (view === "complete") {
    return (
      <AppLayout>
        <div
          className="flex min-h-full flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10"
          style={{
            background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
          }}
        >
          <div
            className={`max-w-md text-center transition-opacity ease-out ${completionFadeIn ? "opacity-100 duration-300" : "opacity-0 duration-0"}`}
          >
            <p className="text-2xl font-bold text-slate-900">
              {t("shutdownPage.doneTitle")}
            </p>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              {t("shutdownPage.doneSubtitle")}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        className="flex min-h-full items-center justify-center px-4 py-6 sm:px-6 sm:py-8"
        style={{
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
      >
        <div
          className={`w-full max-w-xl transition-opacity ease-out ${formExiting ? "pointer-events-none opacity-0 duration-300" : "opacity-100 duration-300"}`}
        >
          <DayShutdown onComplete={handleComplete} />
        </div>
      </div>
    </AppLayout>
  );
}
