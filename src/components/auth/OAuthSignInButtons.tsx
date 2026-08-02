"use client";

import { useState } from "react";

import { OAuthProviderIcon } from "@/components/auth/OAuthProviderIcon";
import {
  getComingSoonOAuthProviders,
  getEnabledOAuthProviders,
  oauthProviderLabelKey,
  type OAuthProviderId,
} from "@/lib/auth/authProviders";
import { isProviderNotEnabledError, startOAuthSignIn } from "@/lib/auth/socialSignIn";
import { setLastAuthMethod } from "@/lib/auth/returningUser";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";

type OAuthSignInButtonsProps = {
  visual?: "story" | "work" | "v2";
  disabled?: boolean;
  nextPath?: string;
  /** Provider die als gevulde primaire knop bovenaan komt (rest is secundair). */
  primaryProvider?: OAuthProviderId;
  /**
   * Als true: alle social knoppen outlined met icoon (TikTok-stijl),
   * geen gevulde primary.
   */
  equalStyle?: boolean;
  /** Compactere knoppen (account-save / small screens). */
  compact?: boolean;
  /** Grijze "binnenkort"-knoppen (bijv. Facebook/Microsoft). Standaard uit. */
  showComingSoon?: boolean;
  onBeforeStart?: (provider: OAuthProviderId) => void;
  onError?: (message: string) => void;
};

function oauthButtonClass(
  visual: "story" | "work" | "v2",
  provider: OAuthProviderId,
  primary: boolean,
  compact: boolean,
): string {
  const base = compact
    ? "relative flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
    : "relative flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-[15px] text-base font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60";

  if (visual === "v2") {
    if (primary) {
      return `${base} btn-primary border-none`;
    }
    return `${base} v2-oauth-btn border border-[rgba(26,35,64,0.14)] bg-white text-[var(--ink,#1A2340)] shadow-sm hover:border-[rgba(45,90,86,0.35)] hover:bg-[rgba(45,90,86,0.04)]`;
  }

  // Apple volgt de platformconventie (donker), ongeacht hiërarchie.
  if (provider === "apple") {
    return `${base} border border-transparent bg-[#1A1A1B] text-white hover:bg-[#2E2E30]`;
  }

  if (primary) {
    if (visual === "story") {
      return `${base} border-none bg-[var(--story-cta)] text-white shadow-[0_8px_20px_rgba(26,35,64,0.22)] hover:bg-[var(--story-cta-hover)]`;
    }
    return `${base} border-none bg-[var(--st-ink)] text-white hover:opacity-90`;
  }

  if (visual === "story") {
    return `${base} border border-[var(--story-border)] bg-white text-[var(--story-text)] shadow-sm hover:border-[var(--story-accent)] hover:shadow-md`;
  }

  return `${base} border border-[var(--st-line)] bg-white text-[var(--st-ink)] hover:bg-[var(--st-surface-2)]`;
}

/** Grijze, niet-klikbare placeholder-knop voor providers die nog komen. */
function oauthComingSoonClass(
  visual: "story" | "work" | "v2",
  compact: boolean,
): string {
  const size = compact
    ? "px-4 py-3 text-sm gap-2"
    : "px-6 py-[15px] text-base gap-2.5";
  if (visual === "v2") {
    return `relative flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-dashed border-[rgba(26,35,64,0.16)] bg-[rgba(26,35,64,0.03)] ${size} font-semibold text-[var(--text-muted,#64748b)] opacity-70`;
  }
  return `relative flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-dashed border-[var(--story-border,var(--st-line))] bg-[var(--st-surface-2,#f1f5f9)] ${size} font-semibold text-[var(--st-muted-2,#94a3b8)] opacity-70`;
}

/** Google/Facebook/Microsoft inloggen met merkiconen. */
export function OAuthSignInButtons({
  visual = "story",
  disabled,
  nextPath = "/",
  primaryProvider,
  equalStyle = false,
  compact = false,
  showComingSoon = false,
  onBeforeStart,
  onError,
}: OAuthSignInButtonsProps) {
  const { t } = useI18n();
  const enabled = getEnabledOAuthProviders();
  const comingSoonProviders = showComingSoon ? getComingSoonOAuthProviders() : [];
  const [busy, setBusy] = useState<OAuthProviderId | null>(null);

  if (enabled.length === 0 && comingSoonProviders.length === 0) return null;

  // Primaire provider bovenaan; standaard de eerste (Google).
  const primary =
    !equalStyle && primaryProvider && enabled.includes(primaryProvider)
      ? primaryProvider
      : !equalStyle
        ? enabled[0]
        : null;
  const providers =
    enabled.length > 0
      ? primary
        ? [primary, ...enabled.filter((p) => p !== primary)]
        : enabled
      : [];

  const handleOAuth = async (provider: OAuthProviderId) => {
    if (disabled || busy) return;
    setBusy(provider);
    try {
      const supabase = createClient();
      if (!supabase) {
        onError?.(t("login.noServer"));
        setBusy(null);
        return;
      }
      onBeforeStart?.(provider);
      setLastAuthMethod(provider);
      await startOAuthSignIn(supabase, provider, nextPath);
    } catch (err) {
      onError?.(
        isProviderNotEnabledError(err)
          ? t("oauth.noneEnabled")
          : err instanceof Error
            ? err.message
            : t("login.errGeneric")
      );
      setBusy(null);
    }
  };

  const iconLeft = compact ? "left-4" : "left-5";
  const iconSize = compact ? "h-4 w-4 shrink-0" : "h-5 w-5 shrink-0";

  return (
    <div className={compact ? "space-y-2.5" : "space-y-3"}>
      {providers.map((provider) => {
        const isPrimary = primary !== null && provider === primary;
        return (
          <button
            key={provider}
            type="button"
            disabled={disabled || busy !== null}
            onClick={() => void handleOAuth(provider)}
            className={oauthButtonClass(visual, provider, isPrimary, compact)}
          >
            <span className={`absolute ${iconLeft} top-1/2 -translate-y-1/2`}>
              <OAuthProviderIcon
                provider={provider}
                className={
                  provider === "apple" && (isPrimary || visual !== "v2")
                    ? `${iconSize} text-white`
                    : iconSize
                }
              />
            </span>
            <span>
              {busy === provider ? t("login.busy") : t(oauthProviderLabelKey(provider))}
            </span>
          </button>
        );
      })}
      {comingSoonProviders.map((provider) => (
        <button
          key={provider}
          type="button"
          disabled
          aria-disabled="true"
          className={oauthComingSoonClass(visual, compact)}
        >
          <span
            className={`absolute ${iconLeft} top-1/2 -translate-y-1/2 opacity-60`}
          >
            <OAuthProviderIcon provider={provider} className={iconSize} />
          </span>
          <span>
            {t(oauthProviderLabelKey(provider))} ({t("oauth.comingSoon")})
          </span>
        </button>
      ))}
    </div>
  );
}
