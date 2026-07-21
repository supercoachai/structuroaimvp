"use client";

import { useState } from "react";

import { AuthCaptcha } from "@/components/auth/AuthCaptcha";
import {
  sendLoginMagicLink,
  verifyLoginEmailOtp,
} from "@/lib/auth/socialSignIn";
import { mapAuthCaptchaError } from "@/lib/auth/captcha";
import { isSignupEmailFormatValid, normalizeSignupEmail } from "@/lib/auth/signupEmail";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuthCaptcha } from "@/hooks/useAuthCaptcha";

type MagicLinkSignInFormProps = {
  disabled?: boolean;
  nextPath?: string;
  onError?: (message: string) => void;
  /** Na geslaagde code-verify (zelfde browser, geen PKCE). */
  onVerified?: (user: { id: string; email: string | null | undefined }) => void;
  /** Direct open (bijv. in login e-mail-sectie), zonder toggle. */
  startOpen?: boolean;
  visual?: "story" | "work";
};

function mapMagicLinkLoginError(message: string, t: (key: string) => string): string {
  const lower = message.toLowerCase();
  if (lower.includes("signups not allowed") || lower.includes("user not found")) {
    return t("login.magicLinkNoAccount");
  }
  if (lower.includes("rate limit")) {
    return t("login.errRateLimitEmail");
  }
  if (lower.includes("invalid_otp") || lower.includes("otp_expired") || lower.includes("token")) {
    return t("login.otpInvalid");
  }
  return message;
}

export function MagicLinkSignInForm({
  disabled,
  nextPath,
  onError,
  onVerified,
  startOpen = false,
  visual = "work",
}: MagicLinkSignInFormProps) {
  const { t } = useI18n();
  const isStory = visual === "story";
  const inputClass = isStory
    ? "w-full rounded-xl border border-[var(--story-border)] bg-white px-4 py-3 text-base text-[var(--story-text)] placeholder:text-[var(--story-text-muted)] focus:border-[var(--story-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(45,90,86,0.18)]"
    : "w-full rounded-[var(--st-r-md)] border border-[var(--st-line)] bg-[var(--st-surface-2)] px-4 py-3 text-base text-[var(--st-ink)] placeholder:text-[var(--st-muted-2)] focus:border-[var(--st-blue-soft)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--st-blue)]/20";
  const ghostBtnClass = isStory
    ? "flex w-full items-center justify-center rounded-xl border border-[var(--story-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--story-text)] transition-colors hover:border-[var(--story-accent)] disabled:cursor-not-allowed disabled:opacity-60"
    : "st-btn-ghost h-11 w-full border border-[var(--st-line)] text-sm disabled:cursor-not-allowed";
  const primaryBtnClass = isStory
    ? "flex w-full items-center justify-center rounded-xl border-none bg-[var(--story-cta)] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
    : "st-btn-primary h-11 w-full text-sm disabled:cursor-not-allowed";
  const mutedText = isStory ? "text-[var(--story-text-muted)]" : "text-[var(--st-muted)]";
  const mutedHover = isStory
    ? "text-[var(--story-text-muted)] hover:text-[var(--story-text)]"
    : "text-[var(--st-muted)] hover:text-[var(--st-ink-soft)]";
  const accentLink = isStory
    ? "font-medium text-[var(--story-accent)] hover:text-[#234845]"
    : "text-[var(--st-muted)] hover:text-[var(--st-ink-soft)]";
  const [open, setOpen] = useState(startOpen);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const {
    enabled: captchaEnabled,
    captchaRef,
    setCaptchaToken,
    resetCaptcha,
    resolveCaptchaToken,
    captchaReady,
  } = useAuthCaptcha();

  if (sentEmail) {
    return (
      <div className="space-y-3">
        <div
          className={
            isStory
              ? "rounded-xl border border-[var(--story-border)] bg-white/80 px-4 py-3 text-sm leading-relaxed text-[var(--story-text)]"
              : "rounded-xl border border-[var(--st-green-haze)] bg-[var(--st-green-haze)] px-4 py-3 text-sm leading-relaxed text-[var(--st-green-deep)]"
          }
        >
          <p className="font-medium">{t("login.magicLinkSentTitle")}</p>
          <p className="mt-1">{t("login.magicLinkSentBody", { email: sentEmail })}</p>
          <p className={`mt-2 text-[13px] ${mutedText}`}>{t("login.magicLinkSentTip")}</p>
        </div>
        <label htmlFor="v2-login-otp" className={`block text-sm ${mutedText}`}>
          {t("login.otpLabel")}
        </label>
        <input
          id="v2-login-otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
          className={inputClass}
          placeholder={t("login.otpPlaceholder")}
        />
        <button
          type="button"
          disabled={disabled || busy || otp.length < 6}
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                const supabase = createClient();
                if (!supabase) {
                  onError?.(t("login.noServer"));
                  return;
                }
                const user = await verifyLoginEmailOtp(supabase, sentEmail, otp);
                onVerified?.(user);
              } catch (err) {
                const raw = err instanceof Error ? err.message : t("login.otpInvalid");
                onError?.(mapMagicLinkLoginError(mapAuthCaptchaError(raw, t), t));
              } finally {
                setBusy(false);
              }
            })();
          }}
          className={primaryBtnClass}
        >
          {busy ? t("login.busy") : t("login.otpCta")}
        </button>
        <p className={`text-center text-[12px] leading-relaxed ${mutedText}`}>
          {t("login.magicLinkLinkBackup")}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setSentEmail("");
            setOtp("");
            setEmail(sentEmail);
          }}
          className={`w-full text-sm ${mutedHover}`}
        >
          {t("login.otpResend")}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`w-full text-sm transition-colors disabled:cursor-not-allowed ${accentLink}`}
      >
        {t("login.magicLinkToggle")}
      </button>
    );
  }

  const handleSend = async () => {
    const trimmed = normalizeSignupEmail(email);
    if (!trimmed || !isSignupEmailFormatValid(email)) {
      onError?.(t("login.emailRequired"));
      return;
    }
    const captchaToken = resolveCaptchaToken();
    if (captchaEnabled && !captchaToken) {
      onError?.(t("login.errCaptcha"));
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        onError?.(t("login.noServer"));
        return;
      }
      await sendLoginMagicLink(supabase, trimmed, nextPath, captchaToken);
      setSentEmail(trimmed);
      resetCaptcha();
    } catch (err) {
      const raw = err instanceof Error ? err.message : t("login.sendFailed");
      onError?.(mapMagicLinkLoginError(mapAuthCaptchaError(raw, t), t));
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className={`text-sm leading-relaxed ${mutedText}`}>{t("login.magicLinkHelp")}</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
        placeholder={t("login.emailPh")}
        autoComplete="email"
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
        disabled={disabled || busy || !captchaReady}
        onClick={() => void handleSend()}
        className={ghostBtnClass}
      >
        {busy ? t("login.busy") : t("login.magicLinkCta")}
      </button>
      {!startOpen ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setEmail("");
          }}
          className={`w-full text-sm ${mutedHover}`}
        >
          {t("login.backSignIn")}
        </button>
      ) : null}
    </div>
  );
}
