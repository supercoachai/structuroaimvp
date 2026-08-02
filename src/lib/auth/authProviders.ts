/** Supabase OAuth provider slugs (azure = Microsoft). */
export type OAuthProviderId = "google" | "facebook" | "azure" | "apple";

export function isGoogleOAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED !== "false";
}

export function isFacebookOAuthEnabled(): boolean {
  // Opt-in: alleen tonen als Facebook in Supabase is ingeschakeld
  // EN deze vlag op "true" staat. Anders kapotte knop.
  return process.env.NEXT_PUBLIC_AUTH_FACEBOOK_ENABLED === "true";
}

export function isMicrosoftOAuthEnabled(): boolean {
  // Opt-in: alleen tonen als Azure daadwerkelijk in Supabase is ingeschakeld
  // EN deze vlag op "true" staat. Anders krijg je een kapotte knop
  // ("Unsupported provider: provider is not enabled").
  return process.env.NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED === "true";
}

export function isAppleOAuthEnabled(): boolean {
  // Bewust uit: Apple Developer Program kost geld; niet aanbieden zonder opt-in.
  return process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === "true";
}

export function getEnabledOAuthProviders(): OAuthProviderId[] {
  const providers: OAuthProviderId[] = [];
  if (isGoogleOAuthEnabled()) providers.push("google");
  if (isFacebookOAuthEnabled()) providers.push("facebook");
  if (isMicrosoftOAuthEnabled()) providers.push("azure");
  if (isAppleOAuthEnabled()) providers.push("apple");
  return providers;
}

/**
 * Providers die we al wél tonen (als grijze, niet-klikbare "binnenkort"-knop),
 * maar die nog niet in Supabase zijn geconfigureerd. Alleen Facebook:
 * dat is de gevraagde social optie naast Google. Microsoft blijft pure opt-in.
 */
export function getComingSoonOAuthProviders(): OAuthProviderId[] {
  const providers: OAuthProviderId[] = [];
  if (!isFacebookOAuthEnabled()) providers.push("facebook");
  return providers;
}

export function oauthProviderLabelKey(provider: OAuthProviderId): string {
  if (provider === "google") return "oauth.googleCta";
  if (provider === "facebook") return "oauth.facebookCta";
  if (provider === "azure") return "oauth.microsoftCta";
  return "oauth.appleCta";
}
