"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

type RegistrerenShellProps = {
  children: ReactNode;
  error?: string | null;
  info?: string | null;
};

export function RegistrerenShell({ children, error, info }: RegistrerenShellProps) {
  const { t, locale, setLocale } = useI18n();
  const [logoError, setLogoError] = useState(false);

  function handleBack() {
    window.location.href = "https://www.structuro.eu";
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-x-hidden bg-[var(--st-bg)] px-4 py-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset-bottom,0px)))]">
      <button
        type="button"
        onClick={handleBack}
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 text-sm text-slate-500 transition hover:text-slate-800 sm:left-6"
      >
        ← {t("registrerenPage.backLink")}
      </button>

      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 sm:right-6">
        <div
          className="flex shrink-0 gap-1 rounded-lg border border-slate-200/80 bg-white/90 p-0.5 text-xs font-semibold shadow-sm backdrop-blur-sm"
          role="group"
          aria-label={t("settings.languageTitle")}
        >
          <button
            type="button"
            onClick={() => setLocale("nl")}
            className={`rounded-md px-2 py-1 ${locale === "nl" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            NL
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`rounded-md px-2 py-1 ${locale === "en" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[780px] space-y-6">
        <div className="flex flex-col items-center text-center">
          {logoError ? (
            <div className="flex h-[4.55rem] w-[4.55rem] items-center justify-center rounded-2xl bg-blue-600 shadow-md">
              <span className="text-2xl font-bold text-white">S</span>
            </div>
          ) : (
            <img
              src="/logo-structuro.png"
              alt="Structuro"
              width={73}
              height={73}
              className="h-[4.55rem] w-[4.55rem] object-contain drop-shadow-sm"
              onError={() => setLogoError(true)}
            />
          )}
        </div>

        {info ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
            {info}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {children}
      </div>
    </div>
  );
}
