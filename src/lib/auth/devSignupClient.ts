import type { SupabaseClient } from "@supabase/supabase-js";

import { buildAuthCallbackUrl } from "@/lib/auth/buildAuthCallbackUrl";

type SignUpParams = {
  email: string;
  fullName: string;
  signupSource?: string | null;
  signupCampaign?: string | null;
};

export type SignUpResult =
  | { kind: "session"; user: { id: string } }
  | { kind: "magic_link_sent" };

function buildSignupMetadata(params: SignUpParams): Record<string, string> {
  return {
    full_name: params.fullName,
    ...(params.signupSource ? { signup_source: params.signupSource } : {}),
    ...(params.signupCampaign ? { signup_utm_campaign: params.signupCampaign } : {}),
  };
}

/** Productie: magic link signup. Lokaal: admin-createUser + directe sessie. */
export async function signUpPasswordlessWithLocalDevFallback(
  supabase: SupabaseClient,
  params: SignUpParams
): Promise<SignUpResult> {
  const metadata = buildSignupMetadata(params);

  if (process.env.NODE_ENV === "development") {
    const password = `${crypto.randomUUID()}Aa1!`;
    const res = await fetch("/api/dev/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email,
        password,
        full_name: params.fullName,
        signup_source: params.signupSource ?? undefined,
        signup_utm_campaign: params.signupCampaign ?? undefined,
      }),
    });

    let body: { error?: string } = {};
    try {
      body = (await res.json()) as { error?: string };
    } catch {
      body = {};
    }

    if (!res.ok) {
      throw new Error(body.error ?? "Signup failed");
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: params.email,
      password,
    });
    if (signInError) throw signInError;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("signup_failed");
    return { kind: "session", user };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: params.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: buildAuthCallbackUrl(),
      data: metadata,
    },
  });
  if (error) throw error;
  return { kind: "magic_link_sent" };
}

/** @deprecated Gebruik signUpPasswordlessWithLocalDevFallback */
export async function signUpWithLocalDevFallback(
  supabase: SupabaseClient,
  params: SignUpParams & { password: string }
): Promise<{ user: { id: string } }> {
  const result = await signUpPasswordlessWithLocalDevFallback(supabase, params);
  if (result.kind !== "session") {
    throw new Error("signup_session_failed");
  }
  return result;
}
