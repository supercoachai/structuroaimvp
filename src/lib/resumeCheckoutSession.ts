import { createClient } from "@/lib/supabase/client";

export type ResumeCheckoutSessionResult =
  | { ok: true }
  | { ok: false; reason: "missing_id" | "not_paid" | "failed" };

/** Stille inlog na geslaagde Stripe-checkout (session_id als bewijs). */
export async function resumeCheckoutSession(
  checkoutSessionId: string
): Promise<ResumeCheckoutSessionResult> {
  const sessionId = checkoutSessionId.trim();
  if (!sessionId.startsWith("cs_")) {
    return { ok: false, reason: "missing_id" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id) {
    return { ok: true };
  }

  let tokenHash: string;
  let email: string;
  try {
    const bindRes = await fetch("/api/checkout/bind-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (bindRes.status === 409) {
      return { ok: false, reason: "not_paid" };
    }
    if (!bindRes.ok) {
      return { ok: false, reason: "failed" };
    }

    const res = await fetch("/api/checkout/resume-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (res.status === 409) {
      return { ok: false, reason: "not_paid" };
    }
    if (!res.ok) {
      return { ok: false, reason: "failed" };
    }
    const data = (await res.json()) as { token_hash?: string; email?: string };
    if (!data.token_hash || !data.email) {
      return { ok: false, reason: "failed" };
    }
    tokenHash = data.token_hash;
    email = data.email;
  } catch {
    return { ok: false, reason: "failed" };
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (error) {
    console.warn("[resumeCheckoutSession] verifyOtp", error.message);
    return { ok: false, reason: "failed" };
  }

  const {
    data: { user: verified },
  } = await supabase.auth.getUser();

  if (!verified?.id || verified.email?.trim().toLowerCase() !== email) {
    return { ok: false, reason: "failed" };
  }

  try {
    await fetch("/api/stripe/sync-subscription", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* best-effort */
  }

  return { ok: true };
}
