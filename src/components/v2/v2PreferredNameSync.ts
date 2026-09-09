"use client";

import {
  clearPreferredDisplayName,
  persistPreferredDisplayName,
} from "@/lib/accountDisplayName";
import { createClient } from "@/lib/supabase/client";

import { persistV2PreferredName } from "./v2DisplayName";
import {
  firstNameFromDisplay,
  isMeaningfulPreferredName,
} from "./v2PostAccountName";

const JOURNEY_KEY = "v2_journey";

function readJourneyName(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(JOURNEY_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { name?: unknown };
    return typeof parsed.name === "string" ? parsed.name.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Cloud wint. Alleen een naam uit de huidige journey mag naar een leeg
 * profiel worden teruggeschreven, zodat een restant van een andere gebruiker
 * op een gedeelde browser niet meeverhuist.
 */
function usablePreferredName(raw: string): string {
  const trimmed = raw.trim().slice(0, 80);
  if (!trimmed) return "";
  if (!isMeaningfulPreferredName(firstNameFromDisplay(trimmed) || trimmed)) {
    return "";
  }
  return trimmed;
}

export function resolveHydratedPreferredName(
  cloudName: string,
  journeyName: string,
): { name: string; shouldPushToCloud: boolean } {
  const cloud = usablePreferredName(cloudName);
  if (cloud) {
    return { name: cloud, shouldPushToCloud: false };
  }
  const journey = usablePreferredName(journeyName);
  if (journey) {
    return { name: journey, shouldPushToCloud: true };
  }
  return { name: "", shouldPushToCloud: false };
}

/** Schrijf de lokale naam naar profiles + auth-metadata. Guests: no-op. */
export async function syncV2PreferredNameToCloud(
  name: string,
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return { error: null };

    const trimmed = name.trim();
    if (!trimmed) {
      return clearPreferredDisplayName(user);
    }
    return persistPreferredDisplayName(user, trimmed);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Zet de aanspreeknaam uit het profiel terug in localStorage. */
export async function hydrateV2PreferredNameFromProfile(): Promise<string> {
  const journeyName = readJourneyName();
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return isMeaningfulPreferredName(journeyName)
        ? persistV2PreferredName(journeyName)
        : "";
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_name, display_name")
      .eq("id", user.id)
      .maybeSingle();

    const cloud =
      (typeof profile?.preferred_name === "string" ? profile.preferred_name : "") ||
      (typeof profile?.display_name === "string" ? profile.display_name : "");
    const resolved = resolveHydratedPreferredName(cloud, journeyName);
    if (!resolved.name) return "";

    persistV2PreferredName(resolved.name);
    if (resolved.shouldPushToCloud) {
      await persistPreferredDisplayName(user, resolved.name);
    }
    return resolved.name;
  } catch {
    return isMeaningfulPreferredName(journeyName)
      ? persistV2PreferredName(journeyName)
      : "";
  }
}
