"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getInfoContent, type InfoContentId } from "@/lib/infoContent";
import { hasInfoSeenLocally, markInfoSeenLocally } from "@/lib/infoSeenLocal";
import { useInfoDismissals } from "@/contexts/InfoDismissalsContext";
import { useI18n } from "@/lib/i18n";
import InfoPanel from "./InfoPanel";

type InfoButtonProps = {
  infoId: InfoContentId;
  variant?: "default" | "onDark";
  className?: string;
  /** Eerste bezoek: uitleg automatisch openen. Zet uit als er al een andere auto-intro op het scherm staat. */
  autoIntro?: boolean;
};

const INTRO_PULSE_MS = 3000;

export default function InfoButton({
  infoId,
  variant = "default",
  className = "",
  autoIntro = true,
}: InfoButtonProps) {
  const { locale, t } = useI18n();
  const { ready, isDismissed, dismiss } = useInfoDismissals();
  const [open, setOpen] = useState(false);
  const [introPulse, setIntroPulse] = useState(false);
  const introStartedRef = useRef(false);

  const content = getInfoContent(infoId, locale);
  const hidden = ready && isDismissed(infoId);

  const finishIntro = useCallback(() => {
    setIntroPulse(false);
    markInfoSeenLocally(infoId);
  }, [infoId]);

  const handleClose = useCallback(() => {
    setOpen(false);
    finishIntro();
  }, [finishIntro]);

  useEffect(() => {
    if (!ready || hidden || introStartedRef.current) return;
    if (hasInfoSeenLocally(infoId)) return;

    introStartedRef.current = true;
    setIntroPulse(true);
    if (autoIntro) setOpen(true);

    const timer = window.setTimeout(finishIntro, INTRO_PULSE_MS);
    return () => window.clearTimeout(timer);
  }, [ready, hidden, infoId, finishIntro, autoIntro]);

  if (hidden) return null;

  const buttonClass =
    variant === "onDark"
      ? "border-white/30 text-white/50 hover:border-blue-300 hover:text-blue-300"
      : "border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500";

  const pulseClass =
    variant === "onDark"
      ? "structuro-info-intro-pulse structuro-info-intro-pulse--dark"
      : "structuro-info-intro-pulse";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-transparent text-xs font-semibold leading-none transition-colors ${buttonClass} ${
          introPulse ? pulseClass : ""
        } ${className}`.trim()}
        aria-label={t("info.openAria", { title: content.title })}
        aria-expanded={open}
      >
        i
      </button>
      <InfoPanel
        open={open}
        onClose={handleClose}
        onDismissPermanent={() => {
          void dismiss(infoId);
          finishIntro();
          setOpen(false);
        }}
        title={content.title}
        explanation={content.explanation}
        source={content.source}
      />
    </>
  );
}
