"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n";

type InfoPanelProps = {
  open: boolean;
  onClose: () => void;
  onDismissPermanent: () => void;
  title: string;
  explanation: string;
  source?: string;
};

function PanelBody({
  title,
  explanation,
  source,
  onClose,
  onDismissPermanent,
  dismissLabel,
  closeLabel,
}: {
  title: string;
  explanation: string;
  source?: string;
  onClose: () => void;
  onDismissPermanent: () => void;
  dismissLabel: string;
  closeLabel: string;
}) {
  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="pr-6 text-sm font-semibold text-[#0F1729]">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label={closeLabel}
        >
          ×
        </button>
      </div>
      <p className="text-sm leading-relaxed text-gray-600">{explanation}</p>
      {source ? (
        <p className="mt-3 text-xs italic leading-relaxed text-gray-400">{source}</p>
      ) : null}
      <button
        type="button"
        onClick={onDismissPermanent}
        className="mt-4 text-xs text-gray-400 underline underline-offset-2 transition-colors hover:text-gray-600"
      >
        {dismissLabel}
      </button>
    </>
  );
}

export default function InfoPanel({
  open,
  onClose,
  onDismissPermanent,
  title,
  explanation,
  source,
}: InfoPanelProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dialogRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const dismissLabel = t("info.dismissPermanent");
  const closeLabel = t("info.close");

  const bodyProps = {
    title,
    explanation,
    source,
    onClose,
    onDismissPermanent,
    dismissLabel,
    closeLabel,
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[219] bg-black/45 backdrop-blur-[1px]"
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed left-1/2 top-1/2 z-[220] max-h-[min(80dvh,28rem)] w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--st-line)] bg-white p-5 shadow-xl"
      >
        <PanelBody {...bodyProps} />
      </div>
    </>,
    document.body
  );
}
