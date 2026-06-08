"use client";

import { useEffect } from "react";
import { getErrorUiCopy } from "@/lib/i18n/clientLocale";
import { isRecoverableChunkError } from "@/lib/normalizeError";

const CHUNK_RELOAD_KEY = "structuro_chunk_reload_at";
const CHUNK_RELOAD_COOLDOWN_MS = 12_000;

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isRecoverableChunkError(error)) return;
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    const now = Date.now();
    if (now - last <= CHUNK_RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    window.location.reload();
  }, [error]);

  const copy = getErrorUiCopy();

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[var(--structuro-bg)] px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">{copy.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy.body}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {copy.refreshLabel}
        </button>
      </div>
    </div>
  );
}
