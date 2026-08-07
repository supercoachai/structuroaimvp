import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export type ProfileEmailLookup = {
  id: string;
  preferred_name: string | null;
};

export async function lookupProfileByEmail(
  email: string
): Promise<ProfileEmailLookup | null> {
  const admin = createServiceRoleClient();
  if (!admin) return null;

  const { data, error } = (await admin
    .from("profiles")
    .select("id, preferred_name")
    .eq("email", email)
    .maybeSingle()) as {
    data: ProfileEmailLookup | null;
    error: { message: string } | null;
  };

  if (error || !data?.id) return null;
  return {
    id: String(data.id),
    preferred_name:
      typeof data.preferred_name === "string" ? data.preferred_name : null,
  };
}
