import { isRecoverableChunkError } from "@/lib/normalizeError";

export const CHUNK_RELOAD_KEY = "structuro_chunk_reload_at";
export const CHUNK_RELOAD_COOLDOWN_MS = 12_000;

/** Eén automatische reload na deploy/chunk-fout; voorkomt reload-loops. */
export function tryRecoverableChunkReload(error: unknown): boolean {
  if (typeof window === "undefined") return false;
  if (!isRecoverableChunkError(error)) return false;

  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  const now = Date.now();
  if (now - last <= CHUNK_RELOAD_COOLDOWN_MS) return false;

  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  window.location.reload();
  return true;
}
