"use client";

import { useEffect } from "react";
import { isRecoverableChunkError } from "@/lib/normalizeError";

const CHUNK_RELOAD_KEY = "structuro_chunk_reload_at";
const CHUNK_RELOAD_COOLDOWN_MS = 12_000;

function tryRecoverFromChunkError(reason: unknown): boolean {
  if (!isRecoverableChunkError(reason)) return false;
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  const now = Date.now();
  if (now - last <= CHUNK_RELOAD_COOLDOWN_MS) return false;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  window.location.reload();
  return true;
}

/**
 * Vangt webpack/HMR chunk-fouten en obscure Event-rejections af
 * (Next toont die anders als "[object Event]").
 */
export function ClientRuntimeGuards() {
  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;

      if (tryRecoverFromChunkError(reason)) {
        event.preventDefault();
        return;
      }

      if (reason instanceof Event) {
        event.preventDefault();
        console.warn("Structuro: script-load rejection onderdrukt", reason);
      }
    };

    const onWindowError = (event: ErrorEvent) => {
      const scriptOrStyleFailed =
        event.target instanceof HTMLScriptElement ||
        event.target instanceof HTMLLinkElement;
      const reason = scriptOrStyleFailed ? event : (event.error ?? event.message);
      if (tryRecoverFromChunkError(reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onWindowError);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onWindowError);
    };
  }, []);

  return null;
}
