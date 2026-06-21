/** Supabase OAuth provider slugs (azure = Microsoft). */
export type OAuthProviderId = "google" | "azure" | "apple";

export function isGoogleOAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED !== "false";
}

export function isMicrosoftOAuthEnabled(): boolean {
  // Opt-in: alleen tonen als Azure daadwerkelijk in Supabase is ingeschakeld
  // EN deze vlag op "true" staat. Anders krijg je een kapotte knop
  // ("Unsupported provider: provider is not enabled").
  return process.env.NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED === "true";
}

export function isAppleOAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === "true";
}

export function getEnabledOAuthProviders(): OAuthProviderId[] {
  const providers: OAuthProviderId[] = [];
  if (isGoogleOAuthEnabled()) providers.push("google");
  if (isMicrosoftOAuthEnabled()) providers.push("azure");
  if (isAppleOAuthEnabled()) providers.push("apple");
  return providers;
}

/**
 * Providers die we al wél tonen (als grijze, niet-klikbare "binnenkort"-knop),
 * maar die nog niet in Supabase zijn geconfigureerd. Microsoft staat hier zolang
 * de Azure-provider nog niet is ingesteld.
 */
export function getComingSoonOAuthProviders(): OAuthProviderId[] {
  const providers: OAuthProviderId[] = [];
  if (!isMicrosoftOAuthEnabled()) providers.push("azure");
  return providers;
}

export function oauthProviderLabelKey(provider: OAuthProviderId): string {
  if (provider === "google") return "oauth.googleCta";
  if (provider === "azure") return "oauth.microsoftCta";
  return "oauth.appleCta";
}
