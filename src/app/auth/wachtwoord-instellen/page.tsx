import { createClient } from "@/lib/supabase/server";

import WachtwoordInstellenClient from "./WachtwoordInstellenClient";

export default async function WachtwoordInstellenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <WachtwoordInstellenClient serverHasSession={Boolean(user)} />;
}
