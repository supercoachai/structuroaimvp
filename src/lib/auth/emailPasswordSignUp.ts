import type { SupabaseClient } from "@supabase/supabase-js";

import { buildAuthCallbackUrl } from "@/lib/auth/buildAuthCallbackUrl";
import { signUpPasswordlessWithLocalDevFallback } from "@/lib/auth/devSignupClient";
import { normalizeSignupEmail } from "@/lib/auth/signupEmail";
import { markPasswordSetupCompletedReliably } from "@/lib/auth/passwordSetupProfile";
import { getResolvedSignupSourceForProfile } from "@/lib/posthog/signupAttribution";

export type EmailPasswordSignUpParams = {
  email: string;
  password: string;
  fullName: string;
  signupSource?: string | null;
  signupCampaign?: string | null;
  captchaToken?: string;
};

export type EmailPasswordSignUpResult = {
  userId: string;
  email: string | null | undefined;
  needsEmailConfirmation: boolean;
};

export async function signUpWithEmailPassword(
  supabase: SupabaseClient,
  params: EmailPasswordSignUpParams
): Promise<EmailPasswordSignUpResult> {
  const email = normalizeSignupEmail(params.email);
  if (!email) {
    throw new Error("invalid_email");
  }

  if (process.env.NODE_ENV === "development") {
    const resolvedSource = getResolvedSignupSourceForProfile();
    const devResult = await signUpPasswordlessWithLocalDevFallback(supabase, {
      email,
      fullName: params.fullName.trim(),
      signupSource: resolvedSource,
      signupCampaign: params.signupCampaign,
    });
    if (devResult.kind !== "session") {
      throw new Error("signup_session_failed");
    }
    // Dev-fallback is passwordless onder water, maar de gebruiker registreert
    // bewust met e-mail + wachtwoord. Markeer wachtwoord-setup als klaar, anders
    // bounce de middleware naar /auth/wachtwoord-aanmaken.
    await markPasswordSetupCompletedReliably(supabase, devResult.user.id);
    return {
      userId: devResult.user.id,
      email,
      needsEmailConfirmation: false,
    };
  }

  const resolvedSource =
    getResolvedSignupSourceForProfile() ?? params.signupSource ?? null;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      ...(params.captchaToken ? { captchaToken: params.captchaToken } : {}),
      data: {
        full_name: params.fullName.trim(),
        ...(resolvedSource ? { signup_source: resolvedSource } : {}),
        ...(params.signupCampaign ? { signup_utm_campaign: params.signupCampaign } : {}),
      },
      emailRedirectTo: buildAuthCallbackUrl("/onboarding"),
    },
  });

  if (error) throw error;
  if (!data.user?.id) throw new Error("signup_failed");

  if (data.session) {
    // Best-effort: transient fout mag signup niet blokkeren.
    await markPasswordSetupCompletedReliably(supabase, data.user.id);
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
