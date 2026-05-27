"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@/lib/i18n";

export type CycleAboutModalProps = {
  open: boolean;
  onClose: () => void;
  onYes: () => void;
  onNo: () => void;
};

export default function CycleAboutModal({
  open,
  onClose,
  onYes,
  onNo,
}: CycleAboutModalProps) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("cycle.aboutTitle")}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/35 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white text-left shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {t("cycle.aboutTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label={t("common.close")}
          >
            <XMarkIcon className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-slate-700">
          <p>{t("cycle.aboutLine1")}</p>
          <p>{t("cycle.aboutLine2")}</p>
          <p>{t("cycle.aboutLine3")}</p>
          <Link
            href="/privacy"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            {t("cycle.aboutPrivacyLink")}
          </Link>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onYes();
            }}
            className="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-500 active:scale-[0.99]"
          >
            {t("cycle.optInYes")}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onNo();
            }}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t("cycle.optInNo")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
