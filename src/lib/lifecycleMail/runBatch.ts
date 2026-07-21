import { getAppOrigin } from "@/lib/appUrl";
import { sendResendEmail } from "@/lib/email/resendClient";
import { isProtectedTestAccount } from "@/lib/protectedTestAccount";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { captureServerEvent } from "@/lib/posthog/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

import {
  lifecycleMailSendsEnabled,
  lifecycleMailTestAllowlist,
  resolveLifecycleMailAudience,
  type LifecycleMailAudience,
} from "./audience";
import {
  eligibleTemplatesForCandidate,
  templatesForWave,
  templatesForWaveP0,
} from "./segments";
import { renderLifecycleMail } from "./templates";
import { signLifecycleUnsubscribeToken } from "./unsubscribeToken";
import type {
  LifecycleCandidate,
  LifecycleSendOutcome,
  LifecycleTemplateId,
  LifecycleWave,
} from "./types";

export type RunLifecycleBatchOptions = {
  wave: LifecycleWave;
  /** Default true: alleen S0/S4/S5. false = ook S1/S2/S3/S6. */
  p0Only?: boolean;
  dryRun?: boolean;
  limit?: number;
  now?: Date;
};

function unsubscribeUrlFor(userId: string): string {
  const token = signLifecycleUnsubscribeToken(userId);
  const origin = getAppOrigin();
  if (!token) return `${origin}/instellingen`;
  return `${origin}/api/lifecycle/unsubscribe?token=${encodeURIComponent(token)}`;
}

function isTestAudienceCandidate(c: LifecycleCandidate): boolean {
  if (c.is_test) return true;
  if (isProtectedTestAccount(c.email)) return true;
  const allow = lifecycleMailTestAllowlist();
  return allow.has(c.email.trim().toLowerCase());
}

function filterByAudience(
  candidates: LifecycleCandidate[],
  audience: LifecycleMailAudience
): LifecycleCandidate[] {
  if (audience === "off") return [];
  if (audience === "test") {
    return candidates.filter(isTestAudienceCandidate);
  }
  // all: echte gebruikers, geen testaccounts
  return candidates.filter(
    (c) => !c.is_test && !isProtectedTestAccount(c.email)
  );
}

async function loadCandidates(): Promise<LifecycleCandidate[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) throw new Error("Supabase service role niet geconfigureerd");

  const { data, error } = await supabase
    .from("lifecycle_candidates_v1")
    .select(
      "user_id, email, preferred_name, created_at, signup_source, subscription_status, last_dagstart_date, unsubscribe_lifecycle, is_test, app_trial_override_until, checkin_count, last_checkin_date"
    )
    .limit(2000);

  if (error) {
    throw new Error(`lifecycle_candidates_v1: ${error.message}`);
  }

  return (data ?? []) as LifecycleCandidate[];
}

async function alreadySent(
  userId: string,
  templateId: LifecycleTemplateId,
  cohortKey: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return true;
  const { data } = await supabase
    .from("lifecycle_email_log")
    .select("id")
    .eq("user_id", userId)
    .eq("template_id", templateId)
    .eq("cohort_key", cohortKey)
    .maybeSingle();
  return Boolean(data);
}

async function markSent(
  userId: string,
  templateId: LifecycleTemplateId,
  cohortKey: string
): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  const { error } = await supabase.from("lifecycle_email_log").insert({
    user_id: userId,
    template_id: templateId,
    cohort_key: cohortKey,
  });
  if (error && !error.message.includes("duplicate")) {
    console.error("[lifecycle-mail] log insert failed", error.message);
  }
}

