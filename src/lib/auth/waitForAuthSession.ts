import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_RETRY_DELAYS_MS = [0, 100, 250, 500, 900, 1500, 2500];

type WaitForAuthSessionOptions = {
  retryDelaysMs?: number[];
  onSession?: () => void;
  isCancelled?: () => boolean;
};

/**
 * Wacht op een Supabase-sessie (PKCE cookies na callback, of hash recovery tokens).
 */
export async function waitForAuthSession(
  supabase: SupabaseClient,
  options: WaitForAuthSessionOptions = {}
): Promise<boolean> {
  const delays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;

  for (let index = 0; index < delays.length; index += 1) {
    if (options.isCancelled?.()) return false;
    const delayMs = delays[index] ?? 0;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    if (options.isCancelled?.()) return false;

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      options.onSession?.();
      return true;
    }
  }

  return false;
}

/** Ruim ?code= en ?type=recovery uit de URL op na client-side PKCE exchange. */
export function clearAuthQueryFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    url.searchParams.delete("type");
    const search = url.searchParams.toString();
    window.history.replaceState(
      null,
      "",
      url.pathname + (search ? `?${search}` : "")
    );
  } catch {
    /* ignore */
  }
}

/**
 * PKCE recovery: wissel ?code= client-side in (zelfde browser-tab als de mail-link).
 */
export async function exchangeRecoveryCodeClientSide(
  supabase: SupabaseClient
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return false;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  clearAuthQueryFromUrl();
  return !error;
}
