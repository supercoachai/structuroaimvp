"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { parseAuthHashFragment } from "@/lib/auth/recoveryHash";

function isPkceVerifierError(
  errorCode: string | null,
  errorDescription: string | null
): boolean {
  if (errorCode === "pkce_code_verifier_not_found") return true;
  const desc = (errorDescription ?? "").toLowerCase();
  return (
    desc.includes("pkce") ||
    desc.includes("code verifier") ||
    desc.includes("code_verifier")
  );
}

function AuthCodeErrorContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [hashChecked, setHashChecked] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    const parsed = parseAuthHashFragment(window.location.hash);
    if (parsed.hasRecoveryTokens) {
      setRecovering(true);
    }
    setHashChecked(true);
  }, []);

  const hashParams = useMemo(
    () =>
      typeof window !== "undefined"
        ? parseAuthHashFragment(window.location.hash)
        : parseAuthHashFragment(""),
    [hashChecked]
  );

  const errorCode =
    hashParams.errorCode ??
    searchParams?.get("error_code") ??
    searchParams?.get("error") ??
    null;
  const errorDescription =
    hashParams.errorDescription ??
    searchParams?.get("error_description") ??
    null;

  const isPkce = isPkceVerifierError(errorCode, errorDescription);

  const { title, body, primaryHref, primaryLabel, secondaryHref, secondaryLabel } =
    useMemo(() => {
      if (errorCode === "otp_expired") {
        return {
          title: t("authError.otpTitle"),
          body: t("authError.otpBody"),
          primaryHref: "/login?herstel=1",
          primaryLabel: t("authError.ctaReset"),
          secondaryHref: "/login",
          secondaryLabel: t("authError.ctaLogin"),
        };
      }
      if (isPkce) {
        return {
          title: t("authError.pkceTitle"),
          body: t("authError.pkceBody"),
          primaryHref: "/login",
          primaryLabel: t("authError.ctaMagic"),
          secondaryHref: "/login?herstel=1",
          secondaryLabel: t("authError.ctaReset"),
        };
      }
      if (errorCode === "exchange_failed") {
        return {
          title: t("authError.exchangeTitle"),
          // Nooit ruwe Supabase/PKCE-tekst tonen aan gebruikers.
          body: t("authError.exchangeBody"),
          primaryHref: "/login?herstel=1",
          primaryLabel: t("authError.ctaReset"),
          secondaryHref: "/login",
          secondaryLabel: t("authError.ctaLogin"),
        };
      }
      if (errorCode === "missing_code") {
        return {
          title: t("authError.missingTitle"),
          body: t("authError.missingBody"),
          primaryHref: "/login?herstel=1",
          primaryLabel: t("authError.ctaReset"),
          secondaryHref: "/login",
          secondaryLabel: t("authError.ctaLogin"),
        };
      }
      return {
        title: t("authError.genericTitle"),
        body: t("authError.genericBody"),
        primaryHref: "/login",
        primaryLabel: t("authError.ctaLogin"),
        secondaryHref: "/login?herstel=1",
        secondaryLabel: t("authError.ctaReset"),
      };
    }, [errorCode, isPkce, t]);

  if (!hashChecked || recovering) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--st-bg)] text-slate-600">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center bg-[var(--st-bg)] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={primaryHref}
            className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="block w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--st-bg)] text-slate-600">
          …
        </div>
      }
    >
      <AuthCodeErrorContent />
    </Suspense>
  );
}
