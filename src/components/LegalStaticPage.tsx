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
    <div className="relative min-h-[100dvh] bg-[#F4F6FB] px-4 py-8 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex gap-1 rounded-lg border border-slate-200/80 bg-white/90 p-0.5 text-xs font-semibold shadow-sm backdrop-blur-sm"
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
      <article className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold text-slate-900">{t(titleKey)}</h1>
        <p className="mt-2 text-xs leading-snug text-slate-500">{t(updatedKey)}</p>
        <div className="mt-8 space-y-4">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-700">
              {p}
            </p>
          ))}
        </div>
        <p className="mt-10">
          <Link href="/login" className="text-sm font-semibold text-blue-600 underline-offset-2 hover:underline">
            {t("legal.backLogin")}
          </Link>
        </p>
      </article>
    </div>
  );
}
