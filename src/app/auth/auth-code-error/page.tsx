"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";

function AuthCodeErrorContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const errorCode =
    searchParams?.get("error_code") ?? searchParams?.get("error") ?? null;
  const errorDescription = searchParams?.get("error_description") ?? null;

  const { title, body } = useMemo(() => {
    if (errorCode === "otp_expired") {
      return {
        title: t("authError.otpTitle"),
        body: t("authError.otpBody"),
      };
    }
    if (errorCode === "exchange_failed") {
      return {
        title: t("authError.exchangeTitle"),
        body: errorDescription || t("authError.exchangeBody"),
      };
    }
    if (errorCode === "missing_code") {
      return {
        title: t("authError.missingTitle"),
        body: t("authError.missingBody"),
      };
    }
    return {
      title: t("authError.genericTitle"),
      body: errorDescription || t("authError.genericBody"),
    };
  }, [errorCode, errorDescription, t]);

  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center bg-[var(--st-bg)] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
        {errorCode ? (
          <p className="mt-4 font-mono text-xs text-slate-400">
            Code: {errorCode}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/login?herstel=1"
            className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t("authError.ctaReset")}
          </Link>
          <Link
            href="/login"
            className="block w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("authError.ctaLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function AuthCodeErrorFallback() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--st-bg)] text-slate-600">
      {t("common.loading")}
    </div>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={<AuthCodeErrorFallback />}>
      <AuthCodeErrorContent />
    </Suspense>
  );
}
