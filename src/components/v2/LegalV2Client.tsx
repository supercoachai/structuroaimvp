"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useI18n } from "@/lib/i18n";

import { V2AppShell } from "./V2Chrome";
import { V2LocaleButtons } from "./V2SettingsUi";
import { patchV2Settings, readV2Settings } from "./v2Settings";

type Props = {
  titleKey: string;
  updatedKey: string;
  bodyKey: string;
};

const CHAPTER_HEADING = /^\d+\.\s+.+/;
const LABEL_LINE = /^@([^@]+)@\s*([\s\S]*)$/;
const LEGACY_BOLD = /^\*\*(.+?)\*\*\s*([\s\S]*)$/;

function renderLegalBlock(text: string, index: number) {
  if (CHAPTER_HEADING.test(text)) {
    return (
      <h2 key={index} className="v2-legal__chapter">
        {text}
      </h2>
    );
  }

  const labelMatch = text.match(LABEL_LINE) ?? text.match(LEGACY_BOLD);
  if (labelMatch) {
    const [, label, rest] = labelMatch;
    return (
      <p key={index} className="v2-legal__p">
        <span className="v2-legal__label">{label}: </span>
        {rest}
      </p>
    );
  }

  return (
    <p key={index} className="v2-legal__p">
      {text}
    </p>
  );
}

export default function LegalV2Client({ titleKey, updatedKey, bodyKey }: Props) {
  const { t, locale, setLocale } = useI18n();
  const paragraphs = t(bodyKey).split("\n\n").filter(Boolean);

  useEffect(() => {
    setLocale(readV2Settings().locale);
  }, [setLocale]);

  return (
    <V2AppShell>
      <div className="v2-legal mx-auto flex w-full max-w-[480px] flex-col gap-5 px-5 pb-8 pt-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="v2-serif v2-legal__title">{t(titleKey)}</h1>
            <p className="v2-legal__updated">{t(updatedKey)}</p>
          </div>
          <V2LocaleButtons
            locale={locale}
            onChange={(next) => {
              setLocale(next);
              patchV2Settings({ locale: next });
            }}
            labels={{
              nl: t("settings.languageNl"),
              en: t("settings.languageEn"),
            }}
          />
        </header>

        <article className="v2-card v2-legal__article" aria-label={t(titleKey)}>
          {paragraphs.map((p, i) => renderLegalBlock(p, i))}
        </article>

        <nav className="v2-legal__nav" aria-label="Navigatie">
          <Link href="/v2/settings" className="v2-link">
            {t("legal.backSettings")}
          </Link>
          <Link href="/v2/home" className="v2-link">
            {t("legal.backHome")}
          </Link>
        </nav>
      </div>
    </V2AppShell>
  );
}
