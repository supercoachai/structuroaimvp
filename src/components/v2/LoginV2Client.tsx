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
  sendLoginMagicLink,
  startOAuthSignIn,
  verifyLoginEmailOtp,
} from "@/lib/auth/socialSignIn";
import {
  isSignupEmailFormatValid,
  normalizeSignupEmail,
} from "@/lib/auth/signupEmail";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import {
  hasV2LocalDataToMigrate,
  migrateV2LocalDataToSupabase,
} from "@/lib/migrateV2LocalDataToSupabase";
import { trackClientFunnelEvent } from "@/lib/posthog/clientFunnelAnalyticsClient";
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

type EmailMode = "password" | "magic" | "forgot";

function mapMagicLinkLoginError(
  message: string,
  t: (key: string) => string,
): string {
  const lower = message.toLowerCase();
  if (lower.includes("signups not allowed") || lower.includes("user not found")) {
    return t("login.magicLinkNoAccount");
  }
  if (lower.includes("rate limit")) {
    return t("login.errRateLimitEmail");
  }
  if (
    lower.includes("invalid_otp") ||
    lower.includes("otp_expired") ||
    lower.includes("token")
  ) {
    return t("login.otpInvalid");
  }
  return message;
}

function mapResetApiError(
  code: string | undefined,
  t: (key: string) => string,
): string {
  if (code === "rate_limit_email" || code === "rate_limited") {
    return t("login.errRateLimitEmail");
  }
  if (code === "rate_limit") return t("login.errRateLimit");
  if (code === "invalid_email") return t("login.emailRequired");
  return t("login.sendFailed");
}

