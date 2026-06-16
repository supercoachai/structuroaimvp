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

export function redirectAuthCodeToCallback(pathname: string): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return false;

  const next = encodeURIComponent(pathname);
  window.location.replace(
    `/auth/callback?code=${encodeURIComponent(code)}&next=${next}`
  );
  return true;
}
