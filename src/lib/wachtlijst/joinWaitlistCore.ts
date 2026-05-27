"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { WaitlistSignupSite } from "@/lib/posthog/waitlistAnalytics";
import { captureWaitlistSignupServer } from "@/lib/posthog/waitlistAnalytics";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { sanitizeWaitlistSourceParam } from "@/lib/wachtlijst/source";

/** Minimale DB-typing tot `wachtlijst` in gegenereerde Supabase types staat. */
type WaitlistDb = {
  public: {
    Tables: {
      wachtlijst: {
        Row: {
          email: string;
          name: string;
          source: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          name: string;
          source?: string | null;
        };
        Update: {
          email?: string;
          name?: string;
          source?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function waitlistDb(
  client: NonNullable<ReturnType<typeof createServiceRoleClient>>
): SupabaseClient<WaitlistDb> {
  return client as SupabaseClient<WaitlistDb>;
}

export type JoinWaitlistResult =
  | { ok: true; firstName: string }
  | {
      ok: false;
      type: "already_exists" | "validation" | "rate_limited" | "server_error";
      message?: string;
    };

export type JoinWaitlistInput = {
  name: string;
  email: string;
  source?: string;
  site: WaitlistSignupSite;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LEN = 120;
const MAX_EMAIL_LEN = 254;

function firstNameFromName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

export async function joinWaitlistCore(
  input: JoinWaitlistInput
): Promise<JoinWaitlistResult> {
  const name = input.name.trim().slice(0, MAX_NAME_LEN);
  const emailLower = input.email.toLowerCase().trim().slice(0, MAX_EMAIL_LEN);

  if (!name.length) {
    return { ok: false, type: "validation", message: "name_required" };
  }
  if (!emailLower.length || !EMAIL_REGEX.test(emailLower)) {
    return { ok: false, type: "validation", message: "email_invalid" };
  }

  const source = sanitizeWaitlistSourceParam(input.source);

  const rawAdmin = createServiceRoleClient();
  if (!rawAdmin) {
    console.error("[wachtlijst] joinWaitlistCore: missing service role");
    return { ok: false, type: "server_error" };
  }
  const admin = waitlistDb(rawAdmin);

  try {
    const { data: existing, error: lookupErr } = await admin
      .from("wachtlijst")
      .select("email")
      .eq("email", emailLower)
      .maybeSingle();

    if (lookupErr) {
      console.error("[wachtlijst] lookup:", lookupErr.code, lookupErr.message);
      return { ok: false, type: "server_error" };
    }
    if (existing) {
      return { ok: false, type: "already_exists" };
    }

    const { error: insertErr } = await admin.from("wachtlijst").insert({
      email: emailLower,
      name,
      source,
    });

    if (insertErr) {
      const msg = (insertErr.message ?? "").toLowerCase();
      if (
        insertErr.code === "23505" ||
        msg.includes("duplicate") ||
        msg.includes("unique constraint")
      ) {
        return { ok: false, type: "already_exists" };
      }
      console.error("[wachtlijst] insert:", insertErr.code, insertErr.message);
      return { ok: false, type: "server_error" };
    }

    await captureWaitlistSignupServer({ source, site: input.site });

    return { ok: true, firstName: firstNameFromName(name) };
  } catch (e) {
    console.error("[wachtlijst] joinWaitlistCore:", e);
    return { ok: false, type: "server_error" };
  }
}
