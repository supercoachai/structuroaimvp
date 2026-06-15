"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markPasswordSetupCompleted } from "@/lib/auth/passwordSetupProfile";
import { useI18n } from "@/lib/i18n";

const MIN_PASSWORD_LENGTH = 8;

export default function WachtwoordAanmakenPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
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
      if (upErr) {
        setError(upErr.message || t("passwordCreatePostOnboarding.errSave"));
        return;
      }

      const { error: profileErr } = await markPasswordSetupCompleted(
        supabase,
        user.id
      );
      if (profileErr) {
        setError(profileErr.message || t("passwordCreatePostOnboarding.errSave"));
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
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center bg-[var(--st-bg)] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          {t("passwordCreatePostOnboarding.title")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("passwordCreatePostOnboarding.subtitle")}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="create-password"
              className="block text-sm font-medium text-slate-700"
            >
              {t("passwordCreatePostOnboarding.labelNew")}
            </label>
            <input
              id="create-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </div>
          <div>
            <label
              htmlFor="create-password-confirm"
              className="block text-sm font-medium text-slate-700"
            >
              {t("passwordCreatePostOnboarding.labelConfirm")}
            </label>
            <input
              id="create-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </div>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy
              ? t("passwordCreatePostOnboarding.saving")
              : t("passwordCreatePostOnboarding.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
