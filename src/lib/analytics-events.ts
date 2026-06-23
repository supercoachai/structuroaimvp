/** Canonieke PostHog eventnamen en property-contracten. */

export const ANALYTICS_EVENTS = {
  acquisition_landing_viewed: "acquisition_landing_viewed",
  acquisition_signup_started: "acquisition_signup_started",
  tiktok_landing_viewed: "tiktok_landing_viewed",
  tiktok_landing_cta_clicked: "tiktok_landing_cta_clicked",
  organic_landing_cta_clicked: "organic_landing_cta_clicked",
  tiktok_signup_started: "tiktok_signup_started",
  signup_completed: "signup_completed",
  checkout_started: "checkout_started",
  subscription_started: "subscription_started",
  onboarding_completed: "onboarding_completed",
  onboarding_started: "onboarding_started",
  dagstart_energy_chosen: "dagstart_energy_chosen",
  dagstart_path_chosen: "dagstart_path_chosen",
  dagstart_swipe_exhausted: "dagstart_swipe_exhausted",
  dagstart_empty_selection_hint_shown: "dagstart_empty_selection_hint_shown",
  dagstart_empty_selection_hint_dismissed: "dagstart_empty_selection_hint_dismissed",
  dagstart_tasks_selected: "dagstart_tasks_selected",
  dagstart_completed: "dagstart_completed",
  new_task_flow_completed: "new_task_flow_completed",
  cta_clicked: "cta_clicked",
  shutdown_prompt_shown: "shutdown_prompt_shown",
  shutdown_prompt_clicked: "shutdown_prompt_clicked",
  microsteps_suggest_shown: "microsteps_suggest_shown",
  microsteps_suggest_accepted: "microsteps_suggest_accepted",
  paywall_checkout_clicked: "paywall_checkout_clicked",
  trial_expired_view: "trial_expired_view",
  password_reset_requested: "password_reset_requested",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type DagstartCompletedProps = {
  energy_level: "low" | "medium" | "high";
  tasks_selected_count: number;
  has_cycle_phase: boolean;
  source: "app" | "dagstart_flow" | "onboarding";
};

export type SignupCompletedProps = {
  signup_source: string;
  utm_campaign?: string | null;
  channel?: "server" | "client";
};

export type CtaClickedProps = {
  cta_id: string;
  page_path?: string;
};