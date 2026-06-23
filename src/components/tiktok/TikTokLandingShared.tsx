"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";

import type { BridgeChannel } from "@/lib/acquisition/bridgePaths";
import type { LpCampaign, LpHeroId } from "@/lib/tiktok/lpConfig";
import { getLpThemeTokens, type LpThemeTokens } from "@/lib/tiktok/lpTheme";

export type TikTokHeroShellProps = {
  campaign: LpCampaign;
  heroId: LpHeroId;
  channel: BridgeChannel;
  signupHref: string;
  onCtaClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  footerNote?: string;
  /** Geen regel onder CTA (organische bridge). */
  hideFooterNote?: boolean;
  /** Overschrijft campagne-CTA-label. */
  ctaLabel?: string;
  mainClassName?: string;
  /** Overschrijft verticale positie + bottom-reserve van <main>. */
  mainPositionClass?: string;
};

export type TikTokHeroLayoutProps = TikTokHeroShellProps & {
  children: React.ReactNode;
};

export function TikTokLandingShell({
  campaign,
  heroId,
  channel,
  signupHref,
  onCtaClick,
  children,
  footerNote,
  hideFooterNote = false,
  ctaLabel,
  mainClassName = "",
  mainPositionClass = "justify-start pb-32 md:justify-center md:pb-36",
}: TikTokHeroLayoutProps) {
  const theme = getLpThemeTokens(campaign, heroId, channel);
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
            style={{ backgroundColor: theme.isStory ? "#2D5A56" : campaign.accent }}
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
        className={`mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-2 md:pt-0 ${mainPositionClass} ${mainClassName}`}
      >
        {children}
        {campaign.explainer ? (
          <TikTokExplainer theme={theme} explainer={campaign.explainer} />
        ) : null}
        {campaign.learnMore ? (
          <TikTokLearnMoreLink theme={theme} learnMore={campaign.learnMore} />
        ) : null}
      </main>

      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm"
        style={{
          borderColor: theme.surfaceBorder,
          backgroundColor: theme.footerBg,
        }}
      >
        <div className="mx-auto w-full max-w-md">
          <Link
            href={signupHref}
            onClick={onCtaClick}
            className="flex w-full items-center justify-center rounded-xl px-6 py-4 text-base font-semibold transition hover:opacity-95"
            style={{
              backgroundColor: theme.ctaBg,
              color: theme.ctaText,
              boxShadow: theme.isStory
                ? "0 8px 20px rgba(26, 26, 27, 0.22)"
                : `0 8px 20px ${campaign.accent}44`,
            }}
          >
            {ctaLabel ?? campaign.cta}
          </Link>
          {!hideFooterNote ? (
            <p
              className="mt-2 text-center text-[11px] leading-snug"
              style={{ color: theme.muted }}
            >
              {footerNote ?? campaign.trust}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TikTokExplainer({
  theme,
  explainer,
}: {
  theme: LpThemeTokens;
  explainer: NonNullable<LpCampaign["explainer"]>;
}) {
  return (
    <section
      className="mt-8 w-full self-stretch rounded-[20px] border p-5 text-left"
      style={{ backgroundColor: theme.surface, borderColor: theme.surfaceBorder }}
    >
      {explainer.title ? (
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.muted }}
        >
          {explainer.title}
        </p>
      ) : null}
      <ul className="mt-3 space-y-2.5">
        {explainer.points.map((point) => (
          <li key={point} className="flex items-start gap-3">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: theme.isStory ? "#2D5A56" : theme.ctaBg }}
              aria-hidden
            />
            <span
              className="text-sm leading-relaxed"
              style={{ color: theme.inkSoft }}
            >
              {point}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TikTokLearnMoreLink({
  theme,
  learnMore,
}: {
  theme: LpThemeTokens;
  learnMore: NonNullable<LpCampaign["learnMore"]>;
}) {
  return (
    <a
      href={learnMore.href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-5 inline-flex items-center justify-center self-center text-sm font-medium underline underline-offset-4 transition hover:opacity-80"
      style={{ color: theme.muted }}
    >
      {learnMore.label}
    </a>
  );
}

export function TikTokEyebrow({
  campaign,
  heroId,
  channel,
  children,
}: {
  campaign: LpCampaign;
  heroId?: LpHeroId;
  channel?: BridgeChannel;
  children: React.ReactNode;
}) {
  const theme = getLpThemeTokens(campaign, heroId, channel);
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-wide ${theme.eyebrowClass}`}
      style={theme.isStory ? undefined : { color: theme.muted }}
    >
      {children}
    </p>
  );
}

export function StoryEyebrow({
  onNavy = false,
  children,
}: {
  onNavy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      className={`st-story-eyebrow inline-flex items-center gap-2.5 ${onNavy ? "st-story-eyebrow--on-navy" : ""}`}
    >
      <span className="st-story-eyebrow-pulse" aria-hidden />
      {children}
    </p>
  );
}

export function TikTokHeadline({
  campaign,
  heroId,
  channel,
  children,
  centered = false,
}: {
  campaign: LpCampaign;
  heroId?: LpHeroId;
  channel?: BridgeChannel;
  children: React.ReactNode;
  centered?: boolean;
}) {
  const theme = getLpThemeTokens(campaign, heroId, channel);
  return (
    <h1
      className={`mt-3 ${theme.headlineClass} ${centered ? "text-center" : "text-left"} ${
        theme.isStory ? "" : "text-[1.65rem] leading-tight sm:text-3xl"
      }`}
      style={{ color: theme.ink }}
    >
      {children}
    </h1>
  );
}

export function TikTokSubline({
  campaign,
  heroId,
  channel,
  children,
  centered = false,
}: {
  campaign: LpCampaign;
  heroId?: LpHeroId;
  channel?: BridgeChannel;
  children: React.ReactNode;
  centered?: boolean;
}) {
  const theme = getLpThemeTokens(campaign, heroId, channel);
  return (
    <p
      className={`mt-4 text-base leading-relaxed ${centered ? "text-center" : "text-left"} ${
        theme.isStory ? "font-normal" : ""
      }`}
      style={{ color: theme.inkSoft }}
    >
      {children}
    </p>
  );
}
