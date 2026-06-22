"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSamePasswordError } from "@/lib/auth/passwordSetupProfile";
import {
  getEnabledOAuthProviders,
  oauthProviderLabelKey,
  type OAuthProviderId,
} from "@/lib/auth/authProviders";
import {
  isProviderNotEnabledError,
  startOAuthSignIn,
} from "@/lib/auth/socialSignIn";
import { RegistrerenShell } from "@/components/registreren/RegistrerenShell";
import { useI18n } from "@/lib/i18n";

const MIN_PASSWORD_LENGTH = 8;

export default function WachtwoordAanmakenPage() {
  const { t } = useI18n();
  const router = useRouter();
  const providers = getEnabledOAuthProviders();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyOAuth, setBusyOAuth] = useState<OAuthProviderId | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(Boolean(data.session));
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleOAuth = async (provider: OAuthProviderId) => {
    if (busy || busyOAuth) return;
    setError(null);
    setBusyOAuth(provider);
    try {
      const supabase = createClient();
      // Reeds ingelogde gebruiker koppelt zo Google als inlogmethode. De
      // OAuth-callback markeert daarna password_setup_completed, dus de
      // middleware stuurt ze niet terug naar dit scherm.
      await startOAuthSignIn(supabase, provider, "/");
    } catch (err) {
      setError(
        isProviderNotEnabledError(err)
          ? t("oauth.noneEnabled")
          : err instanceof Error
            ? err.message
            : t("passwordCreatePostOnboarding.errUnknown")
      );
      setBusyOAuth(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("passwordCreatePostOnboarding.errShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordCreatePostOnboarding.errMismatch"));
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        setError(t("passwordCreatePostOnboarding.errNoSession"));
        return;
      }

      const { error: upErr } = await supabase.auth.updateUser({ password });
      // same_password = het wachtwoord staat al precies zo. Behandel als succes
      // en ga door, anders blijft de gebruiker hangen op dit scherm.
      if (upErr && !isSamePasswordError(upErr)) {
        setError(upErr.message || t("passwordCreatePostOnboarding.errSave"));
        return;
      }

      // Vlag server-side zetten: betrouwbaar ondanks de token-rotatie die
      // updateUser({ password }) veroorzaakt.
      const res = await fetch("/api/auth/complete-password-setup", {
        method: "POST",
      });
      if (!res.ok) {
        setError(t("passwordCreatePostOnboarding.errSave"));
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("passwordCreatePostOnboarding.errUnknown")
      );
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--st-bg)] text-slate-600">
        {t("passwordCreatePostOnboarding.checking")}
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center bg-[var(--st-bg)] px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            {t("passwordCreatePostOnboarding.noSessionTitle")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {t("passwordCreatePostOnboarding.noSessionBody")}
          </p>
          <Link
            href="/login"
            className="mt-6 block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t("passwordCreatePostOnboarding.ctaLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <RegistrerenShell error={error} visual="story">
      <div className="mx-auto w-full text-center">
        <h2 className="st-story-serif text-lg font-semibold tracking-tight text-[var(--story-text)] sm:text-xl">
          {t("passwordCreatePostOnboarding.dagstartHeading")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--story-text-muted)]">
          {t("passwordCreatePostOnboarding.dagstartSubheading")}
        </p>
      </div>

      <div className="mx-auto w-full space-y-4">
        {providers.length > 0 ? (
          <div className="space-y-3">
            {providers.map((provider) => (
              <button
                key={provider}
                type="button"
                disabled={busy || busyOAuth !== null}
                onClick={() => void handleOAuth(provider)}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--story-border)] bg-white px-6 py-[15px] text-base font-semibold text-[var(--story-text)] shadow-sm transition-all duration-200 hover:border-[var(--story-accent)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyOAuth === provider
                  ? t("login.busy")
                  : t(oauthProviderLabelKey(provider))}
              </button>
            ))}
          </div>
        ) : null}

        {!emailOpen ? (
          <button
            type="button"
            disabled={busy || busyOAuth !== null}
            onClick={() => setEmailOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--story-border)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--story-text)] transition-colors hover:border-[var(--story-accent)] hover:text-[var(--story-accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("passwordCreatePostOnboarding.emailToggle")}
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="space-y-1">
              <label
                htmlFor="create-password"
                className="block text-sm text-[var(--story-text-muted)]"
              >
                {t("passwordCreatePostOnboarding.labelNew")}
              </label>
              <input
                id="create-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--story-border)] bg-white px-4 py-3 text-base text-[var(--story-text)] focus:border-[var(--story-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(45,90,86,0.18)]"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="create-password-confirm"
                className="block text-sm text-[var(--story-text-muted)]"
              >
                {t("passwordCreatePostOnboarding.labelConfirm")}
              </label>
              <input
                id="create-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-[var(--story-border)] bg-white px-4 py-3 text-base text-[var(--story-text)] focus:border-[var(--story-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(45,90,86,0.18)]"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy || busyOAuth !== null}
              className="flex w-full items-center justify-center rounded-xl border-none bg-[var(--story-cta)] px-6 py-[15px] text-base font-semibold text-white shadow-[0_8px_20px_rgba(26,26,27,0.22)] transition-all duration-200 hover:bg-[var(--story-cta-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? t("passwordCreatePostOnboarding.saving")
                : t("passwordCreatePostOnboarding.submit")}
            </button>
          </form>
        )}
      </div>
    </RegistrerenShell>
  );
}
