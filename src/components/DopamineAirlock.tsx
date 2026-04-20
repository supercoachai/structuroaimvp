"use client";

import { useEffect, useState } from "react";

export interface DopamineAirlockProps {
  isActive: boolean;
  onAirlockComplete: () => void;
  message?: string;
  durationMs?: number;
}

/**
 * Korte rust na taakafronding: alleen rustige copy, geen extra UI-druk.
 */
export function DopamineAirlock({
  isActive,
  onAirlockComplete,
  message = "Klaar.",
  durationMs = 2000,
}: DopamineAirlockProps) {
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setShowMessage(false);
      return;
    }
    const messageTimer = window.setTimeout(() => setShowMessage(true), 400);
    const airlockTimer = window.setTimeout(() => {
      onAirlockComplete();
    }, durationMs);
    return () => {
      window.clearTimeout(messageTimer);
      window.clearTimeout(airlockTimer);
    };
  }, [isActive, durationMs, onAirlockComplete]);

  if (!isActive) return null;

  return (
    <div
      className={`fixed inset-0 z-[10001] flex items-center justify-center bg-white/95 backdrop-blur-sm transition-opacity duration-300 ${
        showMessage ? "opacity-100" : "opacity-0"
      }`}
      aria-live="polite"
      role="status"
    >
      <p
        className={`text-base font-medium text-slate-600 transition-opacity duration-300 ${
          showMessage ? "opacity-100" : "opacity-0"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
