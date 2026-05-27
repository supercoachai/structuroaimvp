"use server";

import { joinWaitlistCore, type JoinWaitlistResult } from "@/lib/wachtlijst/joinWaitlistCore";

export type { JoinWaitlistResult };

export async function joinWaitlist(formData: FormData): Promise<JoinWaitlistResult> {
  const nameRaw = String(formData.get("name") ?? "");
  const emailRaw = String(formData.get("email") ?? "");
  const sourceRaw = String(formData.get("source") ?? "");

  return joinWaitlistCore({
    name: nameRaw,
    email: emailRaw,
    source: sourceRaw,
    site: "ai",
  });
}