export async function runLifecycleBatch(
  opts: RunLifecycleBatchOptions
): Promise<{
  wave: LifecycleWave;
  dryRun: boolean;
  audience: LifecycleMailAudience;
  outcomes: LifecycleSendOutcome[];
  sent: number;
  skipped: number;
  failed: number;
  note?: string;
}> {
  const now = opts.now ?? new Date();
  const audience = resolveLifecycleMailAudience();
  const enabled = lifecycleMailSendsEnabled();
  // Zonder enable: altijd dry-run. Audience=off: helemaal niets.
  const dryRun = Boolean(opts.dryRun) || !enabled;
  const p0Only = opts.p0Only !== false;
  const limit = opts.limit ?? 200;
  const allowed = new Set(
    p0Only ? templatesForWaveP0(opts.wave) : templatesForWave(opts.wave)
  );

  if (audience === "off") {
    return {
      wave: opts.wave,
      dryRun: true,
      audience,
      outcomes: [],
      sent: 0,
      skipped: 0,
      failed: 0,
      note: "LIFECYCLE_MAIL_AUDIENCE=off (default). V1-gebruikers krijgen niets. Zet test of later all voor bewuste launch.",
    };
  }

  // Live naar alle echte users vereist dubbele opt-in.
  if (audience === "all" && enabled && !opts.dryRun) {
    if (process.env.LIFECYCLE_MAIL_ALLOW_V1 !== "true") {
      return {
        wave: opts.wave,
        dryRun: true,
        audience,
        outcomes: [],
        sent: 0,
        skipped: 0,
        failed: 0,
        note: "audience=all geblokkeerd zonder LIFECYCLE_MAIL_ALLOW_V1=true. V1 blijft onaangeraakt.",
      };
    }
  }

  const candidates = filterByAudience(await loadCandidates(), audience);
  const outcomes: LifecycleSendOutcome[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const c of candidates) {
    if (outcomes.length >= limit * 3) break;

    const eligible = eligibleTemplatesForCandidate(c, now).filter((t) =>
      allowed.has(t)
    );
    for (const templateId of eligible) {
      if (sent + skipped + failed >= limit && !dryRun) break;

      const mail = renderLifecycleMail(
        templateId,
        c,
        unsubscribeUrlFor(c.user_id),
        now
      );

      if (await alreadySent(c.user_id, templateId, mail.cohortKey)) {
        outcomes.push({
          userId: c.user_id,
          email: c.email,
          templateId,
          cohortKey: mail.cohortKey,
          status: "already_sent",
        });
        skipped += 1;
        continue;
      }

      if (dryRun) {
        outcomes.push({
          userId: c.user_id,
          email: c.email,
          templateId,
          cohortKey: mail.cohortKey,
          status: "dry_run",
        });
        continue;
      }

      const result = await sendResendEmail({
        to: c.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        replyTo: process.env.LIFECYCLE_REPLY_TO?.trim() || undefined,
        tags: [
          { name: "lifecycle", value: templateId },
          { name: "wave", value: opts.wave },
          { name: "audience", value: audience },
        ],
      });

      if (!result.ok) {
        outcomes.push({
          userId: c.user_id,
          email: c.email,
          templateId,
          cohortKey: mail.cohortKey,
          status: "failed",
          error: result.error,
        });
        failed += 1;
        continue;
      }

      if (result.skipped) {
        outcomes.push({
          userId: c.user_id,
          email: c.email,
          templateId,
          cohortKey: mail.cohortKey,
          status: "skipped",
          error: "RESEND_API_KEY missing",
        });
        skipped += 1;
        continue;
      }

      await markSent(c.user_id, templateId, mail.cohortKey);
      try {
        await captureServerEvent(c.user_id, ANALYTICS_EVENTS.lifecycle_email_sent, {
          template_id: templateId,
          cohort_key: mail.cohortKey,
          wave: opts.wave,
          audience,
          channel: "server",
        });
      } catch {
        /* best-effort */
      }

      outcomes.push({
        userId: c.user_id,
        email: c.email,
        templateId,
        cohortKey: mail.cohortKey,
        status: "sent",
      });
      sent += 1;
    }
  }

  return { wave: opts.wave, dryRun, audience, outcomes, sent, skipped, failed };
}
