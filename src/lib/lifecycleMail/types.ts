/** Template-IDs uit Obsidian blueprint (Lifecycle mail blueprint.md). */
export type LifecycleTemplateId =
  | "s0_welcome"
  | "s1_day2"
  | "s2_still"
  | "s3_value"
  | "s4_pre_paywall"
  | "s5_paywall"
  | "s6_winback";

export type LifecycleWave = "welcome" | "morning" | "evening";

export type LifecycleCandidate = {
  user_id: string;
  email: string;
  preferred_name: string | null;
  created_at: string;
  signup_source: string | null;
  subscription_status: string | null;
  last_dagstart_date: string | null;
  unsubscribe_lifecycle: boolean;
  is_test: boolean;
  app_trial_override_until: string | null;
  checkin_count: number;
  last_checkin_date: string | null;
};

export type LifecycleRenderedMail = {
  templateId: LifecycleTemplateId;
  cohortKey: string;
  subject: string;
  text: string;
  html: string;
  ctaPath: string;
};

export type LifecycleSendOutcome = {
  userId: string;
  email: string;
  templateId: LifecycleTemplateId;
  cohortKey: string;
  status: "sent" | "skipped" | "dry_run" | "failed" | "already_sent";
  error?: string;
};
