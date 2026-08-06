/**
 * Soft winback one-shot: trial_expired sinds 2026-06-01, gesegmenteerd op checkins.
 *
 * Default = dry-run (print recipients + template, geen send).
 * Optioneel: --apply (dubbel ge-gated).
 *
 * Usage:
 *   npm run lifecycle:winback-dry-run
 *   npx tsx --env-file=.env.local scripts/lifecycle/winback-oneshot.ts --apply
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import { isProtectedTestAccount } from "../../src/lib/protectedTestAccount";
import { lifecycleMailSendsEnabled } from "../../src/lib/lifecycleMail/audience";
import { renderLifecycleMail } from "../../src/lib/lifecycleMail/templates";
import {
  pickWinbackOneshot,
  type WinbackSegment,
} from "../../src/lib/lifecycleMail/winbackOneshot";
import type {
  LifecycleCandidate,
  LifecycleTemplateId,
} from "../../src/lib/lifecycleMail/types";

const APPLY = process.argv.includes("--apply");

type Row = {
  user_id: string;
  email: string;
  preferred_name: string | null;
  created_at: string;
  signup_source: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  last_dagstart_date: string | null;
  unsubscribe_lifecycle: boolean;
  is_test: boolean;
  app_trial_override_until: string | null;
  checkin_count: number;
  last_checkin_date: string | null;
};

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} ontbreekt`);
  return v;
}

function toCandidate(row: Row): LifecycleCandidate {
  return {
    user_id: row.user_id,
    email: row.email,
    preferred_name: row.preferred_name,
    created_at: row.created_at,
    signup_source: row.signup_source,
    subscription_status: row.subscription_status,
    subscription_current_period_end: row.subscription_current_period_end,
    last_dagstart_date: row.last_dagstart_date,
    unsubscribe_lifecycle: Boolean(row.unsubscribe_lifecycle),
    is_test: Boolean(row.is_test),
    app_trial_override_until: row.app_trial_override_until,
    checkout_started_at: null,
    checkin_count: Number(row.checkin_count ?? 0),
    last_checkin_date: row.last_checkin_date,
  };
}

async function alreadySent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  templateId: LifecycleTemplateId,
  cohortKey: string
): Promise<boolean> {
  const { data } = await supabase
    .from("lifecycle_email_log")
    .select("id")
    .eq("user_id", userId)
    .eq("template_id", templateId)
    .eq("cohort_key", cohortKey)
    .maybeSingle();
  return Boolean(data);
}

async function main() {
  console.log(`[winback] start mode=${APPLY ? "APPLY" : "dry-run"}`);

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws as unknown as typeof WebSocket },
  });

  if (APPLY) {
    if (!lifecycleMailSendsEnabled()) {
      throw new Error("--apply geblokkeerd: zet LIFECYCLE_MAIL_ENABLED=true");
    }
    if (process.env.LIFECYCLE_WINBACK_ONESHOT_CONFIRM !== "YES") {
      throw new Error(
        "--apply geblokkeerd: zet LIFECYCLE_WINBACK_ONESHOT_CONFIRM=YES"
      );
    }
  }

  const { data, error } = await supabase
    .from("lifecycle_candidates_v1")
    .select(
      "user_id, email, preferred_name, created_at, signup_source, subscription_status, subscription_current_period_end, last_dagstart_date, unsubscribe_lifecycle, is_test, app_trial_override_until, checkin_count, last_checkin_date"
    )
    .eq("subscription_status", "trial_expired")
    .gte("created_at", "2026-05-31T22:00:00.000Z")
    .limit(2000);

  if (error) throw new Error(`lifecycle_candidates_v1: ${error.message}`);
  console.log(`[winback] candidates fetched=${(data ?? []).length}`);

  const counts: Record<WinbackSegment, number> = {
    never_started: 0,
    warm: 0,
    engaged: 0,
  };
  const skippedAlready: string[] = [];
  const recipients: Array<{
    email: string;
    userId: string;
    segment: WinbackSegment;
    templateId: LifecycleTemplateId;
    checkins: number;
    subject: string;
    cohortKey: string;
  }> = [];

  for (const raw of (data ?? []) as Row[]) {
    const c = toCandidate(raw);
    if (isProtectedTestAccount(c.email)) continue;
    const pick = pickWinbackOneshot(c, {
      excludeEmails: process.env.NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL
        ? [process.env.NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL]
        : [],
    });
    if (!pick) continue;

    const mail = renderLifecycleMail(
      pick.templateId,
      c,
      "https://www.structuro.ai/api/lifecycle/unsubscribe?token=dry-run"
    );

    if (await alreadySent(supabase, c.user_id, pick.templateId, mail.cohortKey)) {
      skippedAlready.push(`${c.email} (${pick.templateId})`);
      continue;
    }

    counts[pick.segment] += 1;
    recipients.push({
      email: c.email,
      userId: c.user_id,
      segment: pick.segment,
      templateId: pick.templateId,
      checkins: pick.checkinCount,
      subject: mail.subject,
      cohortKey: mail.cohortKey,
    });
  }

  console.log(
    `[winback] mode=${APPLY ? "APPLY" : "dry-run"} total=${recipients.length}`
  );
  console.log(
    `[winback] segments: never_started(0)=${counts.never_started} warm(1)=${counts.warm} engaged(≥2)=${counts.engaged}`
  );
  if (skippedAlready.length) {
    console.log(`[winback] already_sent skipped=${skippedAlready.length}`);
  }
  console.log("");
  for (const r of recipients) {
    console.log(
      `${r.segment.padEnd(14)} checkins=${String(r.checkins).padStart(2)}  ${r.templateId.padEnd(26)}  ${r.email}  | ${r.subject}`
    );
  }

  if (!APPLY) {
    console.log(
      "\n[winback] dry-run klaar. Versturen na OK: LIFECYCLE_MAIL_ENABLED=true LIFECYCLE_WINBACK_ONESHOT_CONFIRM=YES npm run lifecycle:winback-dry-run -- --apply"
    );
    return;
  }

  // Apply path: lazy-load send deps so dry-run stays light.
  const { getAppOrigin } = await import("../../src/lib/appUrl");
  const { sendResendEmail } = await import("../../src/lib/email/resendClient");
  const { ANALYTICS_EVENTS } = await import("../../src/lib/analytics-events");
  const { captureServerEvent } = await import("../../src/lib/posthog/server");
  const { signLifecycleUnsubscribeToken } = await import(
    "../../src/lib/lifecycleMail/unsubscribeToken"
  );

  function unsubscribeUrlFor(userId: string): string {
    const token = signLifecycleUnsubscribeToken(userId);
    const origin = getAppOrigin();
    if (!token) return `${origin}/instellingen`;
    return `${origin}/api/lifecycle/unsubscribe?token=${encodeURIComponent(token)}`;
  }

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const c = toCandidate(
      ((data ?? []) as Row[]).find((row) => row.user_id === r.userId)!
    );
    const mail = renderLifecycleMail(
      r.templateId,
      c,
      unsubscribeUrlFor(c.user_id)
    );
    const result = await sendResendEmail({
      to: c.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: process.env.LIFECYCLE_REPLY_TO?.trim() || "info@structuro.eu",
      tags: [
        { name: "lifecycle", value: r.templateId },
        { name: "wave", value: "winback_oneshot" },
        { name: "audience", value: "oneshot" },
      ],
    });
    if (!result.ok || result.skipped) {
      failed += 1;
      console.error(
        `[winback] FAIL ${c.email}: ${result.ok ? "RESEND_API_KEY missing" : result.error}`
      );
      continue;
    }
    const { error: logErr } = await supabase.from("lifecycle_email_log").insert({
      user_id: c.user_id,
      template_id: r.templateId,
      cohort_key: mail.cohortKey,
    });
    if (logErr && !logErr.message.includes("duplicate")) {
      console.error("[winback] log insert failed", logErr.message);
    }
    try {
      await captureServerEvent(c.user_id, ANALYTICS_EVENTS.lifecycle_email_sent, {
        template_id: r.templateId,
        cohort_key: mail.cohortKey,
        wave: "winback_oneshot",
        audience: "oneshot",
        segment: r.segment,
        channel: "server",
      });
    } catch {
      /* best-effort */
    }
    sent += 1;
    console.log(`[winback] SENT ${c.email} → ${r.templateId}`);
  }
  console.log(`[winback] apply done sent=${sent} failed=${failed}`);
}

main().catch((err) => {
  console.error("[winback]", err instanceof Error ? err.message : err);
  process.exit(1);
});
