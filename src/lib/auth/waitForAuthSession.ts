import type { SupabaseClient } from "@supabase/supabase-js";

import {
  clearAuthHashFromUrl,
  parseAuthHashFragment,
} from "@/lib/auth/recoveryHash";

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

/**
 * Implicit recovery: Supabase hangt access_token + refresh_token in de hash.
 * detectSessionInUrl is async; expliciet setSession voorkomt "geen geldige sessie".
 */
export async function establishSessionFromAuthHash(
  supabase: SupabaseClient
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  if (!hash || hash === "#") return false;

  const parsed = parseAuthHashFragment(hash);
  if (parsed.hasAuthError || !parsed.hasAuthTokens) return false;

  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return false;

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) return false;

  clearAuthHashFromUrl();
  return true;
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
