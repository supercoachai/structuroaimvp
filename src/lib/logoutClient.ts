"use client";

import { createClient } from "@/lib/supabase/client";
import { clearDagstartCookieOnClient } from "@/lib/dagstartCookie";
import { clearLocalOnboardingDoneCookieOnClient } from "@/lib/localOnboardingCookie";
import { clearAllWelcomeDismissedSessionKeys } from "@/lib/onboardingProfile";

type RouterLike = {
  push: (href: string) => void;
  refresh: () => void;
};

/** Zelfde stappen als sidebar/focus: sessie wissen, lokale modus-cookie, dagstart-cookie, welkomst-sessie, naar /login. */
export async function performClientLogout(router: RouterLike): Promise<void> {
  try {
    await createClient().auth.signOut();
  } catch {
    /* geen actieve sessie, bijv. lokale modus */
  }
  document.cookie = "structuro_local_mode=; path=/; max-age=0";
  clearLocalOnboardingDoneCookieOnClient();
  clearDagstartCookieOnClient();
  clearAllWelcomeDismissedSessionKeys();
  router.push("/login");
  router.refresh();
}
