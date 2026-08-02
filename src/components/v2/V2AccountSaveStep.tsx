"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { AuthCaptcha } from "@/components/auth/AuthCaptcha";
import { OAuthProviderIcon } from "@/components/auth/OAuthProviderIcon";
import { useAuthCaptcha } from "@/hooks/useAuthCaptcha";
import { mapAuthCaptchaError } from "@/lib/auth/captcha";
import { finalizeNewAccountSession } from "@/lib/auth/completeSignUpSession";
import { signUpWithEmailPassword } from "@/lib/auth/emailPasswordSignUp";
import {
  isSignupEmailFormatValid,
  normalizeSignupEmail,
} from "@/lib/auth/signupEmail";
import { setLastAuthMethod } from "@/lib/auth/returningUser";
import {
  isProviderNotEnabledError,
  startOAuthSignIn,
} from "@/lib/auth/socialSignIn";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { useI18n } from "@/lib/i18n";
import {
  getResolvedSignupSourceForProfile,
  getStoredSignupCampaign,
  queueSignupCompletedForAnalytics,
} from "@/lib/posthog/signupAttribution";
import { trackClientFunnelEvent } from "@/lib/posthog/clientFunnelAnalyticsClient";
import { createClient } from "@/lib/supabase/client";

import { v2Styles } from "./theme";
import {
  consumeAccountSaveOauthPending,
  markAccountSaveOauthPending,
} from "./v2AccountSaveOauth";
import {
  trackV2AccountSaveClicked,
  trackV2AccountSaveOauthStarted,
  trackV2AccountSaveReturned,
  trackV2AccountSaveShown,
} from "./v2OnboardingFunnel";
import {
  consumeV2PostAccountNamePending,
  markV2PostAccountNamePending,
  V2_POST_ACCOUNT_NAME_PATH,
} from "./v2PostAccountName";
import { markV2ShellWelcomeSeen } from "./v2ShellWelcome";

const ACCOUNT_SAVE_LOGO = "/v2/logo-mark.png";

const FALLBACK_PREVIEW_NL = [
  "Abonnement opzeggen",
  "Een mail beantwoorden",
  "Training of bewegingssessie",
];

const FALLBACK_PREVIEW_EN = [
  "Cancel a subscription",
  "Reply to an email",
  "Training or a short workout",
];

/**
 * Account-wall B: bewijskaart van de dagstart + bewaren onderaan.
 * Layout volgt de standalone AccountB-mock.
 */
