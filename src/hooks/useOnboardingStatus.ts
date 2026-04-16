"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";
import { isLocalOnboardingCompleted } from "@/lib/onboardingProfile";
import type { User } from "@supabase/supabase-js";

function firstNameFromFull(full: string | null | undefined): string | null {
  if (!full || !String(full).trim()) return null;
  const first = String(full).trim().split(/\s+/)[0];
  return first || null;
}

/** Alleen Supabase (profiel + auth metadata), niet localStorage — voor verplichte naamstap. */
function firstNameFromUserMetadata(user: User): string | null {
  const m = user.user_metadata as Record<string, unknown> | undefined;
  if (!m) return null;
  const raw = m.full_name ?? m.fullName ?? m.full_name_string;
  return firstNameFromFull(typeof raw === "string" ? raw : null);
}

function firstNameFromLocalStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("structuro_user_name");
    return firstNameFromFull(raw);
  } catch {
    return null;
  }
}

export function useOnboardingStatus(): {
  onboardingCompleted: boolean;
  loading: boolean;
  /** Voornaam voor welkomsttekst */
  welcomeFirstName: string | null;
  /** Ingelogd maar geen naam in profile/auth: eerst naamstap op dagstart. */
  needsAccountDisplayName: boolean;
  refresh: () => Promise<void>;
} {
  const { user, loading: userLoading } = useUser();
  /** Alleen id in deps: het hele `user`-object wisselt van referentie bij elk auth-event → anders eindeloze refresh-lus. */
  const userId = user?.id ?? null;
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [welcomeFirstName, setWelcomeFirstName] = useState<string | null>(null);
  const [needsAccountDisplayName, setNeedsAccountDisplayName] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (userLoading) return;

    const localFirst = firstNameFromLocalStorage();

    if (!userId) {
      setOnboardingCompleted(isLocalOnboardingCompleted());
      setWelcomeFirstName(localFirst);
      setNeedsAccountDisplayName(false);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const sessionUser = authData?.user ?? null;
      const fromMeta = sessionUser ? firstNameFromUserMetadata(sessionUser) : null;

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "onboarding_completed, display_name, preferred_name, full_name"
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setOnboardingCompleted(isLocalOnboardingCompleted());
        setWelcomeFirstName(localFirst ?? fromMeta);
        setNeedsAccountDisplayName(!fromMeta);
        setProfileLoading(false);
        return;
      }

      setOnboardingCompleted(data?.onboarding_completed === true);
      const fromProfile =
        firstNameFromFull(data?.display_name) ??
        firstNameFromFull(data?.preferred_name) ??
        firstNameFromFull(data?.full_name);
      const hasAccountName = Boolean(fromProfile || fromMeta);
      setNeedsAccountDisplayName(!hasAccountName);
      setWelcomeFirstName(
        fromProfile ?? localFirst ?? fromMeta
      );
    } catch {
      const supabase = createClient();
      let fromMeta: string | null = null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) fromMeta = firstNameFromUserMetadata(authData.user);
      } catch {
        /* ignore */
      }
      setOnboardingCompleted(isLocalOnboardingCompleted());
      setWelcomeFirstName(localFirst ?? fromMeta);
      setNeedsAccountDisplayName(!fromMeta);
    } finally {
      setProfileLoading(false);
    }
  }, [userId, userLoading]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loading = userLoading || profileLoading;

  return {
    onboardingCompleted,
    loading,
    welcomeFirstName,
    needsAccountDisplayName,
    refresh,
  };
}
