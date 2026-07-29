import HomeV2Client from "@/components/v2/HomeV2Client";
import LoginV2Client from "@/components/v2/LoginV2Client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return <HomeV2Client />;
  }

  return <LoginV2Client variant="welcome" />;
}
