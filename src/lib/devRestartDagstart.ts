"use client";

import {
  clearDagstartCookieOnClient,
  getCalendarDateAmsterdam,
} from "@/lib/dagstartCookie";
import { getCheckInsFromStorage } from "@/lib/localStorageTasks";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY_CHECKINS = "structuro_daily_checkins";

/**
 * Development: dagstart opnieuw laten beginnen (cookie, check-in, profiel).
 * Veiliger dan volledige data-wipe; mag ook op het beschermde testaccount.
 */
export async function restartDagstartForDev(): Promise<void> {
  if (typeof window === "undefined") return;

  const today = getCalendarDateAmsterdam();

  clearDagstartCookieOnClient();

  try {
    const checkIns = getCheckInsFromStorage();
    const filtered = checkIns.filter(
      (ci: { date?: string }) => ci.date !== today
    );
    localStorage.setItem(STORAGE_KEY_CHECKINS, JSON.stringify(filtered));
  } catch (e) {
    console.warn("dev restart dagstart: localStorage check-in clear failed", e);
  }

  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (userId) {
      const { error: checkInErr } = await supabase
        .from("daily_checkins")
        .delete()
        .eq("user_id", userId)
        .eq("date", today);
      if (checkInErr) {
        console.warn("dev restart dagstart: check-in delete failed", checkInErr);
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          last_dagstart_date: null,
          dagstart_energy: null,
          dagstart_completed_at: null,
        })
        .eq("id", userId);
      if (profileErr) {
        console.warn("dev restart dagstart: profile update failed", profileErr);
      }
    }
  } catch (e) {
    console.warn("dev restart dagstart: supabase clear failed", e);
  }

  window.location.href = "/";
}
