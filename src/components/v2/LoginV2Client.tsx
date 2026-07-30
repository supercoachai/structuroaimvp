"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AuthCaptcha } from "@/components/auth/AuthCaptcha";
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

import { useV2 } from "./V2Context";
import { v2Styles } from "./theme";

const NEXT_AFTER_LOGIN = "/";

type LoginV2ClientProps = {
  /** Root-entry: "Welkom bij Structuro"; standaard login: "Welkom terug." */
  variant?: "login" | "welcome";
};

export default function LoginV2Client({
  variant = "login",
}: LoginV2ClientProps) {
  const { t } = useI18n();
  const { resetAllLocalData } = useV2();
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
          return NEXT_AFTER_LOGIN;
        }
      } catch (err) {
        console.warn("[LoginV2] migrate failed", err);
      }
    }
    // Geen lokale data om te bewaren: wis eventuele lege/rest-state voor privacy.
    resetAllLocalData();
    return NEXT_AFTER_LOGIN;
  };

  const continueWithGoogle = async () => {
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
      // Niet wissen vóór OAuth-return: V2ClaimOnAuth migreert na terugkomst.
      setLastAuthMethod("google");
      await startOAuthSignIn(supabase, "google", NEXT_AFTER_LOGIN);
    } catch (err) {
      setError(
        isProviderNotEnabledError(err)
          ? t("v2.loginGoogleUnavailable")
          : err instanceof Error
            ? err.message
            : t("v2.accountSaveGenericError")
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
        setError(mapAuthCaptchaError(raw || t("v2.accountSaveGenericError"), tCaptcha));
      }
      resetCaptcha();
      setBusy(false);
    }
  };

  return (
    <LoginShell error={error}>
      <div className="v2-auth-gate v2-auth-gate--shell v2-fade" aria-live="polite">
        <div className="v2-auth-gate__body">
          <h1 className="v2-auth-gate__title">
            {t(variant === "welcome" ? "v2.loginWelcomeTitle" : "v2.loginTitle")}
          </h1>

          <div className="v2-auth-gate__actions">
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => void continueWithGoogle()}
              disabled={busy}
            >
              {busy && !emailOpen
                ? t("v2.accountSaveBusy")
                : t("v2.loginGoogle")}
            </button>

            {!emailOpen ? (
              <button
                type="button"
                className="v2-link"
                onClick={() => {
                  setEmailOpen(true);
                  setError(null);
                }}
              >
                {t("v2.accountSaveEmail")}
              </button>
            ) : (
              <form className="v2-auth-gate__email" onSubmit={(e) => void signInWithEmail(e)}>
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
        </div>

        <p className="v2-auth-gate__footer">
          <Link href="/onboarding" className="v2-link">
            {t("v2.loginNoAccount")}
          </Link>
        </p>
      </div>
    </LoginShell>
  );
}
