"use client";

import { useCallback, useEffect, useState } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { useI18n } from "@/lib/i18n";
import { captureProductEvent } from "@/lib/posthog/track";
import { createClient } from "@/lib/supabase/client";

import V2InfoSheet, { type V2InfoSheetRow } from "./V2InfoSheet";
import {
  markV2ShellWelcomeSeen,
  shouldShowV2ShellWelcome,
} from "./v2ShellWelcome";

/**
 * Eenmalige update-sheet op / voor elke ingelogde klant (één keer per release).
 */
export default function V2ShellWelcomeSheet() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const supabase = createClient();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user?.id) return;

      if (!shouldShowV2ShellWelcome({ userId: user.id })) {
        return;
      }

      setUserId(user.id);
      setOpen(true);
      captureProductEvent(ANALYTICS_EVENTS.v2_shell_welcome_shown, {
        surface: "v2_home",
      });
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const onClose = useCallback(() => {
    if (userId) {
      markV2ShellWelcomeSeen(userId);
      captureProductEvent(ANALYTICS_EVENTS.v2_shell_welcome_dismissed, {
        surface: "v2_home",
      });
    }
    setOpen(false);
  }, [userId]);

  const rows: V2InfoSheetRow[] = [
    {
      key: "calm",
      icon: "pause",
      title: t("v2.shellWelcomeCalmTitle"),
      body: t("v2.shellWelcomeCalmBody"),
    },
    {
      key: "kept",
      icon: "private",
      title: t("v2.shellWelcomeKeptTitle"),
      body: t("v2.shellWelcomeKeptBody"),
    },
    {
      key: "same",
      icon: "meaning",
      title: t("v2.shellWelcomeSameTitle"),
      body: t("v2.shellWelcomeSameBody"),
    },
  ];

  return (
    <V2InfoSheet
      open={open}
      onClose={onClose}
      eyebrow={t("v2.shellWelcomeEyebrow")}
      title={t("v2.shellWelcomeTitle")}
      rows={rows}
      gotItLabel={t("v2.shellWelcomeCta")}
      closeAria={t("v2.shellWelcomeCloseAria")}
      panelId="v2-shell-welcome-sheet"
    />
  );
}
