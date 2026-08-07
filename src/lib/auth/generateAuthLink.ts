import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export type AuthLinkType = "recovery" | "magiclink";

export type GeneratedAuthLink = {
  actionLink: string;
  emailOtp: string | null;
};

export async function generateAuthLink(input: {
  type: AuthLinkType;
  email: string;
  redirectTo: string;
}): Promise<GeneratedAuthLink | null> {
  const admin = createServiceRoleClient();
  if (!admin) return null;

  const { data, error } = await admin.auth.admin.generateLink({
    type: input.type,
    email: input.email,
    options: { redirectTo: input.redirectTo },
  });

  if (error || !data.properties?.action_link) {
    console.error("[auth/generateAuthLink]", input.type, error?.message);
    return null;
  }

  const emailOtp =
    typeof data.properties.email_otp === "string"
      ? data.properties.email_otp.trim()
      : null;

  return {
    actionLink: data.properties.action_link,
    emailOtp,
  };
}
