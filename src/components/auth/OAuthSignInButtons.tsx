"use client";

import { useState } from "react";

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
  visual?: "story" | "work";
  disabled?: boolean;
  nextPath?: string;
  /** Provider die als gevulde primaire knop bovenaan komt (rest is secundair). */
  primaryProvider?: OAuthProviderId;
  /** Grijze "binnenkort"-knoppen (bijv. Microsoft). Standaard uit: minder keuzedruk. */
  showComingSoon?: boolean;
  onError?: (message: string) => void;
};

function oauthButtonClass(
  visual: "story" | "work",
  provider: OAuthProviderId,
  primary: boolean
): string {
  const base =
    "flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-[15px] text-base font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60";

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
function oauthComingSoonClass(): string {
  return "flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-dashed border-[var(--story-border,var(--st-line))] bg-[var(--st-surface-2,#f1f5f9)] px-6 py-[15px] text-base font-semibold text-[var(--st-muted-2,#94a3b8)] opacity-70";
}

/** Google/Microsoft inloggen voor terugkerende gebruikers op /login. */
export function OAuthSignInButtons({
  visual = "story",
  disabled,
  nextPath = "/",
  primaryProvider,
  showComingSoon = false,
  onError,
}: OAuthSignInButtonsProps) {
  const { t } = useI18n();
  const enabled = getEnabledOAuthProviders();
  const comingSoonProviders = showComingSoon ? getComingSoonOAuthProviders() : [];
  const [busy, setBusy] = useState<OAuthProviderId | null>(null);

  if (enabled.length === 0 && comingSoonProviders.length === 0) return null;

  // Primaire provider bovenaan; standaard de eerste (Google).
  const primary =
    primaryProvider && enabled.includes(primaryProvider)
      ? primaryProvider
      : enabled[0];
  const providers =
    enabled.length > 0 ? [primary, ...enabled.filter((p) => p !== primary)] : [];

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

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void handleOAuth(provider)}
          className={oauthButtonClass(visual, provider, provider === primary)}
        >
          {busy === provider ? t("login.busy") : t(oauthProviderLabelKey(provider))}
        </button>
      ))}
      {comingSoonProviders.map((provider) => (
        <button
          key={provider}
          type="button"
          disabled
          aria-disabled="true"
          className={oauthComingSoonClass()}
        >
          {t(oauthProviderLabelKey(provider))} ({t("oauth.comingSoon")})
        </button>
      ))}
    </div>
  );
}
