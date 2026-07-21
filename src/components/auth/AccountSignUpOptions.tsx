"use client";

import { useState } from "react";

import {
  getEnabledOAuthProviders,
  oauthProviderLabelKey,
  type OAuthProviderId,
} from "@/lib/auth/authProviders";
import { finalizeNewAccountSession } from "@/lib/auth/completeSignUpSession";
import { signUpWithEmailPassword } from "@/lib/auth/emailPasswordSignUp";
import {
  isProviderNotEnabledError,
  startOAuthSignIn,
  verifySignupEmailOtp,
} from "@/lib/auth/socialSignIn";
import { isSignupEmailFormatValid, normalizeSignupEmail } from "@/lib/auth/signupEmail";
import { PasskeySignInButton } from "@/components/auth/PasskeySignInButton";
import { AuthCaptcha } from "@/components/auth/AuthCaptcha";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { mapAuthCaptchaError } from "@/lib/auth/captcha";
import { useAuthCaptcha } from "@/hooks/useAuthCaptcha";
import {
  getResolvedSignupSourceForProfile,
  getSignupAttributionSource,
  getStoredSignupCampaign,
  queueSignupCompletedForAnalytics,
} from "@/lib/posthog/signupAttribution";
import { captureMarketingEvent } from "@/lib/posthog/track";

export type SignUpVisual = "story" | "work";

type AccountSignUpOptionsProps = {
  visual?: SignUpVisual;
  disabled?: boolean;
  showPasskey?: boolean;
  /** Vooraf gevraagde aanspreeknaam (bijv. op /registreren). Wordt gebruikt voor alle methodes. */
  nameValue?: string;
  /** Verberg het interne naam-veld in de e-mail-fallback (naam is al elders gevraagd). */
  hideNameField?: boolean;
  /** Bijv. acquisition_signup_started op /registreren */
  onSignUpStarted?: () => void;
  onError?: (message: string) => void;
  /** Override redirect na directe sessie (e-mail/wachtwoord, passkey). OAuth redirect zelf. */
  onSessionReady?: (path: string) => void;
};

function OrDivider({ label, visual }: { label: string; visual: SignUpVisual }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-px flex-1 bg-[var(--story-border,var(--st-line))]"
        aria-hidden
      />
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--story-text-muted,var(--st-muted-2))]">
        {label}
      </span>
      <div
        className="h-px flex-1 bg-[var(--story-border,var(--st-line))]"
        aria-hidden
      />
    </div>
  );
}

