"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type Props = {
  titleKey: string;
  updatedKey: string;
  bodyKey: string;
};

export default function LegalStaticPage({ titleKey, updatedKey, bodyKey }: Props) {
  const { t, locale, setLocale } = useI18n();
  const paragraphs = t(bodyKey).split("\n\n").filter(Boolean);

  return (
    <>
      <div className="min-h-full bg-[var(--structuro-bg)] text-[var(--structuro-text)]">
        <main className="relative mx-auto w-full max-w-xl px-4 pb-28 pt-4">
          <div
            className="absolute right-4 top-4 flex gap-1 rounded-lg border border-slate-200/80 bg-white/90 p-0.5 text-xs font-semibold shadow-sm backdrop-blur-sm sm:right-6"
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

          <header className="mb-8 pr-24 text-left sm:pr-28">
            <h1 className="structuro-page-title">{t(titleKey)}</h1>
            <p className="structuro-page-subtitle mt-1 text-slate-500">{t(updatedKey)}</p>
          </header>

          <article className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-slate-700">
                {p}
              </p>
            ))}
          </article>

          <nav className="mt-8 flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
            <Link
              href="/settings"
              className="font-semibold text-blue-600 underline-offset-2 hover:underline"
            >
              {t("legal.backSettings")}
            </Link>
            <Link
              href="/login"
              className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              {t("legal.backLogin")}
            </Link>
          </nav>
        </main>
      </div>
    </>
  );
}
