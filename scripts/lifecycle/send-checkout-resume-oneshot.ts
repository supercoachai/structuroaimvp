/**
 * One-shot: stuur s0_checkout_resume naar opgegeven userIds.
 *
 *   npx vercel env run -e production -- npx tsx scripts/lifecycle/send-checkout-resume-oneshot.ts --apply --force <userId>...
 *
 * --force: negeer timing-window (nog steeds geen send bij trialing/unsubscribe).
 * Zonder --apply: dry-run.
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import { sendResendEmail } from "../../src/lib/email/resendClient";
import { ANALYTICS_EVENTS } from "../../src/lib/analytics-events";
import { captureServerEvent } from "../../src/lib/posthog/server";
import { getAppOrigin } from "../../src/lib/appUrl";
import { eligibleTemplatesForCandidate } from "../../src/lib/lifecycleMail/segments";
import { renderLifecycleMail } from "../../src/lib/lifecycleMail/templates";
import { signLifecycleUnsubscribeToken } from "../../src/lib/lifecycleMail/unsubscribeToken";
import type { LifecycleCandidate } from "../../src/lib/lifecycleMail/types";

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const ids = process.argv
  .slice(2)
  .filter((a) => a !== "--apply" && a !== "--force");

function unsubscribeUrlFor(userId: string): string {
  const token = signLifecycleUnsubscribeToken(userId);
  const origin = getAppOrigin();
  if (!token) return `${origin}/instellingen`;
  return `${origin}/api/lifecycle/unsubscribe?token=${encodeURIComponent(token)}`;
}

async function main() {
  if (ids.length === 0) {
    console.error(
      "Usage: send-checkout-resume-oneshot.ts [--apply] [--force] <userId>..."
    );
    process.exit(1);
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  if (!supabaseUrl) throw new Error("SUPABASE_URL ontbreekt");
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt");

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws as unknown as typeof WebSocket },
  });

  for (const userId of ids) {
    const { data, error } = await supabase
      .from("lifecycle_candidates_v1")
      .select(
        "user_id, email, preferred_name, created_at, signup_source, subscription_status, subscription_current_period_end, last_dagstart_date, unsubscribe_lifecycle, is_test, app_trial_override_until, checkout_started_at, checkin_count, last_checkin_date"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      console.log({
        userId,
        status: "skipped",
        note: error?.message ?? "geen candidate",
      });
      continue;
    }

    const candidate = data as LifecycleCandidate;
    const status = (candidate.subscription_status ?? "").toLowerCase();
    if (status === "trialing" || status === "active") {
      console.log({
        userId,
        email: candidate.email,
        status: "skipped",
        note: "al trial/paid",
      });
      continue;
    }
    if ((candidate.checkin_count ?? 0) < 1 && !FORCE) {
      console.log({
        userId,
        email: candidate.email,
        status: "skipped",
        note: "geen checkin",
      });
      continue;
    }
    if (!candidate.checkout_started_at && !FORCE) {
      console.log({
        userId,
        email: candidate.email,
        status: "skipped",
        note: "geen checkout_started_at",
      });
      continue;
    }

    const eligible = eligibleTemplatesForCandidate(candidate);
    if (!FORCE && !eligible.includes("s0_checkout_resume")) {
      console.log({
        userId,
        email: candidate.email,
        status: "skipped",
        note: "niet eligible voor s0_checkout_resume",
        eligible,
      });
      continue;
    }

    const mail = renderLifecycleMail(
      "s0_checkout_resume",
      candidate,
      unsubscribeUrlFor(candidate.user_id)
    );

    const { data: existing } = await supabase
      .from("lifecycle_email_log")
      .select("id")
      .eq("user_id", userId)
      .eq("template_id", "s0_checkout_resume")
      .eq("cohort_key", mail.cohortKey)
      .maybeSingle();

    if (existing) {
      console.log({
        userId,
        email: candidate.email,
        status: "already_sent",
        cohortKey: mail.cohortKey,
      });
      continue;
    }

    if (!APPLY) {
      console.log({
        userId,
        email: candidate.email,
        status: "dry_run",
        force: FORCE,
        subject: mail.subject,
        ctaPath: mail.ctaPath,
        cohortKey: mail.cohortKey,
      });
      continue;
    }

    const result = await sendResendEmail({
      to: candidate.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: process.env.LIFECYCLE_REPLY_TO?.trim() || undefined,
      tags: [
        { name: "lifecycle", value: "s0_checkout_resume" },
        { name: "wave", value: FORCE ? "manual_force" : "manual" },
      ],
    });

    if (!result.ok) {
      console.log({
        userId,
        email: candidate.email,
        status: "failed",
        error: result.error,
      });
      continue;
    }
    if (result.skipped) {
      console.log({
        userId,
        email: candidate.email,
        status: "skipped",
        note: "RESEND_API_KEY missing",
      });
      continue;
    }

    await supabase.from("lifecycle_email_log").insert({
      user_id: userId,
      template_id: "s0_checkout_resume",
      cohort_key: mail.cohortKey,
    });

    try {
      await captureServerEvent(userId, ANALYTICS_EVENTS.lifecycle_email_sent, {
        template_id: "s0_checkout_resume",
        cohort_key: mail.cohortKey,
        wave: FORCE ? "manual_force" : "manual",
        channel: "server",
      });
    } catch {
      /* best-effort */
    }

    console.log({
      userId,
      email: candidate.email,
      status: "sent",
      subject: mail.subject,
      ctaPath: mail.ctaPath,
      resendId: result.id,
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
