import type { Provider, SupabaseClient } from "@supabase/supabase-js";

import { buildAuthCallbackUrl } from "@/lib/auth/buildAuthCallbackUrl";
import { normalizeSignupEmail } from "@/lib/auth/signupEmail";
import type { OAuthProviderId } from "@/lib/auth/authProviders";
import {
  appendAnonDistinctIdToPath,
  writeAnonDistinctIdCookie,
} from "@/lib/posthog/anonDistinctCookie";
import { getAnonymousDistinctIdForMagicLink } from "@/lib/posthog/identityStitch";

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

/**
 * Start social login via Supabase Auth.
 * `redirectTo` is de app-callback (structuro.ai/auth/callback). Google’s consent
 * scherm toont desondanks het Supabase Auth-callback domein (*.supabase.co),
 * tot er een Supabase custom domain + Google redirect URI is gezet.
 */
export async function startOAuthSignIn(
  supabase: SupabaseClient,
  provider: OAuthProviderId,
  nextPath = "/onboarding"
): Promise<void> {
  const anonId = getAnonymousDistinctIdForMagicLink();
  if (anonId) writeAnonDistinctIdCookie(anonId);
  // OAuth kan user_metadata niet vooraf zetten; plak anon-id op next zodat
  // /auth/callback server-side kan aliassen (cookieless identify werkt niet).
  const nextWithAnon = appendAnonDistinctIdToPath(nextPath, anonId);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: toSupabaseOAuthProvider(provider),
    options: {
      redirectTo: buildAuthCallbackUrl(nextWithAnon),
      skipBrowserRedirect: false,
    },
  });
  if (error) throw error;
}

/**
 * Stuurt e-mail OTP (8-cijferige code + optionele link) voor bestaande accounts.
 * Server-route stuurt branded mail via Resend; fallback naar Supabase-default.
 */
export async function sendLoginMagicLink(
  _supabase: SupabaseClient,
  email: string,
  nextPath = "/onboarding",
  captchaToken?: string
): Promise<void> {
  const normalized = normalizeSignupEmail(email);
  if (!normalized) {
    throw new Error("invalid_email");
  }
  const anonId = getAnonymousDistinctIdForMagicLink();
  if (anonId) writeAnonDistinctIdCookie(anonId);
  const nextWithAnon = appendAnonDistinctIdToPath(nextPath, anonId);

  const res = await fetch("/api/auth/send-login-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: normalized,
      nextPath: nextWithAnon,
      ...(captchaToken ? { captchaToken } : {}),
    }),
  });

  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
  } | null;

  if (!res.ok || !data?.ok) {
    const code = data?.error ?? "send_failed";
    throw new Error(code);
  }
}

/** Verifieer 8-cijferige login-code in dezelfde browser (omzeilt PKCE-redirect). */
export async function verifyLoginEmailOtp(
  supabase: SupabaseClient,
  email: string,
  token: string
): Promise<{ id: string; email: string | null | undefined }> {
  const normalized = normalizeSignupEmail(email);
  const code = token.replace(/\s+/g, "").trim();
  if (!normalized) throw new Error("invalid_email");
  if (!/^\d{8}$/.test(code)) throw new Error("invalid_otp");

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
  if (!/^\d{8}$/.test(code)) throw new Error("invalid_otp");

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
