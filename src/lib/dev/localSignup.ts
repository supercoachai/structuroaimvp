import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export function isLocalDevSignupEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

type LocalSignupInput = {
  email: string;
  password: string;
  fullName: string;
  signupSource?: string | null;
  signupCampaign?: string | null;
};

type LocalSignupResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; status: number };

export async function createLocalDevUser(
  input: LocalSignupInput
): Promise<LocalSignupResult> {
  if (!isLocalDevSignupEnabled()) {
    return { ok: false, error: "not_available", status: 404 };
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return { ok: false, error: "service_role_unavailable", status: 503 };
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  if (!email || !fullName) {
    return { ok: false, error: "invalid_input", status: 400 };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "password_too_short", status: 400 };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      ...(input.signupSource ? { signup_source: input.signupSource } : {}),
      ...(input.signupCampaign
        ? { signup_utm_campaign: input.signupCampaign }
        : {}),
    },
  });

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("already") || lower.includes("registered")) {
      return { ok: false, error: "User already registered", status: 409 };
    }
    if (lower.includes("invalid email")) {
      return { ok: false, error: "Invalid email", status: 400 };
    }
    return { ok: false, error: error.message, status: 400 };
  }

  if (!data.user?.id) {
    return { ok: false, error: "create_failed", status: 500 };
  }

  await admin
    .from("profiles")
    .update({ password_setup_completed: true })
    .eq("id", data.user.id);

  return { ok: true, userId: data.user.id };
}
