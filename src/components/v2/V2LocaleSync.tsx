"use client";

import { useEffect } from "react";

import { useI18n } from "@/lib/i18n";
import { resolveInitialLocale } from "@/lib/i18n/clientLocale";

import { patchV2Settings } from "./v2Settings";

/**
 * Eenmalig: sync v2_settings.locale met opgeloste app-locale
 * (browser-detect / storage / URL), zodat settings later niet terugzet naar NL-default.
 */
export default function V2LocaleSync() {
  const { setLocale } = useI18n();

  useEffect(() => {
    const resolved = resolveInitialLocale();
    setLocale(resolved);
    patchV2Settings({ locale: resolved });
  }, [setLocale]);

  return null;
}
