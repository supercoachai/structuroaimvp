/**
 * Allowlist voor cookieless client→server funnel-backup.
 * Alleen eventnamen hier mogen via /api/analytics/client-funnel.
 */
export const CLIENT_FUNNEL_EVENTS = [
  // onboarding / activatie (fijnmazig)
  "onboarding_step",
  "onboarding_energy_chosen",
  "onboarding_cycle_choice",
  "account_save_shown",
  "account_save_clicked",
  "account_save_oauth_started",
  "account_save_returned",
  "name_step_shown",
  "name_step_completed",
  "dagstart_completed_anon",
  // retentie P0 (zonder settings-opt-in)
  "app_session_start",
  /** Home geladen; geen onboarding_step (voorkomt verwarring in PostHog). */
  "home_session_start",
  "day2_return",
  "daily_dagstart_complete",
  "shutdown_completed",
  "frisse_start_accepted",
  "pwa_install_shown",
  "pwa_install_prompt_available",
  "pwa_install_prompt_clicked",
  "pwa_install_prompt_result",
  "pwa_install_skipped",
  // paywall / trial CTA
  "trial_checkout_opened",
  "paywall_checkout_clicked",
  // auth drop-off
  "login_magic_link_sent",
  "login_magic_link_failed",
  "login_otp_verified",
  "magic_link_opened",
  "signup_email_confirmation_sent",
  // focus core loop
  "focus_session_started",
  "focus_session_completed",
  "focus_session_ended_early",
  "focus_session_abandoned",
  // web push soft-require (consent + herprompt)
  "push_opt_in_clicked",
  "push_opt_in_success",
  "push_opt_in_denied",
  "push_opt_in_skipped",
  "push_needs_homescreen",
  "push_soft_prompt_shown",
] as const;

export type ClientFunnelEventName = (typeof CLIENT_FUNNEL_EVENTS)[number];

export const CLIENT_FUNNEL_EVENT_SET = new Set<string>(CLIENT_FUNNEL_EVENTS);

export function isClientFunnelEvent(name: string): name is ClientFunnelEventName {
  return CLIENT_FUNNEL_EVENT_SET.has(name);
}
