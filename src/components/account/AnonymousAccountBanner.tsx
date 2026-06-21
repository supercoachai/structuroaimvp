"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { hasStructuroLocalModeCookieOnClient } from "@/lib/localOnboardingCookie";
import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";
import {
  getStoredSignupCampaign,
  getStoredSignupSource,
} from "@/lib/posthog/signupAttribution";
import { useI18n } from "@/lib/i18n";

const DISMISS_KEY = "structuro_anon_account_banner_dismissed";

function buildRegistrerenHref(): string {
  const params = new URLSearchParams();
  const source = getStoredSignupSource();
  if (source && source !== "direct") {
    params.set("source", source);
    params.set("utm_source", source);
  }
  const campaign = getStoredSignupCampaign();
  if (campaign) params.set("utm_campaign", campaign);
  const query = params.toString();
  return `/registreren${query ? `?${query}` : ""}`;
}

/**
 * Anonieme acquisitie-user die de eerste dagstart heeft afgerond: rustige prompt
 * om een gratis account aan te maken zodat de voortgang bewaard blijft.
 * Wordt enkel gemount in de app-shell wanneer de dagstart vandaag klaar is.
 */
export default function AnonymousAccountBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isAnonymous =
      hasStructuroLocalModeCookieOnClient() && !hasSupabaseAuthHintOnClient();
    if (!isAnonymous) return;
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, []);

  const href = useMemo(() => (visible ? buildRegistrerenHref() : "/registreren"), [visible]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div className="border-b border-[var(--st-line)] bg-[var(--st-surface-2)] px-6 py-3 md:px-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--st-ink)]">
            {t("anonAccount.title")}
          </p>
          <p className="text-sm text-[var(--st-muted)]">{t("anonAccount.body")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={href}
            className="st-btn-primary inline-flex h-10 items-center justify-center px-4 text-sm"
          >
            {t("anonAccount.cta")}
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-sm font-medium text-[var(--st-muted)] transition-colors hover:text-[var(--st-ink)]"
          >
            {t("anonAccount.later")}
          </button>
        </div>
      </div>
    </div>
  );
}
