"use client";

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
import { useI18n } from "@/lib/i18n";
import {
  getResolvedSignupSourceForProfile,
  getStoredSignupCampaign,
  queueSignupCompletedForAnalytics,
} from "@/lib/posthog/signupAttribution";
import { createClient } from "@/lib/supabase/client";

import { v2Styles } from "./theme";
import {
  markV2PostAccountNamePending,
  V2_POST_ACCOUNT_NAME_PATH,
} from "./v2PostAccountName";
import {
  trackV2AccountSaveClicked,
  trackV2AccountSaveShown,
} from "./v2OnboardingFunnel";

/**
 * Soft account-scherm na eerste onboarding (guest): Google of e-mail, of Niet nu.
 * Geen naam vóór account. Na succes → naamstap (onAccountCreated / OAuth next).
 */
export default function V2AccountSaveStep({
  onSkip,
  onAccountCreated,
}: {
  onSkip: () => void;
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
      // Geen naam vóór account; personalisatie volgt in V2NameStep.
      const result = await signUpWithEmailPassword(supabase, {
        email: emailTrimmed,
        password,
        fullName: "",
        signupSource: getResolvedSignupSourceForProfile(),
        signupCampaign: getStoredSignupCampaign(),
        captchaToken,
      });

      if (result.needsEmailConfirmation) {
        setError(t("v2.accountSaveConfirmEmail"));
        resetCaptcha();
        setBusy(false);
        return;
      }

      await supabase.auth.getSession();
      await finalizeNewAccountSession(
        result.userId,
        result.email ?? emailTrimmed,
        { homePath: "/v2/home" },
      );
      markV2PostAccountNamePending();
      onAccountCreated();
    } catch (err) {
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
      <p className="v2-auth-gate__brand">Structuro</p>

      <div className="v2-auth-gate__body">
        <h1 className="v2-auth-gate__title">{t("v2.accountSaveTitle")}</h1>
        <p className="v2-auth-gate__sub">{t("v2.accountSaveSub")}</p>

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

          {!emailOpen ? (
            <button
              type="button"
              className="v2-link"
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
          )}

          {error ? (
            <p className="v2-auth-gate__error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            className="v2-link"
            onClick={onSkip}
            disabled={busy}
          >
            {t("v2.accountSaveSkip")}
          </button>
        </div>
      </div>
    </div>
  );
}
