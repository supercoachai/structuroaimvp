import type { Provider, SupabaseClient } from "@supabase/supabase-js";

import { buildAuthCallbackUrl } from "@/lib/auth/buildAuthCallbackUrl";
import { normalizeSignupEmail } from "@/lib/auth/signupEmail";
import type { OAuthProviderId } from "@/lib/auth/authProviders";

/** Supabase gebruikt `azure` voor Microsoft (Outlook, Hotmail, live.nl). */
export function toSupabaseOAuthProvider(provider: OAuthProviderId): Provider {
  return provider as Provider;
}

/**
 * Herkent de Supabase-fout wanneer een OAuth-provider niet is ingeschakeld
 * ("Unsupported provider: provider is not enabled"). Dan tonen we een nette
 * melding i.p.v. de ruwe JSON-fout.
 */
export function isProviderNotEnabledError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const lower = message.toLowerCase();
  return (
    lower.includes("provider is not enabled") ||
    lower.includes("unsupported provider") ||
    lower.includes("validation_failed")
  );
}

export async function startOAuthSignIn(
  supabase: SupabaseClient,
  provider: OAuthProviderId,
  nextPath = "/onboarding"
): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: toSupabaseOAuthProvider(provider),
    options: {
      redirectTo: buildAuthCallbackUrl(nextPath),
      skipBrowserRedirect: false,
    },
  });
  if (error) throw error;
}

/** Alleen bestaande accounts; geen signup via magic link. */
export async function sendLoginMagicLink(
  supabase: SupabaseClient,
  email: string,
  nextPath = "/onboarding"
): Promise<void> {
  const normalized = normalizeSignupEmail(email);
  if (!normalized) {
    throw new Error("invalid_email");
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: buildAuthCallbackUrl(nextPath),
    },
  });
  if (error) throw error;
}
