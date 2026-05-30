"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n";

/** Moet gelijk lopen met `--info-popover-motion-ms` in globals.css */
const INFO_POPOVER_EXIT_MS = 520;

type PopoverPlacement = "below" | "above";

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
  placement: PopoverPlacement;
  tailLeft: number;
};

type InfoPanelProps = {
  open: boolean;
  onClose: () => void;
  onDismissPermanent: () => void;
  title: string;
  explanation: string;
  source?: string;
  anchorRef: RefObject<HTMLElement | null>;
  variant?: "default" | "onDark";
};

function computePopoverPosition(anchor: DOMRect): PopoverPosition {
  const margin = 12;
  const gap = 8;
  const width = Math.min(288, window.innerWidth - margin * 2);
  const estimatedHeight = 220;

  let placement: PopoverPlacement = "below";
  let top = anchor.bottom + gap;

  if (top + estimatedHeight > window.innerHeight - margin) {
    placement = "above";
    top = anchor.top - gap;
  }

  let left = anchor.right - width;
  left = Math.max(margin, Math.min(left, window.innerWidth - margin - width));

  const tailLeft = Math.min(
    width - 18,
    Math.max(18, anchor.left + anchor.width / 2 - left)
  );

  return { top, left, width, placement, tailLeft };
}

function PanelBody({
  title,
  explanation,
  source,
  onClose,
  onDismissPermanent,
  dismissLabel,
  closeLabel,
  variant,
}: {
  title: string;
  explanation: string;
  source?: string;
  onClose: () => void;
  onDismissPermanent: () => void;
  dismissLabel: string;
  closeLabel: string;
  variant: "default" | "onDark";
}) {
  const isDark = variant === "onDark";

  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2
          className={`pr-4 text-xs font-semibold leading-snug ${
            isDark ? "text-white" : "text-[var(--st-ink)]"
          }`}
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className={`-mr-0.5 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base leading-none transition-colors ${
            isDark
              ? "text-white/45 hover:bg-white/10 hover:text-white/80"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
          aria-label={closeLabel}
        >
          ×
        </button>
      </div>
      <p
        className={`text-[13px] leading-relaxed ${
          isDark ? "text-[#CBD5E1]" : "text-[var(--st-ink-soft)]"
        }`}
      >
        {explanation}
      </p>
      {source ? (
        <p
          className={`mt-2.5 text-[11px] italic leading-relaxed ${
            isDark ? "text-[#64748B]" : "text-[var(--st-muted)]"
          }`}
        >
          {source}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onDismissPermanent}
        className={`mt-3 text-[11px] underline underline-offset-2 transition-colors ${
          isDark
            ? "text-[#64748B] hover:text-[#94A3B8]"
            : "text-[var(--st-muted)] hover:text-[var(--st-ink-soft)]"
        }`}
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
  anchorRef,
  variant = "default",
}: InfoPanelProps) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const [present, setPresent] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    setPosition(computePopoverPosition(anchor.getBoundingClientRect()));
  }, [anchorRef]);

  useEffect(() => {
    if (open) {
      setPresent(true);
      setExiting(false);
      updatePosition();
      return;
    }
    if (!present) return;
    setExiting(true);
    const timer = window.setTimeout(() => {
      setPresent(false);
      setExiting(false);
      setPosition(null);
    }, INFO_POPOVER_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, present, updatePosition]);

  useEffect(() => {
    if (!present) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [present, updatePosition]);

  useEffect(() => {
    if (!present || exiting) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [present, exiting, onClose, anchorRef]);

  useEffect(() => {
    if (!present) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, onClose]);

  if (!present || !position || typeof document === "undefined") return null;

  const dismissLabel = t("info.dismissPermanent");
  const closeLabel = t("info.close");
  const isDark = variant === "onDark";

  const style: CSSProperties = {
    top: position.top,
    left: position.left,
    width: position.width,
    ["--info-popover-tail-x" as string]: `${position.tailLeft}px`,
  };

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      style={style}
      className={`info-popover-host info-popover-host--${position.placement} ${
        isDark ? "info-popover-host--dark" : ""
      }${exiting ? " is-exiting" : ""}`}
    >
      <div className="info-popover">
        <PanelBody
          title={title}
          explanation={explanation}
          source={source}
          onClose={onClose}
          onDismissPermanent={onDismissPermanent}
          dismissLabel={dismissLabel}
          closeLabel={closeLabel}
          variant={variant}
        />
      </div>
    </div>,
    document.body
  );
}
