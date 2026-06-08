import { createClient } from "@/lib/supabase/server";
import {
  emptyRetentionStats,
  fetchRetentionStatsForUser,
} from "@/lib/retentionStatsServer";
import { PaywallStatsHydrator } from "./PaywallStatsContext";
import { RetentionPaywallStatsUI } from "./RetentionPaywallStatsUI";

type RetentionPaywallStatsProps = {
  userId: string;
  signupSource: string | null;
};

export async function RetentionPaywallStats({
  userId,
  signupSource,
}: RetentionPaywallStatsProps) {
  const supabase = await createClient();
  const stats = await fetchRetentionStatsForUser(supabase, userId, {
    signupSource,
  }).catch(() => emptyRetentionStats(signupSource));

  return (
    <>
      <RetentionPaywallStatsUI stats={stats} />
      <PaywallStatsHydrator stats={stats} />
    </>
  );
}
