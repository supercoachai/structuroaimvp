"use server";

import { createClient } from "@/lib/supabase/server";
import { sanitizeWaitlistSourceParam } from "@/lib/wachtlijst/source";

export type JoinWaitlistResult =
  | { ok: true; firstName: string }
  | { ok: false; type: "already_exists" | "validation" | "server_error"; message?: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinWaitlist(formData: FormData): Promise<JoinWaitlistResult> {
  const nameRaw = String(formData.get("name") ?? "");
  const emailRaw = String(formData.get("email") ?? "");
  const sourceRaw = String(formData.get("source") ?? "");

  const name = nameRaw.trim();
  const emailLower = emailRaw.toLowerCase().trim();

  if (!name.length) {
    return { ok: false, type: "validation", message: "name_required" };
  }
  if (!emailLower.length || !EMAIL_REGEX.test(emailLower)) {
    return { ok: false, type: "validation", message: "email_invalid" };
  }

  const source = sanitizeWaitlistSourceParam(sourceRaw);

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("wachtlijst").insert({
      email: emailLower,
      name,
      source,
    });

    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      if (
        error.code === "23505" ||
        msg.includes("duplicate") ||
        msg.includes("unique constraint")
      ) {
        return { ok: false, type: "already_exists" };
      }
      console.error("[wachtlijst] insert:", error.code, error.message);
      return { ok: false, type: "server_error" };
    }

    const firstWord = name.split(/\s+/)[0] ?? name;
    return { ok: true, firstName: firstWord };
  } catch (e) {
    console.error("[wachtlijst] joinWaitlist:", e);
    return { ok: false, type: "server_error" };
  }
}