export default function LoginV2Client({
  variant = "login",
  nextPath,
}: LoginV2ClientProps) {
  const { t } = useI18n();
  const { resetAllLocalData } = useV2();
  const nextAfterLogin = sanitizeNextPath(nextPath);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSentEmail, setOtpSentEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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
  }, [emailOpen, emailMode, otpSentEmail, resetCaptcha]);

  const closeEmailPath = () => {
    setEmailOpen(false);
    setEmailMode("password");
    setPassword("");
    setOtp("");
    setOtpSentEmail("");
    setResetSent(false);
    setError(null);
    setInfo(null);
    resetCaptcha();
  };

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
    setInfo(null);
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
    setInfo(null);

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
          mapAuthCaptchaError(raw || t("v2.accountSaveGenericError"), t),
        );
      }
      resetCaptcha();
      setBusy(false);
    }
  };

  const sendMagicLink = async () => {
    if (busy) return;
    setError(null);
    setInfo(null);
    const trimmed = normalizeSignupEmail(email);
    if (!trimmed || !isSignupEmailFormatValid(email)) {
      setError(t("login.emailRequired"));
      return;
    }
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
        return;
      }
      await sendLoginMagicLink(supabase, trimmed, nextAfterLogin, captchaToken);
      trackClientFunnelEvent(ANALYTICS_EVENTS.login_magic_link_sent, {
        surface: "login_v2",
        has_next: Boolean(nextPath),
      });
      setOtpSentEmail(trimmed);
      resetCaptcha();
    } catch (err) {
      trackClientFunnelEvent(ANALYTICS_EVENTS.login_magic_link_failed, {
        surface: "login_v2",
        error_kind:
          err instanceof Error ? err.message.slice(0, 64) : "unknown",
      });
      const raw = err instanceof Error ? err.message : t("login.sendFailed");
      setError(mapMagicLinkLoginError(mapAuthCaptchaError(raw, t), t));
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  };

  const verifyMagicOtp = async () => {
    if (busy || otp.length !== 8 || !otpSentEmail) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError(t("v2.loginUnavailable"));
        return;
      }
      const user = await verifyLoginEmailOtp(supabase, otpSentEmail, otp);
      trackClientFunnelEvent(ANALYTICS_EVENTS.login_otp_verified, {
        surface: "login_v2",
        method: "otp",
      });
      setLastAuthMethod("magic");
      await supabase.auth.getSession();
      const next = await claimLocalThenContinue(user.id);
      window.location.assign(next);
    } catch (err) {
      const raw = err instanceof Error ? err.message : t("login.otpInvalid");
      setError(mapMagicLinkLoginError(mapAuthCaptchaError(raw, t), t));
      setBusy(false);
    }
  };

  const sendPasswordReset = async () => {
    if (busy) return;
    setError(null);
    setInfo(null);
    const trimmed = normalizeSignupEmail(email);
    if (!trimmed || !isSignupEmailFormatValid(email)) {
      setError(t("login.emailRequired"));
      return;
    }
    const captchaToken = resolveCaptchaToken();
    if (captchaEnabled && !captchaToken) {
      setError(t("v2.loginCaptchaError"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          ...(captchaToken ? { captchaToken } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setError(mapResetApiError(data?.error, t));
        resetCaptcha();
        return;
      }
      setResetSent(true);
      setInfo(t("login.resetSent"));
      resetCaptcha();
    } catch {
      setError(t("login.sendFailed"));
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  };

  const titleKey =
    variant === "welcome" ? "v2.loginWelcomeTitle" : "v2.loginTitle";
  const subKey = variant === "welcome" ? "v2.loginWelcomeSub" : "v2.loginSub";

  const emailHeading =
    emailMode === "forgot"
      ? t("login.forgotStoryHeading")
      : emailMode === "magic"
        ? t("login.magicLinkToggle")
        : t(titleKey);
  const emailSub =
    emailMode === "forgot"
      ? t("login.forgotHelp")
      : emailMode === "magic"
        ? t("login.magicLinkHelp")
        : t(subKey);

  return (
    <LoginShell error={error} info={info}>
      <div className="v2-login-gate v2-fade" aria-live="polite">
        <div className="v2-login-gate__copy">
          <h1 className="v2-login-gate__title">
            {emailOpen ? emailHeading : t(titleKey)}
          </h1>
          <p className="v2-login-gate__sub">
            {emailOpen ? emailSub : t(subKey)}
          </p>
        </div>

        <div className="v2-login-gate__actions">
          {!emailOpen ? (
            <>
              <button
                type="button"
                className="v2-account-wall__btn"
                onClick={() => void startGoogle()}
                disabled={busy}
              >
                <OAuthProviderIcon
                  provider="google"
                  className="h-[19px] w-[19px]"
                />
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

              <button
                type="button"
                className="v2-account-wall__email-link"
                onClick={() => {
                  setEmailOpen(true);
                  setEmailMode("password");
                  setError(null);
                  setInfo(null);
                  setResetSent(false);
                  setOtpSentEmail("");
                }}
                disabled={busy}
              >
                {t("v2.accountSaveEmail")}
              </button>
            </>
          ) : emailMode === "forgot" ? (
            <div className="v2-account-wall__email">
              {resetSent ? (
                <div className="v2-login-gate__alt-links">
                  <button
                    type="button"
                    className="v2-login-gate__text-link"
                    onClick={() => {
                      setEmailMode("password");
                      setResetSent(false);
                      setInfo(null);
                      setError(null);
                    }}
                    disabled={busy}
                  >
                    {t("login.backSignIn")}
                  </button>
                  <button
                    type="button"
                    className="v2-login-gate__text-link v2-login-gate__text-link--muted"
                    onClick={closeEmailPath}
                    disabled={busy}
                  >
                    {t("v2.loginOtherOptions")}
                  </button>
                </div>
              ) : (
                <>
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
                  <AuthCaptcha
                    ref={captchaRef}
                    onVerify={setCaptchaToken}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => setCaptchaToken(null)}
                    className="flex justify-center"
                  />
                  <button
                    type="button"
                    className="btn-primary w-full"
                    disabled={busy || !captchaReady}
                    onClick={() => void sendPasswordReset()}
                  >
                    {busy ? t("login.busy") : t("login.sendReset")}
                  </button>
                  <div className="v2-login-gate__alt-links">
                    <button
                      type="button"
                      className="v2-login-gate__text-link"
                      onClick={() => {
                        setEmailMode("password");
                        setError(null);
                        setInfo(null);
                      }}
                      disabled={busy}
                    >
                      {t("login.backSignIn")}
                    </button>
                    <button
                      type="button"
                      className="v2-login-gate__text-link v2-login-gate__text-link--muted"
                      onClick={closeEmailPath}
                      disabled={busy}
                    >
                      {t("v2.loginOtherOptions")}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : emailMode === "magic" ? (
            <div className="v2-account-wall__email">
              {otpSentEmail ? (
                <>
                  <p className="v2-login-gate__hint">
                    {t("login.magicLinkSentBody", { email: otpSentEmail })}
                  </p>
                  <label htmlFor="v2-login-otp" style={v2Styles.srOnly}>
                    {t("login.otpLabel")}
                  </label>
                  <input
                    id="v2-login-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    className="v2-field"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 8))
                    }
                    placeholder={t("login.otpPlaceholder")}
                  />
                  <button
                    type="button"
                    className="btn-primary w-full"
                    disabled={busy || otp.length !== 8}
                    onClick={() => void verifyMagicOtp()}
                  >
                    {busy ? t("login.busy") : t("login.otpCta")}
                  </button>
                  <p className="v2-login-gate__hint">{t("login.magicLinkLinkBackup")}</p>
                  <button
                    type="button"
                    className="v2-login-gate__text-link"
                    disabled={busy}
                    onClick={() => {
                      setOtpSentEmail("");
                      setOtp("");
                      setError(null);
                    }}
                  >
                    {t("login.otpResend")}
                  </button>
                </>
              ) : (
                <>
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
                  <AuthCaptcha
                    ref={captchaRef}
                    onVerify={setCaptchaToken}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => setCaptchaToken(null)}
                    className="flex justify-center"
                  />
                  <button
                    type="button"
                    className="btn-primary w-full"
                    disabled={busy || !captchaReady}
                    onClick={() => void sendMagicLink()}
                  >
                    {busy ? t("login.busy") : t("login.magicLinkCta")}
                  </button>
                </>
              )}
              <div className="v2-login-gate__alt-links">
                <button
                  type="button"
                  className="v2-login-gate__text-link"
                  onClick={() => {
                    setEmailMode("password");
                    setOtp("");
                    setOtpSentEmail("");
                    setError(null);
                    setInfo(null);
                  }}
                  disabled={busy}
                >
                  {t("login.passwordToggle")}
                </button>
                <button
                  type="button"
                  className="v2-login-gate__text-link v2-login-gate__text-link--muted"
                  onClick={closeEmailPath}
                  disabled={busy}
                >
                  {t("v2.loginOtherOptions")}
                </button>
              </div>
            </div>
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
              <div className="v2-login-gate__alt-links">
                <button
                  type="button"
                  className="v2-login-gate__text-link"
                  onClick={() => {
                    setEmailMode("forgot");
                    setPassword("");
                    setError(null);
                    setInfo(null);
                    setResetSent(false);
                  }}
                  disabled={busy}
                >
                  {t("login.forgot")}
                </button>
                <button
                  type="button"
                  className="v2-login-gate__text-link"
                  onClick={() => {
                    setEmailMode("magic");
                    setPassword("");
                    setError(null);
                    setInfo(null);
                    setOtpSentEmail("");
                    setOtp("");
                  }}
                  disabled={busy}
                >
                  {t("login.magicLinkToggle")}
                </button>
                <button
                  type="button"
                  className="v2-login-gate__text-link v2-login-gate__text-link--muted"
                  onClick={closeEmailPath}
                  disabled={busy}
                >
                  {t("v2.loginOtherOptions")}
                </button>
              </div>
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