export default function V2AccountSaveStep({
  onAccountCreated,
  previewSteps,
}: {
  /** E-mail-signup met sessie: blijf in SPA en ga naar naamstap. */
  onAccountCreated: () => void;
  /** Tot 3 dagstart-taken in de bewijskaart. */
  previewSteps?: string[];
}) {
  const { t, locale } = useI18n();
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    enabled: captchaEnabled,
    captchaRef,
    setCaptchaToken,
    resetCaptcha,
    resolveCaptchaToken,
    captchaReady,
  } = useAuthCaptcha();

  const steps = useMemo(() => {
    const cleaned = (previewSteps ?? []).map((s) => s.trim()).filter(Boolean);
    if (cleaned.length > 0) return cleaned.slice(0, 3);
    return locale === "en" ? FALLBACK_PREVIEW_EN : FALLBACK_PREVIEW_NL;
  }, [previewSteps, locale]);

  useEffect(() => {
    if (consumeAccountSaveOauthPending()) {
      trackV2AccountSaveReturned("onboarding");
    }
    trackV2AccountSaveShown("onboarding");
  }, []);

  useEffect(() => {
    resetCaptcha();
  }, [emailOpen, resetCaptcha]);

  const startGoogle = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    trackV2AccountSaveClicked("onboarding");
    trackV2AccountSaveOauthStarted("onboarding");
    markAccountSaveOauthPending();
    queueSignupCompletedForAnalytics();
    try {
      const supabase = createClient();
      if (!supabase) {
        setError(t("v2.accountSaveUnavailable"));
        setBusy(false);
        return;
      }
      setLastAuthMethod("google");
      await startOAuthSignIn(supabase, "google", V2_POST_ACCOUNT_NAME_PATH);
    } catch (err) {
      consumeAccountSaveOauthPending();
      setError(
        isProviderNotEnabledError(err)
          ? t("v2.accountSaveGoogleUnavailable")
          : err instanceof Error
            ? err.message
            : t("v2.accountSaveGenericError"),
      );
      setBusy(false);
    }
  };

  const signUpWithEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const emailTrimmed = normalizeSignupEmail(email);
    if (!emailTrimmed || !isSignupEmailFormatValid(email)) {
      setError(t("registrerenPage.errEmailInvalid"));
      return;
    }
    if (password.length < 8) {
      setError(t("registrerenPage.errPasswordWeak"));
      return;
    }

    const captchaToken = resolveCaptchaToken();
    if (captchaEnabled && !captchaToken) {
      setError(t("login.errCaptcha"));
      return;
    }

    setBusy(true);
    trackV2AccountSaveClicked("onboarding");
    try {
      const supabase = createClient();
      if (!supabase) {
        setError(t("v2.accountSaveUnavailable"));
        setBusy(false);
        return;
      }
      markV2PostAccountNamePending();

      const result = await signUpWithEmailPassword(supabase, {
        email: emailTrimmed,
        password,
        fullName: "",
        signupSource: getResolvedSignupSourceForProfile(),
        signupCampaign: getStoredSignupCampaign(),
        captchaToken,
      });

      if (result.needsEmailConfirmation) {
        consumeV2PostAccountNamePending();
        trackClientFunnelEvent(ANALYTICS_EVENTS.signup_email_confirmation_sent, {
          surface: "account_save",
          method: "email_password",
        });
        setError(t("v2.accountSaveConfirmEmail"));
        resetCaptcha();
        setBusy(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        consumeV2PostAccountNamePending();
        setError(t("v2.accountSaveGenericError"));
        resetCaptcha();
        setBusy(false);
        return;
      }

      markV2ShellWelcomeSeen(result.userId);
      onAccountCreated();

      void finalizeNewAccountSession(
        result.userId,
        result.email ?? emailTrimmed,
        { homePath: "/abonnement" },
      ).catch(() => {
        /* best-effort */
      });
    } catch (err) {
      consumeV2PostAccountNamePending();
      const raw =
        err instanceof Error ? err.message : t("registrerenPage.errGeneric");
      if (raw.toLowerCase().includes("already registered")) {
        setError(t("registrerenPage.errEmailInUse"));
      } else {
        setError(mapAuthCaptchaError(raw, t));
      }
      resetCaptcha();
      setBusy(false);
    }
  };

  return (
    <div className="v2-account-wall v2-fade" aria-live="polite">
      <header className="v2-account-wall__top">
        <div className="v2-account-wall__brand">
          <Image
            src={ACCOUNT_SAVE_LOGO}
            alt=""
            width={22}
            height={22}
            className="v2-account-wall__brand-logo"
            priority
          />
          <span className="v2-account-wall__brand-name">Structuro</span>
        </div>
      </header>

      <div className="v2-account-wall__mid">
        <div className="v2-account-wall__proof">
          <div className="v2-account-wall__card">
            <div className="v2-account-wall__card-head">
              <span className="v2-account-wall__card-kicker">
                {t("v2.accountSaveCardKicker")}
              </span>
              <span className="v2-account-wall__card-meta">
                {t("v2.accountSaveCardMeta", { count: String(steps.length) })}
              </span>
            </div>
            <ul className="v2-account-wall__steps">
              {steps.map((step) => (
                <li key={step} className="v2-account-wall__step">
                  <span className="v2-account-wall__check" aria-hidden />
                  <span className="v2-account-wall__step-lbl">{step}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="v2-account-wall__card-fade" aria-hidden />
        </div>

        <h1 className="v2-account-wall__title">
          {t("v2.accountSaveTitleBefore")}
          <b>{t("v2.accountSaveTitleEm")}</b>
          {t("v2.accountSaveTitleAfter")}
        </h1>
        <p className="v2-account-wall__sub">{t("v2.accountSaveSub")}</p>
      </div>

      <div className="v2-account-wall__bottom">
        <button
          type="button"
          className="v2-account-wall__btn"
          onClick={() => void startGoogle()}
          disabled={busy}
        >
          <OAuthProviderIcon provider="google" className="h-[19px] w-[19px]" />
          {t("v2.accountSaveGoogle")}
        </button>

        <div className="v2-account-wall__soon" aria-hidden="true">
          <div className="v2-account-wall__soon-chip">
            <span className="v2-account-wall__soon-icon">
              <OAuthProviderIcon provider="azure" className="h-[15px] w-[15px]" />
            </span>
            <span>{t("v2.accountSaveSoonOutlook")}</span>
            <span className="v2-account-wall__soon-tag">
              {t("oauth.comingSoon").toLowerCase()}
            </span>
          </div>
          <div className="v2-account-wall__soon-chip">
            <span className="v2-account-wall__soon-icon">
              <OAuthProviderIcon
                provider="facebook"
                className="h-[15px] w-[15px]"
              />
            </span>
            <span>{t("v2.accountSaveSoonFacebook")}</span>
            <span className="v2-account-wall__soon-tag">
              {t("oauth.comingSoon").toLowerCase()}
            </span>
          </div>
        </div>

        {!emailOpen ? (
          <button
            type="button"
            className="v2-account-wall__email-link"
            onClick={() => {
              setEmailOpen(true);
              setError(null);
            }}
            disabled={busy}
          >
            {t("v2.accountSaveEmail")}
          </button>
        ) : (
          <form
            className="v2-account-wall__email"
            onSubmit={(e) => void signUpWithEmail(e)}
          >
            <label htmlFor="v2-save-email" style={v2Styles.srOnly}>
              {t("registrerenPage.emailLabel")}
            </label>
            <input
              id="v2-save-email"
              type="email"
              inputMode="email"
              className="v2-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("registrerenPage.emailPh")}
              autoComplete="email"
              required
            />
            <label htmlFor="v2-save-password" style={v2Styles.srOnly}>
              Wachtwoord
            </label>
            <input
              id="v2-save-password"
              type="password"
              className="v2-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("registrerenPage.passwordPh")}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <AuthCaptcha
              ref={captchaRef}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
              className="flex justify-center"
            />
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={busy || !captchaReady}
            >
              {busy ? t("v2.accountSaveBusy") : t("v2.accountSaveEmailSubmit")}
            </button>
          </form>
        )}

        {error ? (
          <p className="v2-account-wall__error" role="alert">
            {error}
          </p>
        ) : null}

        <p className="v2-account-wall__legal">
          {t("v2.accountSaveLegalBefore")}{" "}
          <Link href="/terms">{t("v2.accountSaveLegalTerms")}</Link>{" "}
          {t("v2.accountSaveLegalAnd")}{" "}
          <Link href="/privacy">{t("v2.accountSaveLegalPrivacy")}</Link>.
        </p>
      </div>
    </div>
  );
}
