"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasFreeTrial, freeTrialDaysLeft } from "@/lib/freeTrialAccess";

const SESSION_DISMISSED_KEY = "structuro_trial_banner_dismissed";

function daysUntil(isoDate: string): number {
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function TrialBanner() {
  const pathname = usePathname();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Niet laden op de abonnementspagina zelf
    if (pathname?.startsWith("/abonnement")) return;
    // Niet laden als al weggedrukt deze sessie
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_DISMISSED_KEY)) {
      setDismissed(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("created_at, subscription_status, subscription_current_period_end")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          const status = data.subscription_status as string | null;
          const periodEnd = data.subscription_current_period_end as string | null;
          const createdAt = data.created_at as string | null;

          // Betaald of opgezegd-maar-nog-geldig: geen banner
          if (status === "active" || status === "cancelled") return;

          // Handmatig verlengde proeftijd (trialing): toon resterende dagen op basis van period end
          if (status === "trialing" && periodEnd) {
            const days = daysUntil(periodEnd);
            if (days > 0) setDaysLeft(days);
            return;
          }

          // Standaard 3-daagse proeftijd op basis van created_at
          if (!hasFreeTrial(createdAt)) return;
          setDaysLeft(freeTrialDaysLeft(createdAt));
        });
    });
  }, [pathname]);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (daysLeft === null || daysLeft === 0 || dismissed) return null;
  if (pathname?.startsWith("/abonnement")) return null;

  const isUrgent = daysLeft <= 1;

  const label =
    daysLeft === 1
      ? "Nog 1 dag gratis proeftijd — daarna heb je een abonnement nodig"
      : `Nog ${daysLeft} dagen gratis proeftijd — daarna heb je een abonnement nodig`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full shrink-0 items-center justify-between gap-3 px-4 py-2 text-xs font-medium ${
        isUrgent
          ? "bg-red-50 text-red-900"
          : "bg-amber-50 text-amber-900"
      }`}
    >
      <span className="min-w-0 truncate">⏰ {label}</span>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/abonnement"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            isUrgent
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-amber-500 text-white hover:bg-amber-600"
          }`}
        >
          Abonneer
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs opacity-60 hover:opacity-100"
          aria-label="Banner verbergen"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
