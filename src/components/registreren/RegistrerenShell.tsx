"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

type RegistrerenShellProps = {
  children: ReactNode;
  error?: string | null;
  info?: string | null;
  /** Planpagina: vult viewport, compacter logo, geen page-scroll op shell */
  page?: "default" | "plan";
  /** Story Layer (structuro.eu funnel): cream, navy, Newsreader */
  visual?: "work" | "story";
};

export function RegistrerenShell({
  children,
  error,
  info,
  page = "default",
  visual = "work",
}: RegistrerenShellProps) {
  const isPlanPage = page === "plan";
  const isStory = visual === "story";
  const { t, locale, setLocale } = useI18n();
  const [logoError, setLogoError] = useState(false);

  function handleBack() {
    window.location.href = "https://www.structuro.eu";
  }

  const shellBg = isStory ? "bg-[var(--story-bg)]" : "bg-[var(--st-bg)]";
  const backClass = isStory
    ? "text-[var(--story-text-muted)] hover:text-[var(--story-text)]"
    : "text-slate-500 hover:text-slate-800";
  const langActive = isStory ? "bg-[var(--story-cta)] text-white" : "bg-blue-600 text-white";
  const langIdle = isStory
    ? "text-[var(--story-text-muted)] hover:bg-[rgba(45,90,86,0.08)]"
    : "text-slate-600 hover:bg-slate-100";
  const langBorder = isStory ? "border-[var(--story-border)]" : "border-slate-200/80";

  return (
    <div
      className={
        isPlanPage
          ? `relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden ${shellBg} px-3 pt-[max(2.5rem,env(safe-area-inset-top))] pb-0 sm:px-4`
          : `relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-hidden overflow-y-auto overscroll-y-contain ${shellBg} px-4 py-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset-bottom,0px)))] sm:px-6`
      }
    >
      <button
        type="button"
        onClick={handleBack}
        className={`absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 text-sm transition sm:left-6 ${backClass}`}
      >
        ← {t("registrerenPage.backLink")}
      </button>

      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 sm:right-6">
        <div
          className={`flex shrink-0 gap-1 rounded-lg border ${langBorder} bg-white/90 p-0.5 text-xs font-semibold shadow-sm backdrop-blur-sm`}
          role="group"
          aria-label={t("settings.languageTitle")}
        >
          <button
            type="button"
            onClick={() => setLocale("nl")}
            className={`rounded-md px-2 py-1 ${locale === "nl" ? langActive : langIdle}`}
          >
            NL
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`rounded-md px-2 py-1 ${locale === "en" ? langActive : langIdle}`}
          >
            EN
          </button>
        </div>
      </div>

      <div
        className={
          isPlanPage
            ? "mx-auto flex h-full min-h-0 w-full max-w-[980px] flex-col"
            : "mx-auto flex w-full max-w-[25.2rem] flex-col items-center space-y-5 text-center"
        }
      >
        <div
          className={`flex shrink-0 flex-col items-center text-center ${isPlanPage ? "mb-1" : ""}`}
        >
          {logoError ? (
            <div
              className={`flex items-center justify-center rounded-2xl shadow-md ${isPlanPage ? "h-11 w-11" : "h-[4.55rem] w-[4.55rem]"} ${isStory ? "bg-[var(--story-accent)]" : "bg-blue-600"}`}
            >
              <span
                className={`font-bold text-white ${isPlanPage ? "text-lg" : "text-2xl"}`}
              >
                S
              </span>
            </div>
          ) : (
            <img
              src="/logo-structuro.png"
              alt="Structuro"
              width={isPlanPage ? 44 : 73}
              height={isPlanPage ? 44 : 73}
              className={`object-contain drop-shadow-sm ${isPlanPage ? "h-11 w-11" : "h-[4.55rem] w-[4.55rem]"}`}
              onError={() => setLogoError(true)}
            />
          )}
        </div>

        {info ? (
          <p
            className={`shrink-0 rounded-xl border border-amber-200 bg-amber-50 text-center text-amber-950 ${isPlanPage ? "mb-2 px-3 py-2 text-xs leading-snug" : "px-4 py-3 text-sm"}`}
          >
            {info}
          </p>
        ) : null}

        {error ? (
          <p
            className={`shrink-0 rounded-xl border border-red-200 bg-red-50 text-center text-red-800 ${isPlanPage ? "mb-2 px-3 py-2 text-xs leading-snug" : "px-4 py-3 text-sm"}`}
          >
            {error}
          </p>
        ) : null}

        {children}
      </div>
    </div>
  );
}
