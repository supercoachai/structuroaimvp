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
import { AuthMessagePanel } from "@/components/auth/AuthMessagePanel";
import { LoginShell } from "@/components/login/LoginShell";
import { useI18n } from "@/lib/i18n";
import StructuroLogoLoading from "@/components/structuro/StructuroLogoLoading";
import { v2Styles } from "@/components/v2/theme";

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
    return <StructuroLogoLoading />;
  }

  if (!hasSession) {
    return (
      <AuthMessagePanel
        title={t("passwordSetup.noSessionTitle")}
        body={t("passwordSetup.noSessionBody")}
        primaryHref="/login?herstel=1"
        primaryLabel={t("passwordSetup.ctaReset")}
        secondaryHref="/login"
        secondaryLabel={t("passwordSetup.ctaLogin")}
      />
    );
  }

  return (
    <LoginShell error={error}>
      <div className="v2-login-gate v2-fade">
        <div className="v2-login-gate__copy">
          <h1 className="v2-login-gate__title">{t("passwordSetup.title")}</h1>
          <p className="v2-login-gate__sub">{t("passwordSetup.subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="v2-login-gate__actions">
          <label htmlFor="np" style={v2Styles.srOnly}>
            {t("passwordSetup.labelNew")}
          </label>
          <input
            id="np"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="v2-field"
            placeholder={t("passwordSetup.labelNew")}
            minLength={6}
            required
          />
          <label htmlFor="npc" style={v2Styles.srOnly}>
            {t("passwordSetup.labelConfirm")}
          </label>
          <input
            id="npc"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="v2-field"
            placeholder={t("passwordSetup.labelConfirm")}
            minLength={6}
            required
          />
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? t("passwordSetup.saving") : t("passwordSetup.submit")}
          </button>
          <div className="v2-login-gate__alt-links">
            <Link href="/login" className="v2-login-gate__text-link">
              {t("passwordSetup.ctaLogin")}
            </Link>
          </div>
        </form>
      </div>
    </LoginShell>
  );
}
