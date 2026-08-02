/** Template-IDs uit Obsidian blueprint (Lifecycle mail blueprint.md). */
export type LifecycleTemplateId =
  | "s0_hello"
  | "s0_welcome"
  /** Checkout abandon: T+2–4u, kaart-angst wegnemen. */
  | "s0_checkout_resume"
  /** Checkout abandon: T+48–72u, zachte hulp. */
  | "s0_checkout_help"
  | "s1_day2"
  | "s2_still"
  | "s3_value"
  | "s4_pre_paywall"
  | "s5_paywall"
  | "s6_winback"
  /** One-shot soft: expired, 0 checkins (“je maakte ooit een account”). */
  | "s_winback_never_started"
  /** One-shot WARM: expired, precies 1 checkin. */
  | "s_winback_warm";

export type LifecycleWave = "welcome" | "morning" | "evening";

export type LifecycleCandidate = {
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
  /** Eerste keer card-/abonnement-stap bereikt (null = nooit). */
  checkout_started_at: string | null;
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
