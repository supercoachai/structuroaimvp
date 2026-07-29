"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";

import { AuthCaptcha } from "@/components/auth/AuthCaptcha";
import { useAuthCaptcha } from "@/hooks/useAuthCaptcha";
import { mapAuthCaptchaError } from "@/lib/auth/captcha";
import { finalizeNewAccountSession } from "@/lib/auth/completeSignUpSession";
import { signUpWithEmailPassword } from "@/lib/auth/emailPasswordSignUp";
import { setLastAuthMethod } from "@/lib/auth/returningUser";
import { isSignupEmailFormatValid, normalizeSignupEmail } from "@/lib/auth/signupEmail";
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
  consumeV2PostAccountNamePending,
  markV2PostAccountNamePending,
  V2_POST_ACCOUNT_NAME_PATH,
} from "./v2PostAccountName";
import { markV2ShellWelcomeSeen } from "./v2ShellWelcome";
import {
  trackV2AccountSaveClicked,
  trackV2AccountSaveShown,
} from "./v2OnboardingFunnel";

/** Zelfde mark als V2Chrome (~9KB). */
const V2_LOGO_SRC = "/v2/logo-mark.png";

/**
 * Soft account-scherm na eerste onboarding (guest): Google-first zoals login-story,
 * e-mail achter Meer opties. Geen “Niet nu”: zonder account geen app-toegang.
 */
export default function V2AccountSaveStep({
  onAccountCreated,
}: {
  /** E-mail-signup met sessie: blijf in SPA en ga naar naamstap. */
  onAccountCreated: () => void;
}) {
  const { t } = useI18n();
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

  useEffect(() => {
    trackV2AccountSaveShown("onboarding");
  }, []);

  useEffect(() => {
    resetCaptcha();
  }, [emailOpen, resetCaptcha]);

  const continueWithGoogle = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    trackV2AccountSaveClicked("onboarding");
    try {
      const supabase = createClient();
      if (!supabase) {
        setError(t("v2.accountSaveUnavailable"));
        setBusy(false);
        return;
      }
      setLastAuthMethod("google");
      queueSignupCompletedForAnalytics();
      markV2PostAccountNamePending();
      await startOAuthSignIn(supabase, "google", V2_POST_ACCOUNT_NAME_PATH);
    } catch (err) {
      consumeV2PostAccountNamePending();
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
      // Vlag vóór finalize: concurrent V2ClaimOnAuth / remount ziet post-account flow.
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
        // Geen sessie: pending-vlag mag fresh-start niet naar name sturen.
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

      // Vers account: de "nieuwe update"-welkomsheet is niet voor hen bedoeld.
      markV2ShellWelcomeSeen(result.userId);

      // UI eerst vooruit (naamstap); migrate/analytics mogen niet de funnel resetten.
      onAccountCreated();

      void finalizeNewAccountSession(
        result.userId,
        result.email ?? emailTrimmed,
        { homePath: "/abonnement" },
      ).catch(() => {
        /* best-effort; naamstap + V2ClaimOnAuth kunnen retryen */
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
    <div className="v2-auth-gate v2-fade" aria-live="polite">
      <div className="v2-auth-gate__brand v2-auth-gate__brand--logo">
        <Image
          src={V2_LOGO_SRC}
          alt={t("v2.accountSaveLogoAria")}
          width={36}
          height={26}
          className="v2-auth-gate__logo"
          priority
        />
      </div>

      <div className="v2-auth-gate__body">
        <div className="v2-auth-gate__copy">
          <h1 className="v2-auth-gate__title">{t("v2.accountSaveTitle")}</h1>
          <p className="v2-auth-gate__sub">{t("v2.accountSaveSub")}</p>
        </div>

        <div className="v2-auth-gate__actions">
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => void continueWithGoogle()}
            disabled={busy}
          >
            {busy && !emailOpen
              ? t("v2.accountSaveBusy")
              : t("v2.accountSaveGoogle")}
          </button>

          <details
            className="v2-auth-gate__more"
            open={emailOpen}
            onToggle={(e) => {
              const nextOpen = (e.currentTarget as HTMLDetailsElement).open;
              setEmailOpen(nextOpen);
              if (nextOpen) setError(null);
            }}
          >
            <summary className="v2-auth-gate__more-summary">
              {t("v2.accountSaveMoreOptions")}
              <svg
                width="14"
                height="14"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
                className="v2-auth-gate__more-chevron"
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>

            <form
              className="v2-auth-gate__email"
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
          </details>

          {error ? (
            <p className="v2-auth-gate__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
