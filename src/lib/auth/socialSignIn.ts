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

/**
 * Stuurt e-mail OTP (6-cijferige code + optionele link) voor bestaande accounts.
 * Primair pad: code typen in dezelfde browser (geen PKCE). Link blijft backup.
 */
export async function sendLoginMagicLink(
  supabase: SupabaseClient,
  email: string,
  nextPath = "/onboarding",
  captchaToken?: string
): Promise<void> {
  const normalized = normalizeSignupEmail(email);
  if (!normalized) {
    throw new Error("invalid_email");
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      ...(captchaToken ? { captchaToken } : {}),
      shouldCreateUser: false,
      emailRedirectTo: buildAuthCallbackUrl(nextPath),
    },
  });
  if (error) throw error;
}

/** Verifieer 6-cijferige login-code in dezelfde browser (omzeilt PKCE-redirect). */
export async function verifyLoginEmailOtp(
  supabase: SupabaseClient,
  email: string,
  token: string
): Promise<{ id: string; email: string | null | undefined }> {
  const normalized = normalizeSignupEmail(email);
  const code = token.replace(/\s+/g, "").trim();
  if (!normalized) throw new Error("invalid_email");
  if (!/^\d{6,8}$/.test(code)) throw new Error("invalid_otp");

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalized,
    token: code,
    type: "email",
  });
  if (error) throw error;
  const user = data.user ?? data.session?.user;
  if (!user?.id) throw new Error("otp_no_session");
  return { id: user.id, email: user.email };
}

/** Verifieer signup-bevestigingscode (email confirm) in dezelfde browser. */
export async function verifySignupEmailOtp(
  supabase: SupabaseClient,
  email: string,
  token: string
): Promise<{ id: string; email: string | null | undefined }> {
  const normalized = normalizeSignupEmail(email);
  const code = token.replace(/\s+/g, "").trim();
  if (!normalized) throw new Error("invalid_email");
  if (!/^\d{6,8}$/.test(code)) throw new Error("invalid_otp");

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalized,
    token: code,
    type: "signup",
  });
  if (error) throw error;
  const user = data.user ?? data.session?.user;
  if (!user?.id) throw new Error("otp_no_session");
  return { id: user.id, email: user.email };
}
