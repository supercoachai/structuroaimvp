"use client";

import Link from "next/link";
import { useState } from "react";

import type { LpCampaign } from "@/lib/tiktok/lpConfig";
import { TIKTOK_TRIAL_DAYS } from "@/lib/tiktokLanding";
import { getLpThemeTokens } from "@/lib/tiktok/lpTheme";

export type TikTokHeroShellProps = {
  campaign: LpCampaign;
  signupHref: string;
  onCtaClick: () => void;
  footerNote?: string;
  mainClassName?: string;
};

export type TikTokHeroLayoutProps = TikTokHeroShellProps & {
  children: React.ReactNode;
};

export function TikTokLandingShell({
  campaign,
  signupHref,
  onCtaClick,
  children,
  footerNote,
  mainClassName = "",
}: TikTokHeroLayoutProps) {
  const theme = getLpThemeTokens(campaign);
  const [logoError, setLogoError] = useState(false);

  return (
    <div
      className="flex min-h-[100dvh] flex-col"
      style={{ backgroundColor: theme.pageBg, color: theme.ink }}
    >
      <header className="flex shrink-0 items-center justify-center px-4 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {logoError ? (
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-md"
            style={{ backgroundColor: campaign.accent }}
          >
            <span className="text-lg font-bold text-white">S</span>
          </div>
        ) : (
          <img
            src="/logo-structuro.png"
            alt="Structuro"
            width={44}
            height={44}
            className="h-11 w-11 object-contain drop-shadow-sm"
            onError={() => setLogoError(true)}
          />
        )}
      </header>

      <main
        className={`mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-32 pt-2 ${mainClassName}`}
      >
        {children}
      </main>

      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm"
        style={{
          borderColor: theme.surfaceBorder,
          backgroundColor: theme.isDark ? "rgba(12,17,36,0.92)" : "rgba(255,255,255,0.95)",
        }}
      >
        <div className="mx-auto w-full max-w-md">
          <p
            className="mb-2 text-center text-xs font-medium"
            style={{ color: theme.isDark ? "#86efac" : "#065f46" }}
          >
            {TIKTOK_TRIAL_DAYS} dagen gratis proberen
          </p>
          <Link
            href={signupHref}
            onClick={onCtaClick}
            className="flex w-full items-center justify-center rounded-xl px-6 py-4 text-base font-bold text-white transition hover:opacity-95"
            style={{
              backgroundColor: campaign.accent,
              boxShadow: `0 8px 20px ${campaign.accent}44`,
            }}
          >
            {campaign.cta}
          </Link>
          <p
            className="mt-2 text-center text-[11px] leading-snug"
            style={{ color: theme.muted }}
          >
            {footerNote ?? campaign.trust}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TikTokEyebrow({
  campaign,
  children,
}: {
  campaign: LpCampaign;
  children: React.ReactNode;
}) {
  const theme = getLpThemeTokens(campaign);
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-wide ${theme.eyebrowClass}`}
      style={{ color: theme.muted }}
    >
      {children}
    </p>
  );
}

export function TikTokHeadline({
  campaign,
  children,
  centered = false,
}: {
  campaign: LpCampaign;
  children: React.ReactNode;
  centered?: boolean;
}) {
  const theme = getLpThemeTokens(campaign);
  return (
    <h1
      className={`mt-3 text-[1.65rem] leading-tight sm:text-3xl ${theme.headlineClass} ${
        centered ? "text-center" : "text-left"
      }`}
      style={{ color: theme.ink }}
    >
      {children}
    </h1>
  );
}

export function TikTokSubline({
  campaign,
  children,
  centered = false,
}: {
  campaign: LpCampaign;
  children: React.ReactNode;
  centered?: boolean;
}) {
  const theme = getLpThemeTokens(campaign);
  return (
    <p
      className={`mt-4 text-base leading-relaxed ${centered ? "text-center" : "text-left"}`}
      style={{ color: theme.inkSoft }}
    >
      {children}
    </p>
  );
}
