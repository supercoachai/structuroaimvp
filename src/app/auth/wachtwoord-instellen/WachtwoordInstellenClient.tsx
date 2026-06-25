"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  clearAuthHashFromUrl,
  parseAuthHashFragment,
} from "@/lib/auth/recoveryHash";
import {
  establishSessionFromAuthHash,
  exchangeRecoveryCodeClientSide,
  waitForAuthSession,
} from "@/lib/auth/waitForAuthSession";
import {
  isSamePasswordError,
  markPasswordSetupCompletedReliably,
} from "@/lib/auth/passwordSetupProfile";
import { useI18n } from "@/lib/i18n";

type Props = {
  serverHasSession: boolean;
};

export default function WachtwoordInstellenClient({ serverHasSession }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(!serverHasSession);
  const [hasSession, setHasSession] = useState(serverHasSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (serverHasSession) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    const supabase = createClient();

    const settleWithSession = () => {
      if (cancelled) return;
      setHasSession(true);
      setChecking(false);
      clearAuthHashFromUrl();
    };

    void (async () => {
      if (await establishSessionFromAuthHash(supabase)) {
        if (!cancelled) settleWithSession();
        return;
      }

      const exchanged = await exchangeRecoveryCodeClientSide(supabase);
      if (cancelled) return;
      if (exchanged) {
        settleWithSession();
        return;
      }

      const hash =
        typeof window !== "undefined" ? window.location.hash : "";
      const parsed = parseAuthHashFragment(hash);
      const expectingRecovery =
        parsed.hasAuthTokens ||
        parsed.hasRecoveryTokens ||
        hash.includes("type=recovery");

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled || !session) return;
        if (
          event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED"
        ) {
          settleWithSession();
        }
      });
      unsubscribe = () => subscription.unsubscribe();

      const ok = await waitForAuthSession(supabase, {
        isCancelled: () => cancelled,
        onSession: settleWithSession,
        retryDelaysMs: expectingRecovery
          ? [0, 150, 400, 800, 1500, 2500]
          : [0, 100, 250, 500, 900, 1500, 2500, 3500],
      });
      if (!cancelled && !ok) {
        setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [serverHasSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("passwordSetup.errShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordSetup.errMismatch"));
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: upErr } = await supabase.auth.updateUser({
        password,
      });
      // same_password = het wachtwoord staat al precies zo. Behandel als succes.
      if (upErr && !isSamePasswordError(upErr)) {
        setError(upErr.message || t("passwordSetup.errSave"));
        return;
      }
      if (user?.id) {
        await markPasswordSetupCompletedReliably(supabase, user.id);
      }
      await supabase.auth.signOut();
      router.push("/login?wachtwoord=bijgewerkt");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("passwordSetup.errUnknown")
      );
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--st-bg)] text-slate-600">
        {t("passwordSetup.checking")}
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center bg-[var(--st-bg)] px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            {t("passwordSetup.noSessionTitle")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {t("passwordSetup.noSessionBody")}
          </p>
          <Link
            href="/login?herstel=1"
            className="mt-6 block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t("passwordSetup.ctaReset")}
          </Link>
          <Link
            href="/login"
            className="mt-3 block w-full text-center text-sm text-slate-600 underline"
          >
            {t("passwordSetup.ctaLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center bg-[var(--st-bg)] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          {t("passwordSetup.title")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("passwordSetup.subtitle")}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="np"
              className="block text-sm font-medium text-slate-700"
            >
              {t("passwordSetup.labelNew")}
            </label>
            <input
              id="np"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              minLength={6}
              required
            />
          </div>
          <div>
            <label
              htmlFor="npc"
              className="block text-sm font-medium text-slate-700"
            >
              {t("passwordSetup.labelConfirm")}
            </label>
            <input
              id="npc"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              minLength={6}
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
            {busy ? t("passwordSetup.saving") : t("passwordSetup.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
