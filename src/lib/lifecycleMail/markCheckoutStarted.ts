import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

/**
 * Zet profiles.checkout_started_at één keer (eerste intent).
 * Idempotent: overschrijft een bestaande timestamp niet.
 */
export async function markCheckoutStartedAt(
  userId: string,
  at: Date = new Date()
): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId) return;

  const { error } = await supabase
    .from("profiles")
    .update({ checkout_started_at: at.toISOString() })
    .eq("id", userId)
    .is("checkout_started_at", null);

  if (error) {
    console.error("[lifecycle-mail] markCheckoutStartedAt", error.message);
  }
}
