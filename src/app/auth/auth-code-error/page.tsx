"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

function AuthCodeErrorContent() {
  const searchParams = useSearchParams();
  const errorCode =
    searchParams?.get("error_code") ?? searchParams?.get("error") ?? null;
  const errorDescription = searchParams?.get("error_description") ?? null;

  const { title, body } = useMemo(() => {
    if (errorCode === "otp_expired") {
      return {
        title: "Deze link is verlopen",
        body: "Wachtwoordlinks zijn maar kort geldig. Vraag hieronder een nieuwe aan en open de mail zo snel mogelijk.",
      };
    }
    if (errorCode === "exchange_failed") {
      return {
        title: "Inloggen via de link lukte niet",
        body:
          errorDescription ||
          "De code werd al gebruikt of is ongeldig. Vraag zo nodig een nieuwe herstellink aan.",
      };
    }
    if (errorCode === "missing_code") {
      return {
        title: "Ongeldige of incomplete link",
        body: "Open de link uit je mail opnieuw, of vraag een nieuw wachtwoord aan.",
      };
    }
    return {
      title: "Er ging iets mis met inloggen",
      body:
        errorDescription ||
        "Probeer opnieuw of vraag een nieuw wachtwoord aan via het inlogscherm.",
    };
  }, [errorCode, errorDescription]);

  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center bg-[#F4F6FB] px-4 py-8">
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
            Nieuw wachtwoord aanvragen
          </Link>
          <Link
            href="/login"
            className="block w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Terug naar inloggen
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
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#F4F6FB] text-slate-600">
          Laden…
        </div>
      }
    >
      <AuthCodeErrorContent />
    </Suspense>
  );
}
