import type { SupabaseClient } from "@supabase/supabase-js";

import { buildAuthCallbackUrl } from "@/lib/auth/buildAuthCallbackUrl";
import { signUpPasswordlessWithLocalDevFallback } from "@/lib/auth/devSignupClient";
import { normalizeSignupEmail } from "@/lib/auth/signupEmail";
import { markPasswordSetupCompleted } from "@/lib/auth/passwordSetupProfile";

export type EmailPasswordSignUpParams = {
  email: string;
  password: string;
  fullName: string;
  signupSource?: string | null;
  signupCampaign?: string | null;
};

export type EmailPasswordSignUpResult = {
  userId: string;
  email: string | null | undefined;
  needsEmailConfirmation: boolean;
};

/**
 * Markeer password_setup_completed via de server (service-role).
 *
 * Een directe client-side update faalt: `authenticated` heeft geen column-grant
 * op password_setup_completed (zie 20260611120000_profiles_protect_subscription_columns.sql,
 * die UPDATE tabel-breed introk en de kolom-grant voor de later toegevoegde kolom
 * mist). De update raakt dan 0 rijen / faalt stil, de vlag blijft false en de
 * middleware bounce't de e-mail+wachtwoord-gebruiker daarna naar
 * /auth/wachtwoord-aanmaken ("Bewaar je dagstart"). De endpoint zet de vlag met
 * service-role, net als de OAuth-callback. Best-effort: een transient fout mag de
 * signup-redirect niet blokkeren (de gebruiker kan altijd later een wachtwoord zetten).
 */
async function markPasswordSetupCompletedViaServer(): Promise<void> {
  try {
    await fetch("/api/auth/complete-password-setup", { method: "POST" });
  } catch {
    /* best-effort */
  }
}

export async function signUpWithEmailPassword(
  supabase: SupabaseClient,
  params: EmailPasswordSignUpParams
): Promise<EmailPasswordSignUpResult> {
  const email = normalizeSignupEmail(params.email);
  if (!email) {
    throw new Error("invalid_email");
  }

  if (process.env.NODE_ENV === "development") {
    const devResult = await signUpPasswordlessWithLocalDevFallback(supabase, {
      email,
      fullName: params.fullName.trim(),
      signupSource: params.signupSource,
      signupCampaign: params.signupCampaign,
    });
    if (devResult.kind !== "session") {
      throw new Error("signup_session_failed");
    }
    // Dev-fallback is passwordless onder water, maar de gebruiker registreert
    // bewust met e-mail + wachtwoord. Markeer wachtwoord-setup als klaar, anders
    // bounce de middleware naar /auth/wachtwoord-aanmaken (zoals in productie wél
    // gebeurt zodra er een sessie is). Dev gebruikt de lokale DB (geen column-lock),
    // dus de directe update werkt hier; productie loopt via de service-role-endpoint.
    await markPasswordSetupCompleted(supabase, devResult.user.id);
    return {
      userId: devResult.user.id,
      email,
      needsEmailConfirmation: false,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName.trim(),
        ...(params.signupSource ? { signup_source: params.signupSource } : {}),
        ...(params.signupCampaign ? { signup_utm_campaign: params.signupCampaign } : {}),
      },
      emailRedirectTo: buildAuthCallbackUrl("/onboarding"),
    },
  });

  if (error) throw error;
  if (!data.user?.id) throw new Error("signup_failed");

  if (data.session) {
    await markPasswordSetupCompletedViaServer();
    return {
      userId: data.user.id,
      email: data.user.email,
      needsEmailConfirmation: false,
    };
  }

  return {
    userId: data.user.id,
    email: data.user.email,
    needsEmailConfirmation: true,
  };
}