/** Google = enige gevulde primary; overige OAuth (indien ooit aan) blijft secundair. */
function oauthButtonClass(
  visual: SignUpVisual,
  provider: OAuthProviderId,
  primary: boolean
): string {
  const base =
    "flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-[15px] text-base font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60";

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

function fieldClass(visual: SignUpVisual): string {
  if (visual === "story") {
    return "w-full rounded-xl border border-[var(--story-border)] bg-white px-4 py-3 text-base text-[var(--story-text)] placeholder:text-[var(--story-text-muted)] focus:border-[var(--story-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(45,90,86,0.18)]";
  }
  return "w-full rounded-[var(--st-r-md)] border border-[var(--st-line)] bg-[var(--st-surface-2)] px-4 py-3 text-base text-[var(--st-ink)] placeholder:text-[var(--st-muted-2)] focus:border-[var(--st-blue-soft)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--st-blue)]/20";
}

function labelClass(visual: SignUpVisual): string {
  return visual === "story"
    ? "block text-sm text-[var(--story-text-muted)]"
    : "block text-sm text-[var(--st-muted)]";
}

function primaryBtnClass(visual: SignUpVisual): string {
  if (visual === "story") {
    return "flex w-full items-center justify-center rounded-xl border-none bg-[var(--story-cta)] px-6 py-[15px] text-base font-semibold text-white shadow-[0_8px_20px_rgba(26,26,27,0.22)] transition-all duration-200 hover:bg-[var(--story-cta-hover)] disabled:cursor-not-allowed disabled:opacity-60";
  }
  return "st-btn-primary h-12 w-full text-base disabled:cursor-not-allowed";
}

function emailTextLinkClass(visual: SignUpVisual): string {
  if (visual === "story") {
    return "mx-auto block text-center text-sm text-[var(--story-text-muted)] underline-offset-2 transition-colors hover:text-[var(--story-text)] hover:underline disabled:cursor-not-allowed disabled:opacity-50";
  }
  return "mx-auto block text-center text-sm text-slate-500 underline-offset-2 transition-colors hover:text-slate-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50";
}

export function AccountSignUpOptions({
  visual = "work",
  disabled,
  showPasskey = true,
  nameValue,
  hideNameField = false,
  onSignUpStarted,
  onError,
  onSessionReady,
}: AccountSignUpOptionsProps) {
  const { t } = useI18n();
  const enabled = getEnabledOAuthProviders();
  const primaryProvider: OAuthProviderId | undefined = enabled.includes("google")
    ? "google"
    : enabled[0];
  const providers =
    enabled.length > 0 && primaryProvider
      ? [primaryProvider, ...enabled.filter((p) => p !== primaryProvider)]
      : enabled;
  const [busyOAuth, setBusyOAuth] = useState<OAuthProviderId | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailConfirmPending, setEmailConfirmPending] = useState<string | null>(null);
  const [confirmOtp, setConfirmOtp] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const {
    enabled: captchaEnabled,
    captchaRef,
    setCaptchaToken,
    resetCaptcha,
    resolveCaptchaToken,
    captchaReady,
  } = useAuthCaptcha();

  // Naam mag alleen verborgen worden als er daadwerkelijk een vooraf gevraagde
  // naam beschikbaar is. Anders (bijv. directe entry op /registreren zonder
  // opgeslagen naam) bouncet de e-mail-signup op "Vul je naam in." zonder veld om
  // dat te herstellen. In dat geval tonen we het naamveld alsnog.
  const nameFieldHidden = hideNameField && (nameValue ?? "").trim().length > 0;

  const markStarted = (method: string, extra?: Record<string, unknown>) => {
    onSignUpStarted?.();
    captureMarketingEvent("signup_method_started", {
      method,
      source: getSignupAttributionSource(),
      utm_campaign: getStoredSignupCampaign(),
      channel: "client",
      funnel: "acquisition",
      ...extra,
    });
  };

  const finishSession = async (userId: string, userEmail: string | null | undefined) => {
    const path = await finalizeNewAccountSession(userId, userEmail);
    if (onSessionReady) {
      onSessionReady(path);
    } else {
      window.location.assign(path);
    }
  };

  const handleOAuth = async (provider: OAuthProviderId) => {
    if (disabled || busyOAuth || emailBusy) return;
    setBusyOAuth(provider);
    try {
      const supabase = createClient();
      if (!supabase) {
        onError?.(t("login.noServer"));
        return;
      }
      // Aanspreeknaam (al gevraagd vóór account-aanmaak) bewaren zodat hij
      // mee migreert en als voorkeursnaam op het profiel gezet kan worden.
      const preferredName = (nameFieldHidden ? nameValue ?? "" : name).trim();
      if (preferredName.length >= 2) {
        try {
          window.localStorage.setItem("structuro_user_name", preferredName);
        } catch {
          /* ignore */
        }
      }
      markStarted("oauth", { oauth_provider: provider });
      queueSignupCompletedForAnalytics();
      captureMarketingEvent("oauth_signin_started", {
        provider,
        source: getSignupAttributionSource(),
        utm_campaign: getStoredSignupCampaign(),
        channel: "client",
        funnel: "acquisition",
      });
      await startOAuthSignIn(supabase, provider);
    } catch (err) {
      onError?.(
        isProviderNotEnabledError(err)
          ? t("oauth.noneEnabled")
          : err instanceof Error
            ? err.message
            : t("login.errGeneric")
      );
      setBusyOAuth(null);
    }
  };

  const handleEmailSignUp = async () => {
    if (disabled || emailBusy || busyOAuth) return;
    const nameTrimmed = (nameFieldHidden ? nameValue ?? "" : name).trim();
    const emailTrimmed = normalizeSignupEmail(email);
    if (!nameTrimmed) {
      onError?.(t("registrerenPage.errNameRequired"));
      return;
    }
    if (!emailTrimmed || !isSignupEmailFormatValid(email)) {
      onError?.(t("registrerenPage.errEmailInvalid"));
      return;
    }
    if (password.length < 8) {
      onError?.(t("registrerenPage.errPasswordWeak"));
      return;
    }
    const captchaToken = resolveCaptchaToken();
    if (captchaEnabled && !captchaToken) {
      onError?.(t("login.errCaptcha"));
      return;
    }

    setEmailBusy(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        onError?.(t("login.noServer"));
        return;
      }
      markStarted("email_password");
      const result = await signUpWithEmailPassword(supabase, {
        email: emailTrimmed,
        password,
        fullName: nameTrimmed,
        signupSource: getResolvedSignupSourceForProfile(),
        signupCampaign: getStoredSignupCampaign(),
        captchaToken,
      });

      if (result.needsEmailConfirmation) {
        setEmailConfirmPending(emailTrimmed);
        resetCaptcha();
        return;
      }

      await supabase.auth.getSession();
      await finishSession(result.userId, result.email ?? emailTrimmed);
      resetCaptcha();
    } catch (err) {
      const raw = err instanceof Error ? err.message : t("registrerenPage.errGeneric");
      if (raw.toLowerCase().includes("already registered")) {
        onError?.(t("registrerenPage.errEmailInUse"));
      } else {
        onError?.(mapAuthCaptchaError(raw, t));
      }
      resetCaptcha();
    } finally {
      setEmailBusy(false);
    }
  };

  if (emailConfirmPending) {
    return (
      <div className="space-y-3">
        <div
          className={
            visual === "story"
              ? "rounded-xl border border-[var(--story-border)] bg-white/80 px-4 py-3 text-sm leading-relaxed text-[var(--story-text-muted)]"
              : "rounded-xl border border-[var(--st-green-haze)] bg-[var(--st-green-haze)] px-4 py-3 text-sm leading-relaxed text-[var(--st-green-deep)]"
          }
        >
          <p className="font-medium text-[var(--story-text,var(--st-green-deep))]">
            {t("signup.emailConfirmTitle")}
          </p>
          <p className="mt-1">
            {t("signup.emailConfirmBody", { email: emailConfirmPending })}
          </p>
          <p className="mt-2 text-[13px]">{t("signup.emailConfirmTip")}</p>
        </div>
        <label htmlFor="signup-confirm-otp" className={labelClass(visual)}>
          {t("signup.emailConfirmOtpLabel")}
        </label>
        <input
          id="signup-confirm-otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          value={confirmOtp}
          onChange={(e) =>
            setConfirmOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 8))
          }
          className={fieldClass(visual)}
          placeholder="123456"
        />
        <button
          type="button"
          disabled={disabled || confirmBusy || confirmOtp.length < 6}
          className={primaryBtnClass(visual)}
          onClick={() => {
            void (async () => {
              setConfirmBusy(true);
              try {
                const supabase = createClient();
                if (!supabase) {
                  onError?.(t("login.noServer"));
                  return;
                }
                const user = await verifySignupEmailOtp(
                  supabase,
                  emailConfirmPending,
                  confirmOtp
                );
                await finishSession(user.id, user.email ?? emailConfirmPending);
              } catch (err) {
                const raw =
                  err instanceof Error ? err.message : t("signup.emailConfirmOtpInvalid");
                onError?.(
                  raw.toLowerCase().includes("token") ||
                    raw.toLowerCase().includes("otp")
                    ? t("signup.emailConfirmOtpInvalid")
                    : mapAuthCaptchaError(raw, t)
                );
              } finally {
                setConfirmBusy(false);
              }
            })();
          }}
        >
          {confirmBusy ? t("login.busy") : t("signup.emailConfirmOtpCta")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {providers.length > 0 ? (
        <div className="space-y-3">
          {providers.map((provider) => (
            <button
              key={provider}
              type="button"
              disabled={disabled || busyOAuth !== null || emailBusy}
              onClick={() => void handleOAuth(provider)}
              className={oauthButtonClass(
                visual,
                provider,
                provider === primaryProvider
              )}
            >
              {busyOAuth === provider
                ? t("login.busy")
                : t(oauthProviderLabelKey(provider))}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-red-600">{t("oauth.noneEnabled")}</p>
      )}

      {!emailOpen ? (
        <button
          type="button"
          disabled={disabled || emailBusy || busyOAuth !== null}
          onClick={() => setEmailOpen(true)}
          className={emailTextLinkClass(visual)}
        >
          {t("signup.emailFallbackToggle")}
        </button>
      ) : (
        <div className="space-y-3 text-left">
          <p className={labelClass(visual)}>{t("signup.emailFallbackHelp")}</p>
          {!nameFieldHidden ? (
            <div className="space-y-1">
              <label htmlFor="signup-name" className={labelClass(visual)}>
                {t("registrerenPage.nameLabel")}
              </label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldClass(visual)}
                autoComplete="name"
                placeholder={t("registrerenPage.namePh")}
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <label htmlFor="signup-email" className={labelClass(visual)}>
              {t("registrerenPage.emailLabel")}
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass(visual)}
              autoComplete="email"
              placeholder={t("registrerenPage.emailPh")}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="signup-password" className={labelClass(visual)}>
              {t("login.password")}
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass(visual)}
              autoComplete="new-password"
              minLength={8}
              placeholder={t("registrerenPage.passwordPh")}
            />
          </div>
          <AuthCaptcha
            ref={captchaRef}
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
            onError={() => setCaptchaToken(null)}
            className="flex justify-center"
          />
          <button
            type="button"
            disabled={disabled || emailBusy || busyOAuth !== null || !captchaReady}
            onClick={() => void handleEmailSignUp()}
            className={primaryBtnClass(visual)}
          >
            {emailBusy ? t("registrerenPage.submitBusy") : t("signup.emailFallbackCta")}
          </button>
        </div>
      )}

      {showPasskey ? (
        <>
          <OrDivider label={t("login.orDivider")} visual={visual} />
          <PasskeySignInButton
            disabled={disabled || emailBusy || busyOAuth !== null}
            onError={(message) => onError?.(message)}
            onSuccess={async (userId, userEmail) => {
              markStarted("passkey");
              await finishSession(userId, userEmail);
            }}
            className={
              visual === "story"
                ? "flex w-full items-center justify-center rounded-xl border border-[var(--story-border)] bg-white px-6 py-[15px] text-base font-semibold text-[var(--story-text)] transition-colors hover:border-[var(--story-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                : undefined
            }
          />
        </>
      ) : null}
    </div>
  );
}
