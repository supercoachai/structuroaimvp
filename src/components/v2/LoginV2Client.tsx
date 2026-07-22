"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthCaptcha } from "@/components/auth/AuthCaptcha";
import { useAuthCaptcha } from "@/hooks/useAuthCaptcha";
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

import { V2Page } from "./V2Chrome";
import { useV2 } from "./V2Context";
import { v2Styles } from "./theme";

const NEXT_AFTER_LOGIN = "/v2/home";

const CAPTCHA_ERR = "Bevestig dat je geen robot bent en probeer het opnieuw.";

function tCaptcha(key: string): string {
  return key === "login.errCaptcha" ? CAPTCHA_ERR : key;
}

export default function LoginV2Client() {
  const router = useRouter();
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

  /** Migreer lokale v2-data naar het account; wis pas daarna. */
  const claimLocalThenContinue = async (userId: string): Promise<string> => {
    if (hasV2LocalDataToMigrate()) {
      try {
        const result = await migrateV2LocalDataToSupabase(userId);
        if (result.migrated) {
          resetAllLocalData();
          return "/";
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
        setError("Inloggen is even niet beschikbaar. Probeer het later opnieuw.");
        setBusy(false);
        return;
      }
      // Niet wissen vóór OAuth-return: V2ClaimOnAuth migreert na terugkomst.
      setLastAuthMethod("google");
      await startOAuthSignIn(supabase, "google", NEXT_AFTER_LOGIN);
    } catch (err) {
      setError(
        isProviderNotEnabledError(err)
          ? "Inloggen met Google is nog niet geconfigureerd."
          : err instanceof Error
            ? err.message
            : "Er ging iets mis. Probeer het opnieuw."
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
      setError(CAPTCHA_ERR);
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Inloggen is even niet beschikbaar. Probeer het later opnieuw.");
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
        if (next === "/") {
          window.location.assign("/");
          return;
        }
        router.push(next);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      if (
        raw.includes("Invalid login credentials") ||
        raw.includes("Invalid credentials")
      ) {
        setError("E-mail of wachtwoord klopt niet.");
      } else {
        setError(mapAuthCaptchaError(raw || "Er ging iets mis. Probeer het opnieuw.", tCaptcha));
      }
      resetCaptcha();
      setBusy(false);
    }
  };

  return (
    <V2Page>
      <div className="v2-auth-gate v2-fade" aria-live="polite">
        <p className="v2-auth-gate__brand">Structuro</p>

        <div className="v2-auth-gate__body">
          <h1 className="v2-auth-gate__title">Welkom terug.</h1>

          <div className="v2-auth-gate__actions">
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => void continueWithGoogle()}
              disabled={busy}
            >
              {busy && !emailOpen ? "Even geduld…" : "Doorgaan met Google"}
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
                Liever e-mail
              </button>
            ) : (
              <form className="v2-auth-gate__email" onSubmit={(e) => void signInWithEmail(e)}>
                <label htmlFor="v2-login-email" style={v2Styles.srOnly}>
                  E-mail
                </label>
                <input
                  id="v2-login-email"
                  type="email"
                  inputMode="email"
                  className="v2-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail"
                  autoComplete="email"
                  required
                />
                <label htmlFor="v2-login-password" style={v2Styles.srOnly}>
                  Wachtwoord
                </label>
                <input
                  id="v2-login-password"
                  type="password"
                  className="v2-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Wachtwoord"
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
                  {busy ? "Even geduld…" : "Inloggen"}
                </button>
              </form>
            )}

            {error ? (
              <p className="v2-auth-gate__error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <p className="v2-auth-gate__footer">
          <Link href="/v2/onboarding" className="v2-link">
            Nog geen account? Begin hier.
          </Link>
        </p>
      </div>
    </V2Page>
  );
}
