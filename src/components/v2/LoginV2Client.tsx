"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AuthCaptcha } from "@/components/auth/AuthCaptcha";
import { OAuthProviderIcon } from "@/components/auth/OAuthProviderIcon";
import { useAuthCaptcha } from "@/hooks/useAuthCaptcha";
import { useI18n } from "@/lib/i18n";
import { setLastAuthMethod } from "@/lib/auth/returningUser";
import { mapAuthCaptchaError } from "@/lib/auth/captcha";
import {
  isProviderNotEnabledError,
  startOAuthSignIn,
} from "@/lib/auth/socialSignIn";
import {
  hasV2LocalDataToMigrate,
  migrateV2LocalDataToSupabase,
} from "@/lib/migrateV2LocalDataToSupabase";
import { createClient } from "@/lib/supabase/client";

import { LoginShell } from "@/components/login/LoginShell";
import { sanitizeNextPath } from "@/lib/safeRedirect";

import { useV2 } from "./V2Context";
import { v2Styles } from "./theme";

type LoginV2ClientProps = {
  /** Root-entry: "Welkom bij Structuro"; standaard login: "Welkom terug." */
  variant?: "login" | "welcome";
  /** Veilige relative path na login (uit `/login?next=`). */
  nextPath?: string;
};

export default function LoginV2Client({
  variant = "login",
  nextPath,
}: LoginV2ClientProps) {
  const { t } = useI18n();
  const { resetAllLocalData } = useV2();
  const nextAfterLogin = sanitizeNextPath(nextPath);
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
    resetCaptcha();
  }, [emailOpen, resetCaptcha]);

  const tCaptcha = (key: string): string =>
    key === "login.errCaptcha" ? t("v2.loginCaptchaError") : key;

  /** Migreer lokale v2-data naar het account; wis pas daarna. */
  const claimLocalThenContinue = async (userId: string): Promise<string> => {
    if (hasV2LocalDataToMigrate()) {
      try {
        const result = await migrateV2LocalDataToSupabase(userId);
        if (result.migrated) {
          resetAllLocalData();
          return nextAfterLogin;
        }
      } catch (err) {
        console.warn("[LoginV2] migrate failed", err);
      }
    }
    resetAllLocalData();
    return nextAfterLogin;
  };

  const startGoogle = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError(t("v2.loginUnavailable"));
        setBusy(false);
        return;
      }
      setLastAuthMethod("google");
      await startOAuthSignIn(supabase, "google", nextAfterLogin);
    } catch (err) {
      setError(
        isProviderNotEnabledError(err)
          ? t("v2.loginGoogleUnavailable")
          : err instanceof Error
            ? err.message
            : t("v2.accountSaveGenericError"),
      );
      setBusy(false);
    }
  };

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const captchaToken = resolveCaptchaToken();
    if (captchaEnabled && !captchaToken) {
      setError(t("v2.loginCaptchaError"));
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError(t("v2.loginUnavailable"));
        setBusy(false);
        return;
      }
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (authError) throw authError;
      if (data.user) {
        setLastAuthMethod("password");
        await supabase.auth.getSession();
        const next = await claimLocalThenContinue(data.user.id);
        resetCaptcha();
        window.location.assign(next);
        return;
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      if (
        raw.includes("Invalid login credentials") ||
        raw.includes("Invalid credentials")
      ) {
        setError(t("v2.loginBadCredentials"));
      } else {
        setError(
          mapAuthCaptchaError(raw || t("v2.accountSaveGenericError"), tCaptcha),
        );
      }
      resetCaptcha();
      setBusy(false);
    }
  };

  const titleKey =
    variant === "welcome" ? "v2.loginWelcomeTitle" : "v2.loginTitle";
  const subKey = variant === "welcome" ? "v2.loginWelcomeSub" : "v2.loginSub";

  return (
    <LoginShell error={error}>
      <div className="v2-login-gate v2-fade" aria-live="polite">
        <div className="v2-login-gate__copy">
          <h1 className="v2-login-gate__title">{t(titleKey)}</h1>
          <p className="v2-login-gate__sub">{t(subKey)}</p>
        </div>

        <div className="v2-login-gate__actions">
          <button
            type="button"
            className="v2-account-wall__btn"
            onClick={() => void startGoogle()}
            disabled={busy}
          >
            <OAuthProviderIcon provider="google" className="h-[19px] w-[19px]" />
            {t("oauth.googleCta")}
          </button>

          <div className="v2-account-wall__soon" aria-hidden="true">
            <div className="v2-account-wall__soon-chip">
              <span className="v2-account-wall__soon-icon">
                <OAuthProviderIcon
                  provider="azure"
                  className="h-[15px] w-[15px]"
                />
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
              onSubmit={(e) => void signInWithEmail(e)}
            >
              <label htmlFor="v2-login-email" style={v2Styles.srOnly}>
                {t("v2.loginEmailLabel")}
              </label>
              <input
                id="v2-login-email"
                type="email"
                inputMode="email"
                className="v2-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("v2.loginEmailLabel")}
                autoComplete="email"
                required
              />
              <label htmlFor="v2-login-password" style={v2Styles.srOnly}>
                {t("v2.loginPasswordLabel")}
              </label>
              <input
                id="v2-login-password"
                type="password"
                className="v2-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("v2.loginPasswordLabel")}
                autoComplete="current-password"
                required
                minLength={6}
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
                {busy ? t("v2.accountSaveBusy") : t("v2.loginSubmit")}
              </button>
            </form>
          )}
        </div>

        <p className="v2-login-gate__footer">
          {t("v2.loginNoAccountBefore")}{" "}
          <Link href="/onboarding" className="v2-login-gate__footer-link">
            {t("v2.loginNoAccountLink")}
          </Link>
        </p>
      </div>
    </LoginShell>
  );
}
